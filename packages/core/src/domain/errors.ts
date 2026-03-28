import { Schema } from "effect";

export class LlmError extends Schema.TaggedError<LlmError>()("LlmError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class EmbeddingError extends Schema.TaggedError<EmbeddingError>()(
  "EmbeddingError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export class VectorSearchError extends Schema.TaggedError<VectorSearchError>()(
  "VectorSearchError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export class TalentNotFoundError extends Schema.TaggedError<TalentNotFoundError>()(
  "TalentNotFoundError",
  {
    talentId: Schema.String,
  }
) {}

export class RecruiterNotFoundError extends Schema.TaggedError<RecruiterNotFoundError>()(
  "RecruiterNotFoundError",
  {
    recruiterId: Schema.String,
  }
) {}

export class RankingError extends Schema.TaggedError<RankingError>()(
  "RankingError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

export class JobDescriptionNotFoundError extends Schema.TaggedError<JobDescriptionNotFoundError>()(
  "JobDescriptionNotFoundError",
  {
    jobDescriptionId: Schema.String,
  }
) {}

export class OrganizationNotFoundError extends Schema.TaggedError<OrganizationNotFoundError>()(
  "OrganizationNotFoundError",
  {
    organizationId: Schema.String,
  }
) {}
