import { Context, Effect, Layer } from "effect";
import type {
  JobDescriptionNotFoundError,
  TalentNotFoundError,
  VectorSearchError,
} from "../domain/errors";
import type { JobDescriptionId, TalentId } from "../domain/models/ids";
import type { Match } from "../domain/models/match";
import { scoreJobs, scoreTalents } from "../domain/scoring";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import { RecruiterRepository } from "../ports/recruiter-repository";
import { TalentRepository } from "../ports/talent-repository";
import { VectorSearchPort } from "../ports/vector-search-port";

const VECTOR_SEARCH_TOP_K = 50;
const MAX_RESULTS = 10;

type RankingError =
  | VectorSearchError
  | TalentNotFoundError
  | JobDescriptionNotFoundError;

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
      const recruiters = yield* RecruiterRepository;

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

            const fullTalents = yield* talentRepo.findByIds(
              candidates.map((c) => c.id as TalentId)
            );

            const scored = scoreTalents(jd, fullTalents, candidates);
            const topTalents = scored.slice(0, MAX_RESULTS);

            yield* recruiters.findByTalentIds(
              topTalents.map((t) => t.talent.id)
            );

            return topTalents.map(
              (t) =>
                ({
                  id: `${jd.id}-${t.talent.id}`,
                  jobDescriptionId: jd.id,
                  talentId: t.talent.id,
                  recruiterId: t.talent.recruiterId,
                  totalScore: t.totalScore,
                  breakdown: t.breakdown,
                  talentName: t.talent.name,
                  jobTitle: jd.roleTitle,
                }) as unknown as Match
            );
          }),

        rankJobsByTalent: (talentId) =>
          Effect.gen(function* () {
            const talent = yield* talentRepo.findById(talentId);

            const candidates = yield* vectorSearch.searchJobsByTalentId(
              talentId,
              VECTOR_SEARCH_TOP_K
            );

            if (candidates.length === 0) {
              return [];
            }

            const fullJds = yield* jdRepo.findByIds(
              candidates.map((c) => c.id as JobDescriptionId)
            );

            const scored = scoreJobs(talent, fullJds, candidates);
            const topJobs = scored.slice(0, MAX_RESULTS);

            return topJobs.map(
              (s) =>
                ({
                  id: `${s.jd.id}-${talent.id}`,
                  jobDescriptionId: s.jd.id,
                  talentId: talent.id,
                  recruiterId: talent.recruiterId,
                  totalScore: s.totalScore,
                  breakdown: s.breakdown,
                  talentName: talent.name,
                  jobTitle: s.jd.roleTitle,
                }) as unknown as Match
            );
          }),
      });
    })
  );
}
