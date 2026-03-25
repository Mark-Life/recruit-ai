import { Schema } from "effect";

export const TalentId = Schema.String.pipe(Schema.brand("TalentId"));
export type TalentId = typeof TalentId.Type;

export const RecruiterId = Schema.String.pipe(Schema.brand("RecruiterId"));
export type RecruiterId = typeof RecruiterId.Type;

export const OrganizationId = Schema.String.pipe(
  Schema.brand("OrganizationId")
);
export type OrganizationId = typeof OrganizationId.Type;

export const JobDescriptionId = Schema.String.pipe(
  Schema.brand("JobDescriptionId")
);
export type JobDescriptionId = typeof JobDescriptionId.Type;

export const MatchId = Schema.String.pipe(Schema.brand("MatchId"));
export type MatchId = typeof MatchId.Type;
