import { describe, expect, it } from "@effect/vitest";
import {
  JobDescriptionId,
  OrganizationId,
} from "@workspace/core/domain/models/ids";
import { ResumeExtraction } from "@workspace/core/domain/models/resume-extraction";
import { LlmPort } from "@workspace/core/ports/llm-port";
import { Effect, Layer } from "effect";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_STRUCTURED_JD = {
  summary: "Looking for a senior React developer",
  roleTitle: "Senior Frontend Engineer",
  skills: ["React", "TypeScript"],
  keywords: ["frontend", "SPA"],
  seniority: "senior" as const,
  employmentType: "full-time" as const,
  workMode: "hybrid" as const,
  location: "Berlin",
  willingToSponsorRelocation: false,
  experienceYearsMin: 4,
  experienceYearsMax: 8,
};

const MOCK_KEYWORDS = ["React", "TypeScript", "frontend"];

const MOCK_QUESTIONS = [
  {
    field: "workMode",
    question: "Is this role office, hybrid, or remote?",
    reason: "Work mode is not specified in the JD",
    options: ["office", "hybrid", "remote"],
  },
];

// ---------------------------------------------------------------------------
// Test layer — stubs LlmPort directly
// ---------------------------------------------------------------------------

const TestLayer = Layer.succeed(LlmPort, {
  structureJd: (params: {
    readonly raw: string;
    readonly id: unknown;
    readonly organizationId: unknown;
  }) =>
    Effect.succeed({
      ...MOCK_STRUCTURED_JD,
      id: params.id,
      organizationId: params.organizationId,
      rawText: params.raw,
    } as any),
  extractKeywords: (_text: string) => Effect.succeed(MOCK_KEYWORDS),
  generateClarifyingQuestions: (_raw: string) =>
    Effect.succeed(MOCK_QUESTIONS as any),
  structureResume: (_text: string) =>
    Effect.succeed(
      ResumeExtraction.make({
        name: "Test User",
        title: "Engineer",
        skills: ["TypeScript"],
        keywords: ["engineering"],
        experienceYears: 5,
        location: "Unknown",
        workModes: ["remote"],
        willingToRelocate: false,
      })
    ),
  structureResumePdf: (_pdf: Uint8Array) =>
    Effect.succeed(
      ResumeExtraction.make({
        name: "Test User",
        title: "Engineer",
        skills: ["TypeScript"],
        keywords: ["engineering"],
        experienceYears: 5,
        location: "Unknown",
        workModes: ["remote"],
        willingToRelocate: false,
      })
    ),
});

// ---------------------------------------------------------------------------
// Tests — validate the LlmPort contract
// ---------------------------------------------------------------------------

describe("LlmAdapterGemini", () => {
  it.effect("structureJd extracts structured data from raw JD", () =>
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const result = yield* llm.structureJd({
        raw: "Looking for a senior React developer in Berlin",
        id: JobDescriptionId.make("jd-test"),
        organizationId: OrganizationId.make("org-test"),
      });

      expect(result.roleTitle).toBe("Senior Frontend Engineer");
      expect(result.skills).toEqual(["React", "TypeScript"]);
      expect(result.seniority).toBe("senior");
      expect(result.id).toBe(JobDescriptionId.make("jd-test"));
      expect(result.organizationId).toBe(OrganizationId.make("org-test"));
      expect(result.rawText).toBe(
        "Looking for a senior React developer in Berlin"
      );
    }).pipe(Effect.provide(TestLayer))
  );

  it.effect("extractKeywords returns keyword list", () =>
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const keywords = yield* llm.extractKeywords("React TypeScript frontend");

      expect(keywords).toEqual(["React", "TypeScript", "frontend"]);
    }).pipe(Effect.provide(TestLayer))
  );

  it.effect("generateClarifyingQuestions returns questions", () =>
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const questions = yield* llm.generateClarifyingQuestions(
        "Looking for a developer"
      );

      expect(questions).toHaveLength(1);
      expect(questions[0]?.field).toBe("workMode");
    }).pipe(Effect.provide(TestLayer))
  );
});
