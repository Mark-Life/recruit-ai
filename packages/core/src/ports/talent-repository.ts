import { Context, type Effect } from "effect";
import type { TalentNotFoundError } from "../domain/errors";
import type { TalentId } from "../domain/models/ids";
import type { Talent, TalentStatus } from "../domain/models/talent";

export class TalentRepository extends Context.Tag("@recruit/TalentRepository")<
  TalentRepository,
  {
    readonly create: (
      talent: Talent,
      embedding?: readonly number[]
    ) => Effect.Effect<Talent>;
    readonly findById: (
      id: TalentId
    ) => Effect.Effect<Talent, TalentNotFoundError>;
    readonly findAll: () => Effect.Effect<readonly Talent[]>;
    readonly updateSkills: (
      id: TalentId,
      skills: readonly string[]
    ) => Effect.Effect<void, TalentNotFoundError>;
    readonly updateStatus: (
      id: TalentId,
      status: TalentStatus
    ) => Effect.Effect<void, TalentNotFoundError>;
    readonly update: (
      id: TalentId,
      data: Partial<Omit<Talent, "id" | "recruiterId">>
    ) => Effect.Effect<Talent, TalentNotFoundError>;
  }
>() {}
