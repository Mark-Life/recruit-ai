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
        const jobs = yield* repo.findAll();
        return jobs as readonly unknown[];
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* JobDescriptionRepository;
        return (yield* repo.findById(path.id as JobDescriptionId)) as unknown;
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        )
      )
    )
    .handle("matches", ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* MatchRepository;
        const matches = yield* repo.findByJobDescriptionId(
          path.id as JobDescriptionId
        );
        return matches as readonly unknown[];
      })
    )
);
