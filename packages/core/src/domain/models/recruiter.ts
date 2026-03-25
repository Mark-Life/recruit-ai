import { Schema } from "effect";
import { RecruiterId, TalentId } from "./ids";

export class Recruiter extends Schema.Class<Recruiter>("Recruiter")({
  id: RecruiterId,
  name: Schema.String,
  email: Schema.String,
  talentIds: Schema.Array(TalentId),
}) {}
