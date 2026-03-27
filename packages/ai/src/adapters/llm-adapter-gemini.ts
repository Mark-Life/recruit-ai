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
import { structureResumePrompt } from "@workspace/core/prompts/resume-prompts";
import { generateText, Output } from "ai";
import { Effect, Layer } from "effect";
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
    });
  })
);
