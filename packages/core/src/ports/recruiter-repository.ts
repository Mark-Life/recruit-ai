import { Context, type Effect } from "effect";
import type { RecruiterNotFoundError } from "../domain/errors";
import type { RecruiterId, TalentId } from "../domain/models/ids";
import type { Recruiter } from "../domain/models/recruiter";

export class RecruiterRepository extends Context.Tag(
  "@recruit/RecruiterRepository"
)<
  RecruiterRepository,
  {
    readonly findById: (
      id: RecruiterId
    ) => Effect.Effect<Recruiter, RecruiterNotFoundError>;
    readonly findByTalentIds: (
      talentIds: readonly TalentId[]
    ) => Effect.Effect<readonly Recruiter[]>;
  }
>() {}
