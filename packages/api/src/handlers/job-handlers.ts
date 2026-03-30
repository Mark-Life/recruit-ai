import { HttpApiBuilder } from "@effect/platform";
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
        return yield* query.getJob(path.id);
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        )
      )
    )
    .handle("matches", ({ path, urlParams }) =>
      Effect.gen(function* () {
        const query = yield* JobQueryService;
        return yield* query.getMatches(path.id, {
          strictFilters: urlParams.strictFilters === "true",
        });
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
          organizationId: payload.organizationId,
        });
      })
    )
    .handle("update", ({ path, payload }) =>
      Effect.gen(function* () {
        const orchestration = yield* JobOrchestrationService;
        return yield* orchestration.updateJob(path.id, payload);
      }).pipe(
        Effect.catchTag("JobDescriptionNotFoundError", (e) =>
          Effect.fail(`Job not found: ${e.jobDescriptionId}`)
        ),
        Effect.catchTag("EmbeddingError", (e) =>
          Effect.fail(`Embedding failed: ${e.message}`)
        ),
        Effect.catchTag("VectorSearchError", (e) =>
          Effect.fail(`Vector search failed: ${e.message}`)
        )
      )
    )
);
