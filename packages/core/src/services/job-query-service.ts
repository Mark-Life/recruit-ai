import { Context, Effect, Layer } from "effect";
import type {
  JobDescriptionNotFoundError,
  TalentNotFoundError,
  VectorNotFoundError,
  VectorSearchError,
} from "../domain/errors";
import type { JobDescriptionId } from "../domain/models/ids";
import type { StructuredJd } from "../domain/models/job-description";
import type { Match } from "../domain/models/match";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import { RankingService } from "./ranking-service";

export type MatchError =
  | VectorSearchError
  | VectorNotFoundError
  | TalentNotFoundError
  | JobDescriptionNotFoundError;

/** Read-only queries for job descriptions and their matches. */
export class JobQueryService extends Context.Tag("@recruit/JobQueryService")<
  JobQueryService,
  {
    readonly listJobs: () => Effect.Effect<readonly StructuredJd[]>;
    readonly getJob: (
      id: JobDescriptionId
    ) => Effect.Effect<StructuredJd, JobDescriptionNotFoundError>;
    readonly getMatches: (
      id: JobDescriptionId,
      options?: { strictFilters?: boolean }
    ) => Effect.Effect<readonly Match[], MatchError>;
  }
>() {
  static readonly layer = Layer.effect(
    JobQueryService,
    Effect.gen(function* () {
      const jdRepo = yield* JobDescriptionRepository;
      const ranking = yield* RankingService;

      return JobQueryService.of({
        listJobs: () => jdRepo.findAll(),
        getJob: (id) => jdRepo.findById(id),
        getMatches: (id, options) => ranking.rankTalentsByJob(id, options),
      });
    })
  );
}
