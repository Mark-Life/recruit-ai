import { describe, expect, it } from "@effect/vitest";
import {
  JobDescriptionId,
  OrganizationId,
} from "@workspace/core/domain/models/ids";
import { LlmPort } from "@workspace/core/ports/llm-port";
import { JdEnrichmentService } from "@workspace/core/services/jd-enrichment-service";
import { Effect, Layer } from "effect";
import { GeminiLlmLive } from "../src/layers";

// ---------------------------------------------------------------------------
// Fixtures — intentionally incomplete JD (no work mode, no location, vague seniority)
// ---------------------------------------------------------------------------

const INCOMPLETE_JD = [
  "We are looking for a React developer to join our team.",
  "The ideal candidate has experience with TypeScript and modern frontend frameworks.",
  "Responsibilities include building user interfaces and collaborating with designers.",
].join("\n");

// ---------------------------------------------------------------------------
// Test layer
// ---------------------------------------------------------------------------

const TestLayer = Layer.merge(
  GeminiLlmLive,
  JdEnrichmentService.layer.pipe(Layer.provide(GeminiLlmLive))
);

// ---------------------------------------------------------------------------
// Tests — require GOOGLE_GENERATIVE_AI_API_KEY, skip otherwise
// ---------------------------------------------------------------------------

const EVAL_TIMEOUT = 120_000;

describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
  "JD Refinement Pipeline",
  () => {
    it.effect(
      "generates clarifying questions for an incomplete JD",
      () =>
        Effect.gen(function* () {
          const llm = yield* LlmPort;

          const questions =
            yield* llm.generateClarifyingQuestions(INCOMPLETE_JD);

          console.log("\n--- Clarifying Questions ---");
          for (const q of questions) {
            console.log(`  [${q.field}] ${q.question}`);
            console.log(`    Reason: ${q.reason}`);
            if (q.options && q.options.length > 0) {
              console.log(`    Options: ${q.options.join(", ")}`);
            }
          }

          // Should generate at least 1 question
          expect(questions.length).toBeGreaterThanOrEqual(1);

          // Each question must have non-empty field, question, reason
          for (const q of questions) {
            expect(q.field).toBeTruthy();
            expect(q.question).toBeTruthy();
            expect(q.reason).toBeTruthy();
          }

          // Should ask about work mode or location (the most obviously missing fields)
          const fields = questions.map((q) => q.field.toLowerCase());
          const asksAboutWorkModeOrLocation = fields.some(
            (f) =>
              f.includes("work") ||
              f.includes("mode") ||
              f.includes("location") ||
              f.includes("remote") ||
              f.includes("office")
          );
          expect(asksAboutWorkModeOrLocation).toBe(true);
        }).pipe(Effect.provide(TestLayer)),
      { timeout: EVAL_TIMEOUT }
    );

    it.effect(
      "enriches incomplete JD with answers and produces correct StructuredJd",
      () =>
        Effect.gen(function* () {
          const enrichment = yield* JdEnrichmentService;

          // Step 1: Generate questions (verifies the service delegation works)
          const questions = yield* enrichment.generateQuestions(INCOMPLETE_JD);
          expect(questions.length).toBeGreaterThanOrEqual(1);

          // Step 2: Provide hardcoded answers for the fields we know are missing
          const answers = [
            { field: "workMode", answer: "hybrid" },
            { field: "location", answer: "Berlin, Germany" },
            { field: "seniority", answer: "senior" },
          ];

          // Step 3: Enrich and structure
          const structured = yield* enrichment.enrichAndStructure({
            rawJd: INCOMPLETE_JD,
            answers,
            id: JobDescriptionId.make("enrich-jd-1"),
            organizationId: OrganizationId.make("enrich-org-1"),
          });

          console.log("\n--- Enriched StructuredJd ---");
          console.log("Role:", structured.roleTitle);
          console.log("Work Mode:", structured.workMode);
          console.log("Location:", structured.location);
          console.log("Seniority:", structured.seniority);
          console.log("Skills:", structured.skills.join(", "));

          // The enriched JD should reflect the provided answers
          expect(structured.workMode).toBe("hybrid");
          expect(structured.location.toLowerCase()).toContain("berlin");
          expect(structured.seniority).toBe("senior");
        }).pipe(Effect.provide(TestLayer)),
      { timeout: EVAL_TIMEOUT }
    );
  }
);
