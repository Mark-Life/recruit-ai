import { Context, Effect, Layer } from "effect";
import type {
  EmbeddingError,
  LlmError,
  TalentNotFoundError,
  VectorSearchError,
} from "../domain/errors";
import type { JobDescriptionId, OrganizationId } from "../domain/models/ids";
import type { Match } from "../domain/models/match";
import { scoreTalents } from "../domain/scoring";
import { EmbeddingPort } from "../ports/embedding-port";
import { LlmPort } from "../ports/llm-port";
import { RecruiterRepository } from "../ports/recruiter-repository";
import { TalentRepository } from "../ports/talent-repository";
import { VectorSearchPort } from "../ports/vector-search-port";

const VECTOR_SEARCH_TOP_K = 20;
const MAX_RESULTS = 10;
const FETCH_CONCURRENCY = 10;

type RankingError =
  | LlmError
  | EmbeddingError
  | VectorSearchError
  | TalentNotFoundError;

export class RankingService extends Context.Tag("@recruit/RankingService")<
  RankingService,
  {
    readonly rankTalents: (
      rawJd: string,
      organizationId: OrganizationId
    ) => Effect.Effect<readonly Match[], RankingError>;
  }
>() {
  static readonly layer = Layer.effect(
    RankingService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const embedding = yield* EmbeddingPort;
      const vectorSearch = yield* VectorSearchPort;
      const talents = yield* TalentRepository;
      const recruiters = yield* RecruiterRepository;

      return RankingService.of({
        rankTalents: (rawJd: string, organizationId: OrganizationId) =>
          Effect.gen(function* () {
            const id = crypto.randomUUID() as JobDescriptionId;
            const structured = yield* llm.structureJd({
              raw: rawJd,
              id,
              organizationId,
            });
            const vector = yield* embedding.embed(structured.summary);
            const candidates = yield* vectorSearch.search(
              vector,
              VECTOR_SEARCH_TOP_K
            );

            const fullTalents = yield* Effect.forEach(
              candidates,
              (c) => talents.findById(c.talentId),
              { concurrency: FETCH_CONCURRENCY }
            );

            const scored = scoreTalents(structured, fullTalents, candidates);
            const topTalents = scored.slice(0, MAX_RESULTS);

            yield* recruiters.findByTalentIds(
              topTalents.map((t) => t.talent.id)
            );

            return topTalents.map(
              (t) =>
                ({
                  id: `${structured.id}-${t.talent.id}`,
                  jobDescriptionId: structured.id,
                  talentId: t.talent.id,
                  recruiterId: t.talent.recruiterId,
                  totalScore: t.totalScore,
                  breakdown: t.breakdown,
                }) as unknown as Match
            );
          }),
      });
    })
  );
}
