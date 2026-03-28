import { Context, Effect, Layer } from "effect";
import type { JobDescriptionNotFoundError } from "../domain/errors";
import type { JobDescriptionId } from "../domain/models/ids";
import type { StructuredJd } from "../domain/models/job-description";
import type { Match } from "../domain/models/match";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import { MatchRepository } from "../ports/match-repository";

/** Read-only queries for job descriptions and their matches. */
export class JobQueryService extends Context.Tag("@recruit/JobQueryService")<
  JobQueryService,
  {
    readonly listJobs: () => Effect.Effect<readonly StructuredJd[]>;
    readonly getJob: (
      id: JobDescriptionId
    ) => Effect.Effect<StructuredJd, JobDescriptionNotFoundError>;
    readonly getMatches: (
      id: JobDescriptionId
    ) => Effect.Effect<readonly Match[]>;
  }
>() {
  static readonly layer = Layer.effect(
    JobQueryService,
    Effect.gen(function* () {
      const jdRepo = yield* JobDescriptionRepository;
      const matchRepo = yield* MatchRepository;

      return JobQueryService.of({
        listJobs: () => jdRepo.findAll(),
        getJob: (id) => jdRepo.findById(id),
        getMatches: (id) => matchRepo.findByJobDescriptionId(id),
      });
    })
  );
}
