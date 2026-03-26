import { Schema } from "effect";

/** A follow-up question the system asks when a JD is missing information. */
export class ClarifyingQuestion extends Schema.Class<ClarifyingQuestion>(
  "ClarifyingQuestion"
)({
  /** Which StructuredJd field this targets (e.g. "seniority", "workMode") */
  field: Schema.String,
  /** Human-readable question text */
  question: Schema.String,
  /** Why this information is needed for matching */
  reason: Schema.String,
  /** Suggested answer options, if applicable */
  options: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
}) {}
