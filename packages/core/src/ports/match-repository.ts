import { Context, type Effect } from "effect";
import type { JobDescriptionId, TalentId } from "../domain/models/ids";
import type { Match } from "../domain/models/match";

export class MatchRepository extends Context.Tag("@recruit/MatchRepository")<
  MatchRepository,
  {
    readonly createMany: (
      matches: readonly Match[]
    ) => Effect.Effect<readonly Match[]>;
    readonly findByJobDescriptionId: (
      id: JobDescriptionId
    ) => Effect.Effect<readonly Match[]>;
    readonly findByTalentId: (id: TalentId) => Effect.Effect<readonly Match[]>;
  }
>() {}
