import { Context, type Effect } from "effect";
import type { TalentNotFoundError } from "../domain/errors";
import type { TalentId } from "../domain/models/ids";
import type { Talent } from "../domain/models/talent";

export class TalentRepository extends Context.Tag("@recruit/TalentRepository")<
  TalentRepository,
  {
    readonly findById: (
      id: TalentId
    ) => Effect.Effect<Talent, TalentNotFoundError>;
    readonly findAll: () => Effect.Effect<readonly Talent[]>;
  }
>() {}
