import { Rpc, RpcGroup } from "@effect/rpc";
import {
  EmbeddingError,
  JobDescriptionNotFoundError,
  LlmError,
  TalentNotFoundError,
  VectorNotFoundError,
  VectorSearchError,
} from "@workspace/core/domain/errors";
import {
  JobDescriptionId,
  OrganizationId,
  RecruiterId,
  TalentId,
} from "@workspace/core/domain/models/ids";
import { JdExtraction } from "@workspace/core/domain/models/jd-extraction";
import {
  StructuredJd,
  UpdateJobInput,
} from "@workspace/core/domain/models/job-description";
import { Match } from "@workspace/core/domain/models/match";
import { ResumeExtraction } from "@workspace/core/domain/models/resume-extraction";
import {
  Talent,
  UpdateTalentInput,
  WorkMode,
} from "@workspace/core/domain/models/talent";
import { Schema } from "effect";

// ---------------------------------------------------------------------------
// Streaming output schemas (partial objects emitted during LLM extraction)
// DeepPartial arrays have `| undefined` elements — use UndefinedOr to match.
// ---------------------------------------------------------------------------

const PartialJdExtraction = Schema.partial(
  Schema.Struct({
    ...JdExtraction.fields,
    keywords: Schema.Array(Schema.UndefinedOr(Schema.String)),
  })
);

const PartialClarifyingQuestion = Schema.partial(
  Schema.Struct({
    field: Schema.String,
    question: Schema.String,
    reason: Schema.String,
    options: Schema.Array(Schema.UndefinedOr(Schema.String)),
  })
);

const CreateJobStreamChunk = Schema.Struct({
  jd: Schema.optional(PartialJdExtraction),
  questions: Schema.optional(
    Schema.partial(
      Schema.Struct({
        questions: Schema.Array(Schema.UndefinedOr(PartialClarifyingQuestion)),
      })
    )
  ),
});

const SubmitAnswersStreamChunk = Schema.Unknown;

const ExtractTalentStreamChunk = Schema.partial(
  Schema.Struct({
    ...ResumeExtraction.fields,
    keywords: Schema.Array(Schema.UndefinedOr(Schema.String)),
    workModes: Schema.Array(Schema.UndefinedOr(WorkMode)),
  })
);

export type CreateJobStreamData = typeof CreateJobStreamChunk.Type;
export type ExtractTalentStreamData = typeof ExtractTalentStreamChunk.Type;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const healthCheck = Rpc.make("healthCheck", {
  success: Schema.Struct({
    status: Schema.Literal("ok"),
    timestamp: Schema.String,
  }),
});

// ---------------------------------------------------------------------------
// Jobs — CRUD
// ---------------------------------------------------------------------------

const listJobs = Rpc.make("listJobs", {
  success: Schema.Array(StructuredJd),
});

const getJob = Rpc.make("getJob", {
  payload: { id: JobDescriptionId },
  success: StructuredJd,
  error: JobDescriptionNotFoundError,
});

const getJobMatches = Rpc.make("getJobMatches", {
  payload: {
    id: JobDescriptionId,
    strictFilters: Schema.optional(Schema.Boolean),
  },
  success: Schema.Array(Match),
  error: Schema.Union(
    JobDescriptionNotFoundError,
    VectorSearchError,
    VectorNotFoundError,
    TalentNotFoundError
  ),
});

const createDraftJob = Rpc.make("createDraftJob", {
  payload: {
    rawText: Schema.String,
    title: Schema.String,
    organizationId: OrganizationId,
  },
  success: StructuredJd,
});

const updateJob = Rpc.make("updateJob", {
  payload: Schema.Struct({ id: JobDescriptionId }).pipe(
    Schema.extend(UpdateJobInput)
  ),
  success: StructuredJd,
  error: Schema.Union(
    JobDescriptionNotFoundError,
    EmbeddingError,
    VectorSearchError
  ),
});

// ---------------------------------------------------------------------------
// Jobs — Streaming
// ---------------------------------------------------------------------------

const extractJob = Rpc.make("extractJob", {
  payload: { id: JobDescriptionId },
  success: CreateJobStreamChunk,
  error: Schema.Union(LlmError, JobDescriptionNotFoundError),
  stream: true,
});

const submitAnswers = Rpc.make("submitAnswers", {
  payload: {
    id: JobDescriptionId,
    answers: Schema.Array(
      Schema.Struct({
        field: Schema.String,
        answer: Schema.String,
      })
    ),
  },
  success: SubmitAnswersStreamChunk,
  error: Schema.Union(
    LlmError,
    EmbeddingError,
    VectorSearchError,
    VectorNotFoundError,
    JobDescriptionNotFoundError
  ),
  stream: true,
});

// ---------------------------------------------------------------------------
// Talents — CRUD
// ---------------------------------------------------------------------------

const listTalents = Rpc.make("listTalents", {
  success: Schema.Array(Talent),
});

const getTalent = Rpc.make("getTalent", {
  payload: { id: TalentId },
  success: Talent,
  error: TalentNotFoundError,
});

const getTalentMatches = Rpc.make("getTalentMatches", {
  payload: {
    id: TalentId,
    strictFilters: Schema.optional(Schema.Boolean),
  },
  success: Schema.Array(Match),
  error: Schema.Union(
    TalentNotFoundError,
    VectorSearchError,
    VectorNotFoundError,
    JobDescriptionNotFoundError
  ),
});

const createDraftTalent = Rpc.make("createDraftTalent", {
  payload: {
    name: Schema.String,
    resumeText: Schema.optional(Schema.String),
    resumePdfBase64: Schema.optional(Schema.String),
    recruiterId: RecruiterId,
  },
  success: Talent,
});

const updateTalent = Rpc.make("updateTalent", {
  payload: Schema.Struct({ id: TalentId }).pipe(
    Schema.extend(UpdateTalentInput)
  ),
  success: Talent,
  error: Schema.Union(TalentNotFoundError, EmbeddingError, VectorSearchError),
});

const confirmKeywords = Rpc.make("confirmKeywords", {
  payload: {
    id: TalentId,
    keywords: Schema.Array(Schema.String),
  },
  success: Talent,
  error: Schema.Union(
    TalentNotFoundError,
    EmbeddingError,
    VectorSearchError,
    VectorNotFoundError
  ),
});

// ---------------------------------------------------------------------------
// Talents — Streaming
// ---------------------------------------------------------------------------

const extractTalent = Rpc.make("extractTalent", {
  payload: { id: TalentId },
  success: ExtractTalentStreamChunk,
  error: Schema.Union(
    LlmError,
    EmbeddingError,
    VectorSearchError,
    VectorNotFoundError,
    TalentNotFoundError
  ),
  stream: true,
});

// ---------------------------------------------------------------------------
// RPC Group
// ---------------------------------------------------------------------------

export class AppRpcs extends RpcGroup.make(
  healthCheck,
  listJobs,
  getJob,
  getJobMatches,
  createDraftJob,
  updateJob,
  extractJob,
  submitAnswers,
  listTalents,
  getTalent,
  getTalentMatches,
  createDraftTalent,
  updateTalent,
  confirmKeywords,
  extractTalent
) {}
