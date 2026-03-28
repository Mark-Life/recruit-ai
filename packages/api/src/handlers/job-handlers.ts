import { HttpApiBuilder } from "@effect/platform";
import type { JobDescriptionId } from "@workspace/core/domain/models/ids";
import { JobDescriptionRepository } from "@workspace/core/ports/job-description-repository";
import { MatchRepository } from "@workspace/core/ports/match-repository";
import { Effect } from "effect";
import { AppApi } from "../api";

export const JobsGroupLive = HttpApiBuilder.group(AppApi, "jobs", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function* () {
        const repo = yield* JobDescriptionRepository;
        return yield* repo.findAll();
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* JobDescriptionRepository;
        return yield* repo.findById(path.id as JobDescriptionId);
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        )
      )
    )
    .handle("matches", ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* MatchRepository;
        return yield* repo.findByJobDescriptionId(path.id as JobDescriptionId);
      })
    )
);
