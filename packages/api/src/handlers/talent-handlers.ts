import { HttpApiBuilder } from "@effect/platform";
import type { TalentId } from "@workspace/core/domain/models/ids";
import { MatchRepository } from "@workspace/core/ports/match-repository";
import { TalentRepository } from "@workspace/core/ports/talent-repository";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { Effect } from "effect";
import { AppApi } from "../api";

export const TalentsGroupLive = HttpApiBuilder.group(
  AppApi,
  "talents",
  (handlers) =>
    handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const repo = yield* TalentRepository;
          const talents = yield* repo.findAll();
          return talents as readonly unknown[];
        })
      )
      .handle("get", ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* TalentRepository;
          return (yield* repo.findById(path.id as TalentId)) as unknown;
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          )
        )
      )
      .handle("confirmSkills", ({ path, payload }) =>
        Effect.gen(function* () {
          const orchestration = yield* TalentOrchestrationService;
          return (yield* orchestration.confirmSkills(
            path.id as TalentId,
            payload.skills
          )) as unknown;
        }).pipe(
          Effect.catchTag("TalentNotFoundError", (e) =>
            Effect.fail(`Talent not found: ${e.talentId}`)
          )
        )
      )
      .handle("matches", ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* MatchRepository;
          const matches = yield* repo.findByTalentId(path.id as TalentId);
          return matches as readonly unknown[];
        })
      )
);
