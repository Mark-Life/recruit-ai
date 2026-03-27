import { LlmError } from "@workspace/core/domain/errors";
import { StructuredJd } from "@workspace/core/domain/models/job-description";
import { LlmPort } from "@workspace/core/ports/llm-port";
import { generateText, Output } from "ai";
import { Effect, Layer } from "effect";
import { z } from "zod";
import { GoogleAiClient } from "../clients/google-ai-client";
import { AiConfig } from "../config/ai-config";

// ---------------------------------------------------------------------------
// Zod schemas for LLM extraction
// ---------------------------------------------------------------------------

const LlmExtractedJdSchema = z.object({
  summary: z.string().describe("A 1-2 sentence summary of the job description"),
  roleTitle: z
    .string()
    .describe("The job title, e.g. 'Senior Frontend Engineer'"),
  skills: z
    .array(z.string())
    .describe(
      "Normalized technology/skill tags, e.g. ['React', 'TypeScript', 'Node.js']"
    ),
  keywords: z
    .array(z.string())
    .describe(
      "Additional relevant keywords for matching, e.g. ['frontend', 'SPA', 'UI']"
    ),
  seniority: z
    .enum(["junior", "mid", "senior", "lead", "principal"])
    .describe("Seniority level"),
  employmentType: z
    .enum(["full-time", "contract", "freelance"])
    .describe("Employment type"),
  workMode: z.enum(["office", "hybrid", "remote"]).describe("Work mode"),
  location: z
    .string()
    .describe(
      "Work location or 'Worldwide' for remote roles with no geographic constraint"
    ),
  willingToSponsorRelocation: z
    .boolean()
    .describe("Whether the company offers relocation sponsorship"),
  experienceYearsMin: z
    .number()
    .describe("Minimum years of experience required"),
  experienceYearsMax: z
    .number()
    .describe("Maximum years of experience expected"),
});

const KeywordsResultSchema = z.object({
  keywords: z
    .array(z.string())
    .describe(
      "Normalized technology and domain keywords extracted from the text"
    ),
});

const LlmExtractedResumeSchema = z.object({
  name: z.string().describe("The candidate's full name"),
  title: z
    .string()
    .describe(
      "Current or most recent job title, e.g. 'Senior Frontend Engineer'"
    ),
  skills: z
    .array(z.string())
    .describe(
      "Normalized technology/skill tags extracted from the resume, e.g. ['React', 'TypeScript', 'Node.js']"
    ),
  keywords: z
    .array(z.string())
    .describe(
      "Additional domain keywords for matching, e.g. ['frontend', 'SPA', 'microservices']"
    ),
  experienceYears: z
    .number()
    .describe("Total years of professional experience (integer)"),
  location: z
    .string()
    .describe("Current location or 'Unknown' if not mentioned"),
  workModes: z
    .array(z.enum(["office", "hybrid", "remote"]))
    .describe(
      "Work modes mentioned or implied. Default to ['office', 'hybrid', 'remote'] if not specified"
    ),
  willingToRelocate: z
    .boolean()
    .describe(
      "Whether the candidate indicates willingness to relocate. Default false if not mentioned"
    ),
});

const ClarifyingQuestionsResultSchema = z.object({
  questions: z.array(
    z.object({
      field: z.string().describe("Which StructuredJd field this targets"),
      question: z.string().describe("Human-readable clarifying question"),
      reason: z
        .string()
        .describe("Why this information is needed for matching"),
      options: z
        .array(z.string())
        .optional()
        .default([])
        .describe("Suggested answer options"),
    })
  ),
});

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
              output: Output.object({ schema: LlmExtractedJdSchema }),
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
              output: Output.object({ schema: KeywordsResultSchema }),
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
                schema: ClarifyingQuestionsResultSchema,
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
              output: Output.object({ schema: LlmExtractedResumeSchema }),
              prompt: buildResumePrompt(text),
            })
          )
          .pipe(
            Effect.map(({ output }) => output),
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
