import { Context, Effect, Layer } from "effect";
import type { EmbeddingError, LlmError } from "../domain/errors";
import type { ResumeExtraction } from "../domain/models/resume-extraction";
import type { Talent } from "../domain/models/talent";
import type { Vector } from "../domain/models/vector";
import { EmbeddingPort } from "../ports/embedding-port";
import { LlmPort } from "../ports/llm-port";

export interface EnrichedProfile {
  readonly embedding: Vector;
  readonly keywords: readonly string[];
  readonly talent: Talent;
}

export interface IngestedPdfProfile {
  readonly embedding: Vector;
  readonly extraction: ResumeExtraction;
  readonly keywords: readonly string[];
}

const CONCURRENCY = 2;

export class ProfileIngestionService extends Context.Tag(
  "@recruit/ProfileIngestionService"
)<
  ProfileIngestionService,
  {
    readonly enrich: (
      talent: Talent
    ) => Effect.Effect<EnrichedProfile, LlmError | EmbeddingError>;
    readonly ingestFromPdf: (
      pdf: Uint8Array
    ) => Effect.Effect<IngestedPdfProfile, LlmError | EmbeddingError>;
  }
>() {
  static readonly layer = Layer.effect(
    ProfileIngestionService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const embedding = yield* EmbeddingPort;

      const buildProfileText = (e: ResumeExtraction) =>
        [
          e.title,
          `Skills: ${e.skills.join(", ")}`,
          `Experience: ${e.experienceYears} years`,
          `Location: ${e.location}`,
        ].join(". ");

      return ProfileIngestionService.of({
        enrich: (talent) =>
          Effect.gen(function* () {
            const profileText = buildProfileText(talent);

            const [keywords, vector] = yield* Effect.all(
              [
                llm.extractKeywords(profileText),
                embedding.embed(profileText),
              ] as const,
              { concurrency: CONCURRENCY }
            );

            return { talent, keywords, embedding: vector };
          }),

        ingestFromPdf: (pdf) =>
          Effect.gen(function* () {
            const extraction = yield* llm.structureResumePdf(pdf);
            const profileText = buildProfileText(extraction);

            const [keywords, vector] = yield* Effect.all(
              [
                llm.extractKeywords(profileText),
                embedding.embed(profileText),
              ] as const,
              { concurrency: CONCURRENCY }
            );

            return { extraction, keywords, embedding: vector };
          }),
      });
    })
  );
}
