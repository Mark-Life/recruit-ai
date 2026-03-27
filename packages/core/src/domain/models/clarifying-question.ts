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

/** Wrapper for LLM extraction: an object with a `questions` array. */
export const ClarifyingQuestionsExtraction = Schema.Struct({
  questions: Schema.Array(
    Schema.Struct({
      field: Schema.String.annotations({
        description: "Which StructuredJd field this targets",
      }),
      question: Schema.String.annotations({
        description: "Human-readable clarifying question",
      }),
      reason: Schema.String.annotations({
        description: "Why this information is needed for matching",
      }),
      options: Schema.optionalWith(
        Schema.Array(Schema.String).annotations({
          description: "Suggested answer options",
        }),
        { default: () => [] }
      ),
    })
  ),
});
