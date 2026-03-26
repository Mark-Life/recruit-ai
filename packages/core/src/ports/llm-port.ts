import { Context, type Effect } from "effect";
import type { LlmError } from "../domain/errors";
import type { ClarifyingQuestion } from "../domain/models/clarifying-question";
import type { JobDescriptionId, OrganizationId } from "../domain/models/ids";
import type { StructuredJd } from "../domain/models/job-description";

export class LlmPort extends Context.Tag("@recruit/LlmPort")<
  LlmPort,
  {
    readonly structureJd: (params: {
      readonly raw: string;
      readonly id: JobDescriptionId;
      readonly organizationId: OrganizationId;
    }) => Effect.Effect<StructuredJd, LlmError>;
    readonly extractKeywords: (
      text: string
    ) => Effect.Effect<readonly string[], LlmError>;
    readonly generateClarifyingQuestions: (
      raw: string
    ) => Effect.Effect<readonly ClarifyingQuestion[], LlmError>;
  }
>() {}
