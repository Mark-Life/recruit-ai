import { LlmError } from "@workspace/core/domain/errors";
import { ClarifyingQuestionsExtraction } from "@workspace/core/domain/models/clarifying-question";
import {
  JdExtraction,
  KeywordsExtraction,
} from "@workspace/core/domain/models/jd-extraction";
import { StructuredJd } from "@workspace/core/domain/models/job-description";
import { ResumeExtraction } from "@workspace/core/domain/models/resume-extraction";
import { LlmPort } from "@workspace/core/ports/llm-port";
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
// Prompt builders
// ---------------------------------------------------------------------------

function buildStructurePrompt(raw: string): string {
  return [
    "You are an expert recruiter assistant. Analyze the following job description and extract structured information.",
    "Normalize skill and technology names (e.g. 'React.js' and 'ReactJS' should both become 'React').",
    "If a field is not explicitly mentioned, make a reasonable inference based on context.",
    "For experience years, estimate a reasonable range if not explicitly stated.",
    "",
    "Job Description:",
    raw,
  ].join("\n");
}

function buildKeywordsPrompt(text: string): string {
  return [
    "Extract normalized technology and domain keywords from the following text.",
    "Normalize variations (e.g. 'React.js', 'ReactJS' → 'React').",
    "Include both specific technologies and broader domain terms.",
    "",
    "Text:",
    text,
  ].join("\n");
}

function buildResumePrompt(text: string): string {
  return [
    "You are an expert recruiter assistant. Analyze the following resume/CV and extract structured profile information.",
    "Normalize skill and technology names (e.g. 'React.js' and 'ReactJS' should both become 'React').",
    "For experience years, calculate total professional experience from the career history.",
    "For work modes, extract any mentioned preferences. If not mentioned, default to all three modes.",
    "For location, extract the candidate's current city/country. Use 'Unknown' if not mentioned.",
    "",
    "Resume:",
    text,
  ].join("\n");
}

function buildClarifyingPrompt(raw: string): string {
  return [
    "You are an expert recruiter assistant. Analyze the following job description and identify missing information that would improve talent matching.",
    "Only generate questions for information that is NOT already present or clearly implied in the JD.",
    "Focus on: work mode, location/geography, relocation, employment type, seniority, compensation, and timeline.",
    "",
    "Job Description:",
    raw,
  ].join("\n");
}

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
              prompt: buildStructurePrompt(params.raw),
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
              prompt: buildKeywordsPrompt(text),
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
              prompt: buildClarifyingPrompt(raw),
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
              prompt: buildResumePrompt(text),
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
