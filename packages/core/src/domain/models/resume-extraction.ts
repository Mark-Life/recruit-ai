import { Schema } from "effect";
import { WorkMode } from "./talent";

/** LLM-extracted fields from a resume (no system-assigned IDs). */
export class ResumeExtraction extends Schema.Class<ResumeExtraction>(
  "ResumeExtraction"
)({
  name: Schema.String.annotations({
    description: "The candidate's full name",
  }),
  title: Schema.String.annotations({
    description:
      "Current or most recent job title, e.g. 'Senior Frontend Engineer'",
  }),
  skills: Schema.Array(Schema.String).annotations({
    description:
      "Normalized technology/skill tags extracted from the resume, e.g. ['React', 'TypeScript', 'Node.js']",
  }),
  keywords: Schema.Array(Schema.String).annotations({
    description:
      "Additional domain keywords for matching, e.g. ['frontend', 'SPA', 'microservices']",
  }),
  experienceYears: Schema.Number.annotations({
    description: "Total years of professional experience (integer)",
  }),
  location: Schema.String.annotations({
    description: "Current location or 'Unknown' if not mentioned",
  }),
  workModes: Schema.Array(WorkMode).annotations({
    description:
      "Work modes mentioned or implied. Default to ['office', 'hybrid', 'remote'] if not specified",
  }),
  willingToRelocate: Schema.Boolean.annotations({
    description:
      "Whether the candidate indicates willingness to relocate. Default false if not mentioned",
  }),
}) {}
