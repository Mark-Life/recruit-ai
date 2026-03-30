import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";
import {
  type IngestedPdfProfile,
  ProfileIngestionService,
} from "@workspace/core/services/profile-ingestion-service";
import { Effect, Layer } from "effect";
import { GeminiEmbeddingLive, GeminiLlmLive } from "../src/layers";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PDF_PATH = resolve(
  import.meta.dirname,
  "../../../datasets/snehaanbhawal-resume/data/data/ENGINEERING/11890896.pdf"
);

const pdfBytes = new Uint8Array(readFileSync(PDF_PATH));

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
  "PDF Ingestion — extract structured profile from resume PDF",
  () => {
    it.effect(
      "extracts structured data, keywords, and embedding from an engineering resume PDF",
      () =>
        Effect.gen(function* () {
          const service = yield* ProfileIngestionService;
          const result: IngestedPdfProfile =
            yield* service.ingestFromPdf(pdfBytes);

          // Extraction: name and title should be present
          expect(result.extraction.name.length).toBeGreaterThan(0);
          expect(result.extraction.title.length).toBeGreaterThan(0);

          // Extraction: should have keywords
          expect(result.extraction.keywords.length).toBeGreaterThan(0);

          // Extraction: experience years should be a positive number
          expect(result.extraction.experienceYears).toBeGreaterThan(0);

          // Embedding: correct dimensions
          expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
          expect(typeof result.embedding[0]).toBe("number");
          expect(Number.isFinite(result.embedding[0])).toBe(true);

          console.log("\n--- PDF Ingestion Result ---");
          console.log("Name:", result.extraction.name);
          console.log("Title:", result.extraction.title);
          console.log("Keywords:", result.extraction.keywords.join(", "));
          console.log(
            "Experience:",
            result.extraction.experienceYears,
            "years"
          );
          console.log("Location:", result.extraction.location);
          console.log("Embedding dims:", result.embedding.length);
        }).pipe(Effect.provide(TestLayer)),
      { timeout: EVAL_TIMEOUT }
    );
  }
);
