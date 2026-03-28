import { LlmError } from "@workspace/core/domain/errors";
import { ClarifyingQuestionsExtraction } from "@workspace/core/domain/models/clarifying-question";
import {
  JdExtraction,
  KeywordsExtraction,
} from "@workspace/core/domain/models/jd-extraction";
import { StructuredJd } from "@workspace/core/domain/models/job-description";
import { ResumeExtraction } from "@workspace/core/domain/models/resume-extraction";
import { LlmPort } from "@workspace/core/ports/llm-port";
import {
  clarifyingQuestionsPrompt,
  structureJdPrompt,
} from "@workspace/core/prompts/jd-prompts";
import { extractKeywordsPrompt } from "@workspace/core/prompts/keyword-prompts";
import {
  structureResumePdfPrompt,
  structureResumePrompt,
} from "@workspace/core/prompts/resume-prompts";
import { generateText, Output, streamText } from "ai";
import { Effect, Layer, Stream } from "effect";
import { GoogleAiClient } from "../clients/google-ai-client";
import { AiConfig } from "../config/ai-config";
import { toAiSchema } from "./effect-schema-bridge";

// ---------------------------------------------------------------------------
// Effect Schema → AI SDK bridged schemas
// ---------------------------------------------------------------------------

const jdExtractionSchema = toAiSchema(JdExtraction);
const keywordsSchema = toAiSchema(KeywordsExtraction);
const resumeExtractionSchema = toAiSchema(ResumeExtraction);
const clarifyingQuestionsSchema = toAiSchema(ClarifyingQuestionsExtraction);

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const LlmAdapterGeminiLayer = Layer.effect(
  LlmPort,
  Effect.gen(function* () {
    const ai = yield* GoogleAiClient;
    const config = yield* AiConfig;

    return LlmPort.of({
      structureJd: (params) =>
        ai
          .use((google) =>
            generateText({
              model: google(config.languageModel),
              output: Output.object({ schema: jdExtractionSchema }),
              prompt: structureJdPrompt({ raw: params.raw }),
            })
          )
          .pipe(
            Effect.map(({ output }) =>
              StructuredJd.make({
                ...output,
                id: params.id,
                organizationId: params.organizationId,
                rawText: params.raw,
                status: "draft",
                createdAt: new Date().toISOString(),
              })
            ),
            Effect.mapError(
              (cause) =>
                new LlmError({
                  message: "Failed to structure job description",
                  cause,
                })
            ),
            Effect.withSpan("llm.structureJd")
          ),

      extractKeywords: (text) =>
        ai
          .use((google) =>
            generateText({
              model: google(config.languageModel),
              output: Output.object({ schema: keywordsSchema }),
              prompt: extractKeywordsPrompt({ text }),
            })
          )
          .pipe(
            Effect.map(({ output }) => output.keywords),
            Effect.mapError(
              (cause) =>
                new LlmError({ message: "Failed to extract keywords", cause })
            ),
            Effect.withSpan("llm.extractKeywords")
          ),

      generateClarifyingQuestions: (raw) =>
        ai
          .use((google) =>
            generateText({
              model: google(config.languageModel),
              output: Output.object({
                schema: clarifyingQuestionsSchema,
              }),
              prompt: clarifyingQuestionsPrompt({ raw }),
            })
          )
          .pipe(
            Effect.map(({ output }) => output.questions),
            Effect.mapError(
              (cause) =>
                new LlmError({
                  message: "Failed to generate clarifying questions",
                  cause,
                })
            ),
            Effect.withSpan("llm.generateClarifyingQuestions")
          ),

      structureResume: (text) =>
        ai
          .use((google) =>
            generateText({
              model: google(config.languageModel),
              output: Output.object({ schema: resumeExtractionSchema }),
              prompt: structureResumePrompt({ text }),
            })
          )
          .pipe(
            Effect.map(({ output }) => ResumeExtraction.make(output)),
            Effect.mapError(
              (cause) =>
                new LlmError({
                  message: "Failed to structure resume",
                  cause,
                })
            ),
            Effect.withSpan("llm.structureResume")
          ),

      structureResumePdf: (pdf) =>
        ai
          .use((google) =>
            generateText({
              model: google(config.languageModel),
              output: Output.object({ schema: resumeExtractionSchema }),
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: structureResumePdfPrompt },
                    {
                      type: "file",
                      mediaType: "application/pdf",
                      data: pdf,
                    },
                  ],
                },
              ],
            })
          )
          .pipe(
            Effect.map(({ output }) => ResumeExtraction.make(output)),
            Effect.mapError(
              (cause) =>
                new LlmError({
                  message: "Failed to structure resume PDF",
                  cause,
                })
            ),
            Effect.withSpan("llm.structureResumePdf")
          ),

      // -----------------------------------------------------------------------
      // Streaming variants
      // -----------------------------------------------------------------------

      streamStructureJd: (params) =>
        Stream.unwrap(
          Effect.try({
            try: () =>
              streamText({
                model: ai.google(config.languageModel),
                output: Output.object({ schema: jdExtractionSchema }),
                prompt: structureJdPrompt({ raw: params.raw }),
              }),
            catch: (cause) =>
              new LlmError({ message: "Failed to start JD stream", cause }),
          }).pipe(
            Effect.map((result) =>
              Stream.fromAsyncIterable(
                result.partialOutputStream,
                (e) => new LlmError({ message: "JD stream failed", cause: e })
              )
            )
          )
        ),

      streamStructureResume: (text) =>
        Stream.unwrap(
          Effect.try({
            try: () =>
              streamText({
                model: ai.google(config.languageModel),
                output: Output.object({ schema: resumeExtractionSchema }),
                prompt: structureResumePrompt({ text }),
              }),
            catch: (cause) =>
              new LlmError({
                message: "Failed to start resume stream",
                cause,
              }),
          }).pipe(
            Effect.map((result) =>
              Stream.fromAsyncIterable(
                result.partialOutputStream,
                (e) =>
                  new LlmError({
                    message: "Resume stream failed",
                    cause: e,
                  })
              )
            )
          )
        ),

      streamStructureResumePdf: (pdf) =>
        Stream.unwrap(
          Effect.try({
            try: () =>
              streamText({
                model: ai.google(config.languageModel),
                output: Output.object({ schema: resumeExtractionSchema }),
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: structureResumePdfPrompt },
                      {
                        type: "file",
                        mediaType: "application/pdf",
                        data: pdf,
                      },
                    ],
                  },
                ],
              }),
            catch: (cause) =>
              new LlmError({
                message: "Failed to start resume PDF stream",
                cause,
              }),
          }).pipe(
            Effect.map((result) =>
              Stream.fromAsyncIterable(
                result.partialOutputStream,
                (e) =>
                  new LlmError({
                    message: "Resume PDF stream failed",
                    cause: e,
                  })
              )
            )
          )
        ),

      streamClarifyingQuestions: (raw) =>
        Stream.unwrap(
          Effect.try({
            try: () =>
              streamText({
                model: ai.google(config.languageModel),
                output: Output.object({
                  schema: clarifyingQuestionsSchema,
                }),
                prompt: clarifyingQuestionsPrompt({ raw }),
              }),
            catch: (cause) =>
              new LlmError({
                message: "Failed to start clarifying questions stream",
                cause,
              }),
          }).pipe(
            Effect.map((result) =>
              Stream.fromAsyncIterable(
                result.partialOutputStream,
                (e) =>
                  new LlmError({
                    message: "Clarifying questions stream failed",
                    cause: e,
                  })
              )
            )
          )
        ),
    });
  })
);
