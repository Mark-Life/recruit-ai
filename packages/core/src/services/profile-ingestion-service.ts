import { Context, Effect, Layer } from "effect";
import type { EmbeddingError, LlmError } from "../domain/errors";
import type { Talent } from "../domain/models/talent";
import type { Vector } from "../domain/models/vector";
import { EmbeddingPort } from "../ports/embedding-port";
import { LlmPort } from "../ports/llm-port";

export interface EnrichedProfile {
  readonly embedding: Vector;
  readonly keywords: readonly string[];
  readonly talent: Talent;
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
  }
>() {
  static readonly layer = Layer.effect(
    ProfileIngestionService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const embedding = yield* EmbeddingPort;

      return ProfileIngestionService.of({
        enrich: (talent) =>
          Effect.gen(function* () {
            const profileText = [
              talent.title,
              `Skills: ${talent.skills.join(", ")}`,
              `Experience: ${talent.experienceYears} years`,
              `Location: ${talent.location}`,
            ].join(". ");

            const [keywords, vector] = yield* Effect.all(
              [
                llm.extractKeywords(profileText),
                embedding.embed(profileText),
              ] as const,
              { concurrency: CONCURRENCY }
            );

            return { talent, keywords, embedding: vector };
          }),
      });
    })
  );
}
