import { Schema } from "effect";
import { RecruiterId, TalentId } from "./ids";

export const WorkMode = Schema.Literal("office", "hybrid", "remote");
export type WorkMode = typeof WorkMode.Type;

export const TalentStatus = Schema.Literal(
  "uploaded",
  "extracting",
  "reviewing",
  "matched"
);
export type TalentStatus = typeof TalentStatus.Type;

export class Talent extends Schema.Class<Talent>("Talent")({
  id: TalentId,
  name: Schema.String,
  title: Schema.String,
  keywords: Schema.Array(Schema.String),
  experienceYears: Schema.Number,
  location: Schema.String,
  workModes: Schema.Array(WorkMode),
  willingToRelocate: Schema.Boolean,
  resumeText: Schema.optionalWith(Schema.String, { nullable: true }),
  resumePdfBase64: Schema.optionalWith(Schema.String, { nullable: true }),
  recruiterId: RecruiterId,
  status: TalentStatus,
  createdAt: Schema.String,
}) {}
