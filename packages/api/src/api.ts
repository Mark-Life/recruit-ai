import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { StructuredJd } from "@workspace/core/domain/models/job-description";
import { Match } from "@workspace/core/domain/models/match";
import { Talent } from "@workspace/core/domain/models/talent";
import { Schema } from "effect";

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export class HealthCheckResponse extends Schema.Class<HealthCheckResponse>(
  "HealthCheckResponse"
)({
  status: Schema.Literal("ok"),
  timestamp: Schema.String,
}) {}

export class HealthGroup extends HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("check", "/health").addSuccess(HealthCheckResponse))
  .prefix("/api") {}

// ---------------------------------------------------------------------------
// Jobs — typed CRUD endpoints
// ---------------------------------------------------------------------------

const JobIdPath = Schema.Struct({ id: Schema.String });

const CreateDraftJobPayload = Schema.Struct({
  rawText: Schema.String,
  title: Schema.String,
  organizationId: Schema.String,
});

export class JobsGroup extends HttpApiGroup.make("jobs")
  .add(HttpApiEndpoint.get("list", "/").addSuccess(Schema.Array(StructuredJd)))
  .add(
    HttpApiEndpoint.get("get", "/:id")
      .setPath(JobIdPath)
      .addSuccess(StructuredJd)
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("matches", "/:id/matches")
      .setPath(JobIdPath)
      .addSuccess(Schema.Array(Match))
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("createDraft", "/")
      .setPayload(CreateDraftJobPayload)
      .addSuccess(StructuredJd)
  )
  .prefix("/api/jobs") {}

// ---------------------------------------------------------------------------
// Talents — typed CRUD endpoints
// ---------------------------------------------------------------------------

const TalentIdPath = Schema.Struct({ id: Schema.String });

const CreateDraftTalentPayload = Schema.Struct({
  name: Schema.String,
  resumeText: Schema.optional(Schema.String),
  resumePdfBase64: Schema.optional(Schema.String),
  recruiterId: Schema.String,
});

const ConfirmKeywordsPayload = Schema.Struct({
  keywords: Schema.Array(Schema.String),
});

export class TalentsGroup extends HttpApiGroup.make("talents")
  .add(HttpApiEndpoint.get("list", "/").addSuccess(Schema.Array(Talent)))
  .add(
    HttpApiEndpoint.get("get", "/:id")
      .setPath(TalentIdPath)
      .addSuccess(Talent)
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.put("confirmKeywords", "/:id/keywords")
      .setPath(TalentIdPath)
      .setPayload(ConfirmKeywordsPayload)
      .addSuccess(Talent)
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("matches", "/:id/matches")
      .setPath(TalentIdPath)
      .addSuccess(Schema.Array(Match))
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("createDraft", "/")
      .setPayload(CreateDraftTalentPayload)
      .addSuccess(Talent)
  )
  .prefix("/api/talents") {}

// ---------------------------------------------------------------------------
// Root API
// ---------------------------------------------------------------------------

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(JobsGroup)
  .add(TalentsGroup) {}
