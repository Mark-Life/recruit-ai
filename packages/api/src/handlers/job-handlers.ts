import { HttpApiBuilder } from "@effect/platform";
import type {
  JobDescriptionId,
  OrganizationId,
} from "@workspace/core/domain/models/ids";
import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
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
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        ),
        Effect.catchTag("VectorSearchError", (e) =>
          Effect.fail(`Matching failed: ${e.message}`)
        ),
        Effect.catchTag("VectorNotFoundError", (e) =>
          Effect.fail(`Vector not found: ${e.pointId} in ${e.collection}`)
        ),
        Effect.catchTag("TalentNotFoundError", (e) =>
          Effect.fail(`Talent not found: ${e.talentId}`)
        )
      )
    )
    .handle("createDraft", ({ payload }) =>
      Effect.gen(function* () {
        const orchestration = yield* JobOrchestrationService;
        return yield* orchestration.createDraft({
          rawText: payload.rawText,
          title: payload.title,
          organizationId: payload.organizationId as OrganizationId,
        });
      })
    )
);
