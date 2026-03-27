import { Context, Effect, Layer } from "effect";
import type { LlmError } from "../domain/errors";
import type { ClarifyingAnswer } from "../domain/jd-enrichment";
import { mergeAnswersIntoJd } from "../domain/jd-enrichment";
import type { ClarifyingQuestion } from "../domain/models/clarifying-question";
import type { JobDescriptionId, OrganizationId } from "../domain/models/ids";
import type { StructuredJd } from "../domain/models/job-description";
import { LlmPort } from "../ports/llm-port";

export class JdEnrichmentService extends Context.Tag(
  "@recruit/JdEnrichmentService"
)<
  JdEnrichmentService,
  {
    readonly generateQuestions: (
      rawJd: string
    ) => Effect.Effect<readonly ClarifyingQuestion[], LlmError>;

    readonly enrichAndStructure: (params: {
      readonly rawJd: string;
      readonly answers: readonly ClarifyingAnswer[];
      readonly id: JobDescriptionId;
      readonly organizationId: OrganizationId;
    }) => Effect.Effect<StructuredJd, LlmError>;
  }
>() {
  static readonly layer = Layer.effect(
    JdEnrichmentService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;

      return JdEnrichmentService.of({
        generateQuestions: (rawJd) => llm.generateClarifyingQuestions(rawJd),

        enrichAndStructure: (params) =>
          Effect.gen(function* () {
            const enrichedText = mergeAnswersIntoJd(
              params.rawJd,
              params.answers
            );
            return yield* llm.structureJd({
              raw: enrichedText,
              id: params.id,
              organizationId: params.organizationId,
            });
          }),
      });
    })
  );
}
