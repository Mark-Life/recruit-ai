import { Context, Effect, Layer } from "effect";
import type { EmbeddingError, LlmError } from "../domain/errors";
import type { ResumeExtraction } from "../domain/models/resume-extraction";
import type { Talent } from "../domain/models/talent";
import type { Vector } from "../domain/models/vector";
import { EmbeddingPort } from "../ports/embedding-port";
import { LlmPort } from "../ports/llm-port";

export interface EnrichedProfile {
  readonly embedding: Vector;
  readonly talent: Talent;
}

export interface IngestedPdfProfile {
  readonly embedding: Vector;
  readonly extraction: ResumeExtraction;
}

export class ProfileIngestionService extends Context.Tag(
  "@recruit/ProfileIngestionService"
)<
  ProfileIngestionService,
  {
    readonly enrich: (
      talent: Talent
    ) => Effect.Effect<EnrichedProfile, EmbeddingError>;
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

      const buildProfileText = (e: {
        title: string;
        keywords: readonly string[];
        experienceYears: number;
        location: string;
      }) =>
        [
          e.title,
          `Keywords: ${e.keywords.join(", ")}`,
          `Experience: ${e.experienceYears} years`,
          `Location: ${e.location}`,
        ].join(". ");

      return ProfileIngestionService.of({
        enrich: (talent) =>
          Effect.gen(function* () {
            const profileText = buildProfileText(talent);
            const vector = yield* embedding.embed(profileText);
            return { talent, embedding: vector };
          }),

        ingestFromPdf: (pdf) =>
          Effect.gen(function* () {
            const extraction = yield* llm.structureResumePdf(pdf);
            const profileText = buildProfileText(extraction);
            const vector = yield* embedding.embed(profileText);
            return { extraction, embedding: vector };
          }),
      });
    })
  );
}
