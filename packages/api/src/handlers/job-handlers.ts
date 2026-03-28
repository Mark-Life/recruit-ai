import { HttpApiBuilder } from "@effect/platform";
import type { JobDescriptionId } from "@workspace/core/domain/models/ids";
import { JobQueryService } from "@workspace/core/services/job-query-service";
import { Effect } from "effect";
import { AppApi } from "../api";

export const JobsGroupLive = HttpApiBuilder.group(AppApi, "jobs", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function* () {
        const query = yield* JobQueryService;
        return yield* query.listJobs();
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const query = yield* JobQueryService;
        return yield* query.getJob(path.id as JobDescriptionId);
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        )
      )
    )
    .handle("matches", ({ path }) =>
      Effect.gen(function* () {
        const query = yield* JobQueryService;
        return yield* query.getMatches(path.id as JobDescriptionId);
      })
    )
);
