import { Context, Effect, Layer } from "effect";
import type { TalentNotFoundError } from "../domain/errors";
import type { TalentId } from "../domain/models/ids";
import type { Match } from "../domain/models/match";
import type { Talent } from "../domain/models/talent";
import { TalentRepository } from "../ports/talent-repository";
import type { MatchError } from "./job-query-service";
import { RankingService } from "./ranking-service";

/** Read-only queries for talents and their matches. */
export class TalentQueryService extends Context.Tag(
  "@recruit/TalentQueryService"
)<
  TalentQueryService,
  {
    readonly listTalents: () => Effect.Effect<readonly Talent[]>;
    readonly getTalent: (
      id: TalentId
    ) => Effect.Effect<Talent, TalentNotFoundError>;
    readonly getMatches: (
      id: TalentId
    ) => Effect.Effect<readonly Match[], MatchError>;
  }
>() {
  static readonly layer = Layer.effect(
    TalentQueryService,
    Effect.gen(function* () {
      const talentRepo = yield* TalentRepository;
      const ranking = yield* RankingService;

      return TalentQueryService.of({
        listTalents: () => talentRepo.findAll(),
        getTalent: (id) => talentRepo.findById(id),
        getMatches: (id) => ranking.rankJobsByTalent(id),
      });
    })
  );
}
