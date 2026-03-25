import { Context, type Effect } from "effect";
import type { LlmError } from "../domain/errors";
import type { StructuredJd } from "../domain/models/job-description";

export class LlmPort extends Context.Tag("@recruit/LlmPort")<
  LlmPort,
  {
    readonly structureJd: (
      raw: string
    ) => Effect.Effect<StructuredJd, LlmError>;
    readonly extractKeywords: (
      text: string
    ) => Effect.Effect<readonly string[], LlmError>;
  }
>() {}
