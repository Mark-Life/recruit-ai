import { Schema } from "effect";
import { JobDescriptionId, OrganizationId } from "./ids";
import { JdExtraction } from "./jd-extraction";

export { EmploymentType, SeniorityLevel } from "./jd-extraction";

/** Raw JD after LLM structuring + clarifying answers merged */
export class StructuredJd extends JdExtraction.extend<StructuredJd>(
  "StructuredJd"
)({
  id: JobDescriptionId,
  organizationId: OrganizationId,
  rawText: Schema.String,
}) {}
