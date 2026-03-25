import { Schema } from "effect";
import { RecruiterId, TalentId } from "./ids";

export const WorkMode = Schema.Literal("office", "hybrid", "remote");
export type WorkMode = typeof WorkMode.Type;

export class Talent extends Schema.Class<Talent>("Talent")({
  id: TalentId,
  name: Schema.String,
  title: Schema.String,
  skills: Schema.Array(Schema.String),
  keywords: Schema.Array(Schema.String),
  experienceYears: Schema.Number,
  location: Schema.String,
  workModes: Schema.Array(WorkMode),
  willingToRelocate: Schema.Boolean,
  recruiterId: RecruiterId,
}) {}
