import { Context, Effect, Layer } from "effect";
import type {
  JobDescriptionNotFoundError,
  TalentNotFoundError,
  VectorNotFoundError,
  VectorSearchError,
} from "../domain/errors";
import type { JobDescriptionId, TalentId } from "../domain/models/ids";
import type { Match } from "../domain/models/match";
import { type ScoredPair, scoreAndRank } from "../domain/scoring";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import { TalentRepository } from "../ports/talent-repository";
import { VectorSearchPort } from "../ports/vector-search-port";

const VECTOR_SEARCH_TOP_K = 50;
const MAX_RESULTS = 10;

type RankingError =
  | VectorSearchError
  | VectorNotFoundError
  | TalentNotFoundError
  | JobDescriptionNotFoundError;

/** Project a scored pair into a Match */
const toMatch = (
  s: ScoredPair,
  talentName: string | undefined,
  jobTitle: string,
  recruiterId: string
) =>
  ({
    id: `${s.jobId}-${s.talentId}`,
    jobDescriptionId: s.jobId,
    talentId: s.talentId,
    recruiterId,
    totalScore: s.totalScore,
    breakdown: s.breakdown,
    talentName,
    jobTitle,
  }) as unknown as Match;

export class RankingService extends Context.Tag("@recruit/RankingService")<
  RankingService,
  {
    readonly rankTalentsByJob: (
      jobId: JobDescriptionId
    ) => Effect.Effect<readonly Match[], RankingError>;
    readonly rankJobsByTalent: (
      talentId: TalentId
    ) => Effect.Effect<readonly Match[], RankingError>;
  }
>() {
  static readonly layer = Layer.effect(
    RankingService,
    Effect.gen(function* () {
      const vectorSearch = yield* VectorSearchPort;
      const jdRepo = yield* JobDescriptionRepository;
      const talentRepo = yield* TalentRepository;

      return RankingService.of({
        rankTalentsByJob: (jobId) =>
          Effect.gen(function* () {
            const jd = yield* jdRepo.findById(jobId);

            const candidates = yield* vectorSearch.searchTalentsByJobId(
              jobId,
              VECTOR_SEARCH_TOP_K,
              {
                workModes: [jd.workMode],
                location: jd.workMode !== "remote" ? jd.location : undefined,
                willingToRelocate: jd.willingToSponsorRelocation || undefined,
              }
            );

            if (candidates.length === 0) {
              return [];
            }

            const similarityMap = new Map(
              candidates.map((c) => [c.id, c.similarity])
            );
            const talents = yield* talentRepo.findByIds(
              candidates.map((c) => c.id as TalentId)
            );

            const scored = scoreAndRank(
              talents.map((t) => ({
                talent: t,
                jd,
                semanticSimilarity: similarityMap.get(t.id) ?? 0,
              })),
              MAX_RESULTS
            );

            const talentMap = new Map(talents.map((t) => [t.id as string, t]));
            return scored.flatMap((s) => {
              const talent = talentMap.get(s.talentId);
              if (!talent) {
                return [];
              }
              return [
                toMatch(s, talent.name, jd.roleTitle, talent.recruiterId),
              ];
            });
          }),

        rankJobsByTalent: (talentId) =>
          Effect.gen(function* () {
            const talent = yield* talentRepo.findById(talentId);

            const allRemote = talent.workModes.every((m) => m === "remote");

            const candidates = yield* vectorSearch.searchJobsByTalentId(
              talentId,
              VECTOR_SEARCH_TOP_K,
              {
                workModes: [...talent.workModes],
                location: allRemote ? undefined : talent.location,
                willingToSponsorRelocation:
                  talent.willingToRelocate || undefined,
              }
            );

            if (candidates.length === 0) {
              return [];
            }

            const similarityMap = new Map(
              candidates.map((c) => [c.id, c.similarity])
            );
            const jds = yield* jdRepo.findByIds(
              candidates.map((c) => c.id as JobDescriptionId)
            );

            const scored = scoreAndRank(
              jds.map((jd) => ({
                talent,
                jd,
                semanticSimilarity: similarityMap.get(jd.id) ?? 0,
              })),
              MAX_RESULTS
            );

            const jdMap = new Map(jds.map((j) => [j.id as string, j]));
            return scored.flatMap((s) => {
              const jd = jdMap.get(s.jobId);
              if (!jd) {
                return [];
              }
              return [
                toMatch(s, talent.name, jd.roleTitle, talent.recruiterId),
              ];
            });
          }),
      });
    })
  );
}
