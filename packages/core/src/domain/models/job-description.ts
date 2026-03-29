import { Schema } from "effect";
import { ClarifyingQuestion } from "./clarifying-question";
import { JobDescriptionId, OrganizationId } from "./ids";
import { JdExtraction } from "./jd-extraction";

export { EmploymentType, SeniorityLevel } from "./jd-extraction";

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
  createdAt: Schema.String,
}) {}
