import { HttpApiBuilder } from "@effect/platform";
import type { RecruiterId, TalentId } from "@workspace/core/domain/models/ids";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { TalentQueryService } from "@workspace/core/services/talent-query-service";
import { Effect } from "effect";
import { AppApi } from "../api";

export const TalentsGroupLive = HttpApiBuilder.group(
  AppApi,
  "talents",
  (handlers) =>
    handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const query = yield* TalentQueryService;
          return yield* query.listTalents();
        })
      )
      .handle("get", ({ path }) =>
        Effect.gen(function* () {
          const query = yield* TalentQueryService;
          return yield* query.getTalent(path.id as TalentId);
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          )
        )
      )
      .handle("confirmKeywords", ({ path, payload }) =>
        Effect.gen(function* () {
          const orchestration = yield* TalentOrchestrationService;
          return yield* orchestration.confirmKeywords(
            path.id as TalentId,
            payload.keywords
          );
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          ),
          Effect.catchTag("EmbeddingError", (e) =>
            Effect.fail(`Embedding failed: ${e.message}`)
          ),
          Effect.catchTag("VectorSearchError", (e) =>
            Effect.fail(`Vector search failed: ${e.message}`)
          ),
          Effect.catchTag("VectorNotFoundError", (e) =>
            Effect.fail(`Vector not found: ${e.pointId} in ${e.collection}`)
          )
        )
      )
      .handle("matches", ({ path }) =>
        Effect.gen(function* () {
          const query = yield* TalentQueryService;
          return yield* query.getMatches(path.id as TalentId);
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          ),
          Effect.catchTag("VectorSearchError", (e) =>
            Effect.fail(`Matching failed: ${e.message}`)
          ),
          Effect.catchTag("VectorNotFoundError", (e) =>
            Effect.fail(`Vector not found: ${e.pointId} in ${e.collection}`)
          ),
          Effect.catchTag("JobDescriptionNotFoundError", (e) =>
            Effect.fail(`Job not found: ${e.jobDescriptionId}`)
          )
        )
      )
      .handle("createDraft", ({ payload }) =>
        Effect.gen(function* () {
          const orchestration = yield* TalentOrchestrationService;
          return yield* orchestration.createDraft({
            name: payload.name,
            resumeText: payload.resumeText,
            resumePdfBase64: payload.resumePdfBase64,
            recruiterId: payload.recruiterId as RecruiterId,
          });
        })
      )
      .handle("update", ({ path, payload }) =>
        Effect.gen(function* () {
          const orchestration = yield* TalentOrchestrationService;
          return yield* orchestration.updateTalent(
            path.id as TalentId,
            payload
          );
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
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
