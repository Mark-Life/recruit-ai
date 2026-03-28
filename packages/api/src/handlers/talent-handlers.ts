import { HttpApiBuilder } from "@effect/platform";
import type { TalentId } from "@workspace/core/domain/models/ids";
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
      .handle("confirmSkills", ({ path, payload }) =>
        Effect.gen(function* () {
          const orchestration = yield* TalentOrchestrationService;
          return yield* orchestration.confirmSkills(
            path.id as TalentId,
            payload.skills
          );
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          )
        )
      )
      .handle("matches", ({ path }) =>
        Effect.gen(function* () {
          const query = yield* TalentQueryService;
          return yield* query.getMatches(path.id as TalentId);
        })
      )
);
