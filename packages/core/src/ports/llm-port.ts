import { Context, type Effect, type Stream } from "effect";
import type { LlmError } from "../domain/errors";
import type {
  ClarifyingQuestion,
  ClarifyingQuestionsExtractionOutput,
} from "../domain/models/clarifying-question";
import type { JobDescriptionId, OrganizationId } from "../domain/models/ids";
import type { JdExtraction } from "../domain/models/jd-extraction";
import type { StructuredJd } from "../domain/models/job-description";
import type { ResumeExtraction } from "../domain/models/resume-extraction";

/**
 * Deep partial matching the AI SDK's `PartialObject` — arrays contain
 * elements that are themselves deep-partial and possibly undefined.
 */
export type DeepPartial<T> = T extends
  | string
  | number
  | boolean
  | null
  | undefined
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U> | undefined>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : unknown;

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
    readonly structureResume: (
      text: string
    ) => Effect.Effect<ResumeExtraction, LlmError>;
    readonly structureResumePdf: (
      pdf: Uint8Array
    ) => Effect.Effect<ResumeExtraction, LlmError>;

    // Streaming variants — emit deep-partial objects as the LLM generates tokens
    readonly streamStructureJd: (params: {
      readonly raw: string;
    }) => Stream.Stream<DeepPartial<JdExtraction>, LlmError>;
    readonly streamStructureResume: (
      text: string
    ) => Stream.Stream<DeepPartial<ResumeExtraction>, LlmError>;
    readonly streamStructureResumePdf: (
      pdf: Uint8Array
    ) => Stream.Stream<DeepPartial<ResumeExtraction>, LlmError>;
    readonly streamClarifyingQuestions: (
      raw: string
    ) => Stream.Stream<
      DeepPartial<ClarifyingQuestionsExtractionOutput>,
      LlmError
    >;
  }
>() {}
