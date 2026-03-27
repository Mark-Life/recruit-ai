import { Schema } from "effect";
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

/** LLM-extracted fields from a job description (no system-assigned IDs). */
export class JdExtraction extends Schema.Class<JdExtraction>("JdExtraction")({
  summary: Schema.String.annotations({
    description: "A 1-2 sentence summary of the job description",
  }),
  roleTitle: Schema.String.annotations({
    description: "The job title, e.g. 'Senior Frontend Engineer'",
  }),
  skills: Schema.Array(Schema.String).annotations({
    description:
      "Normalized technology/skill tags, e.g. ['React', 'TypeScript', 'Node.js']",
  }),
  keywords: Schema.Array(Schema.String).annotations({
    description:
      "Additional relevant keywords for matching, e.g. ['frontend', 'SPA', 'UI']",
  }),
  seniority: SeniorityLevel.annotations({
    description: "Seniority level",
  }),
  employmentType: EmploymentType.annotations({
    description: "Employment type",
  }),
  workMode: WorkMode.annotations({
    description: "Work mode",
  }),
  location: Schema.String.annotations({
    description:
      "Work location or 'Worldwide' for remote roles with no geographic constraint",
  }),
  willingToSponsorRelocation: Schema.Boolean.annotations({
    description: "Whether the company offers relocation sponsorship",
  }),
  experienceYearsMin: Schema.Number.annotations({
    description: "Minimum years of experience required",
  }),
  experienceYearsMax: Schema.Number.annotations({
    description: "Maximum years of experience expected",
  }),
}) {}

export const KeywordsExtraction = Schema.Struct({
  keywords: Schema.Array(Schema.String).annotations({
    description:
      "Normalized technology and domain keywords extracted from the text",
  }),
});
