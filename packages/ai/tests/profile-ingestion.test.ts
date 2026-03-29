import { describe, expect, it } from "@effect/vitest";
import { RecruiterId, TalentId } from "@workspace/core/domain/models/ids";
import { Talent } from "@workspace/core/domain/models/talent";
import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";
import {
  type EnrichedProfile,
  ProfileIngestionService,
} from "@workspace/core/services/profile-ingestion-service";
import { Effect, Layer } from "effect";
import { GeminiEmbeddingLive, GeminiLlmLive } from "../src/layers";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TALENT = Talent.make({
  id: TalentId.make("ingest-t-1"),
  name: "Alice Chen",
  title: "Senior Frontend Engineer",
  keywords: ["React", "TypeScript", "Next.js", "CSS", "HTML"],
  experienceYears: 6,
  location: "San Francisco",
  workModes: ["remote", "hybrid"],
  willingToRelocate: false,
  recruiterId: RecruiterId.make("ingest-rec-1"),
  status: "reviewing",
  createdAt: "2026-01-01T00:00:00.000Z",
});

// ---------------------------------------------------------------------------
// Test layer
// ---------------------------------------------------------------------------

const TestLayer = ProfileIngestionService.layer.pipe(
  Layer.provide(Layer.merge(GeminiLlmLive, GeminiEmbeddingLive))
);

// ---------------------------------------------------------------------------
// Tests — require GOOGLE_GENERATIVE_AI_API_KEY, skip otherwise
// ---------------------------------------------------------------------------

const EVAL_TIMEOUT = 120_000;

describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
  "Profile Ingestion — enrich talent with keywords + embedding",
  () => {
    it.effect(
      "extracts relevant keywords and generates embedding vector",
      () =>
        Effect.gen(function* () {
          const service = yield* ProfileIngestionService;
          const result: EnrichedProfile = yield* service.enrich(TALENT);

          // Returns the same talent
          expect(result.talent.id).toBe(TALENT.id);
          expect(result.talent.name).toBe(TALENT.name);

          // Embedding: numeric array with expected dimensions
          expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
          expect(typeof result.embedding[0]).toBe("number");
          expect(Number.isFinite(result.embedding[0])).toBe(true);

          console.log("\n--- Enriched Profile ---");
          console.log("Embedding dims:", result.embedding.length);
        }).pipe(Effect.provide(TestLayer)),
      { timeout: EVAL_TIMEOUT }
    );
  }
);
