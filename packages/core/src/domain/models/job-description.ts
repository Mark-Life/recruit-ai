import { Schema } from "effect";
import { ClarifyingQuestion } from "./clarifying-question";
import { JobDescriptionId, OrganizationId } from "./ids";
import { EmploymentType, JdExtraction, SeniorityLevel } from "./jd-extraction";
import { WorkMode } from "./talent";

export { EmploymentType, SeniorityLevel } from "./jd-extraction";

export const UpdateJobInput = Schema.Struct({
  summary: Schema.optional(Schema.String),
  roleTitle: Schema.optional(Schema.String),
  keywords: Schema.optional(Schema.Array(Schema.String)),
  seniority: Schema.optional(SeniorityLevel),
  employmentType: Schema.optional(EmploymentType),
  workMode: Schema.optional(WorkMode),
  location: Schema.optional(Schema.String),
  willingToSponsorRelocation: Schema.optional(Schema.Boolean),
  experienceYearsMin: Schema.optional(Schema.Number),
  experienceYearsMax: Schema.optional(Schema.Number),
});
export type UpdateJobInput = typeof UpdateJobInput.Type;

export const JobStatus = Schema.Literal(
  "draft",
  "refining",
  "matching",
  "ready"
);
export type JobStatus = typeof JobStatus.Type;

/** Raw JD after LLM structuring + clarifying answers merged */
export class StructuredJd extends JdExtraction.extend<StructuredJd>(
  "StructuredJd"
)({
  id: JobDescriptionId,
  organizationId: OrganizationId,
  rawText: Schema.String,
  status: JobStatus,
  questions: Schema.optionalWith(Schema.Array(ClarifyingQuestion), {
    default: () => [],
  }),
  createdAt: Schema.DateFromSelf,
}) {}
