import { Schema } from "effect";
import { JobDescriptionId, OrganizationId } from "./ids";
import { WorkMode } from "./talent";

export const EmploymentType = Schema.Literal(
  "full-time",
  "contract",
  "freelance"
);
export type EmploymentType = typeof EmploymentType.Type;

export const SeniorityLevel = Schema.Literal(
  "junior",
  "mid",
  "senior",
  "lead",
  "principal"
);
export type SeniorityLevel = typeof SeniorityLevel.Type;

/** Raw JD after LLM structuring + clarifying answers merged */
export class StructuredJd extends Schema.Class<StructuredJd>("StructuredJd")({
  id: JobDescriptionId,
  organizationId: OrganizationId,
  rawText: Schema.String,
  summary: Schema.String,
  roleTitle: Schema.String,
  skills: Schema.Array(Schema.String),
  keywords: Schema.Array(Schema.String),
  seniority: SeniorityLevel,
  employmentType: EmploymentType,
  workMode: WorkMode,
  location: Schema.String,
  willingToSponsorRelocation: Schema.Boolean,
  experienceYearsMin: Schema.Number,
  experienceYearsMax: Schema.Number,
}) {}
