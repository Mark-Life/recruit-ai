export interface ClarifyingAnswer {
  readonly answer: string;
  readonly field: string;
}

/**
 * Appends user-provided answers as structured clarifications to the raw JD text.
 * The enriched text is then fed back into `structureJd` for extraction.
 */
export function mergeAnswersIntoJd(
  rawJd: string,
  answers: readonly ClarifyingAnswer[]
): string {
  if (answers.length === 0) {
    return rawJd;
  }

  const clarifications = answers
    .map((a) => `${a.field}: ${a.answer}`)
    .join("\n");

  return `${rawJd}\n\nAdditional clarifications:\n${clarifications}`;
}
