import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import {
  JobDescriptionId,
  OrganizationId,
  RecruiterId,
  TalentId,
} from "@workspace/core/domain/models/ids";
import {
  StructuredJd,
  UpdateJobInput,
} from "@workspace/core/domain/models/job-description";
import { Match } from "@workspace/core/domain/models/match";
import {
  Talent,
  UpdateTalentInput,
} from "@workspace/core/domain/models/talent";
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

const JobIdPath = Schema.Struct({ id: JobDescriptionId });

const CreateDraftJobPayload = Schema.Struct({
  rawText: Schema.String,
  title: Schema.String,
  organizationId: OrganizationId,
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
      .setUrlParams(
        Schema.Struct({
          strictFilters: Schema.optional(Schema.String),
        })
      )
      .addSuccess(Schema.Array(Match))
      .addError(Schema.String, { status: 404 })
      .addError(Schema.String, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createDraft", "/")
      .setPayload(CreateDraftJobPayload)
      .addSuccess(StructuredJd)
  )
  .add(
    HttpApiEndpoint.put("update", "/:id")
      .setPath(JobIdPath)
      .setPayload(UpdateJobInput)
      .addSuccess(StructuredJd)
      .addError(Schema.String, { status: 404 })
      .addError(Schema.String, { status: 500 })
  )
  .prefix("/api/jobs") {}

// ---------------------------------------------------------------------------
// Talents — typed CRUD endpoints
// ---------------------------------------------------------------------------

const TalentIdPath = Schema.Struct({ id: TalentId });

const CreateDraftTalentPayload = Schema.Struct({
  name: Schema.String,
  resumeText: Schema.optional(Schema.String),
  resumePdfBase64: Schema.optional(Schema.String),
  recruiterId: RecruiterId,
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
      .setUrlParams(
        Schema.Struct({
          strictFilters: Schema.optional(Schema.String),
        })
      )
      .addSuccess(Schema.Array(Match))
      .addError(Schema.String, { status: 404 })
      .addError(Schema.String, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createDraft", "/")
      .setPayload(CreateDraftTalentPayload)
      .addSuccess(Talent)
  )
  .add(
    HttpApiEndpoint.put("update", "/:id")
      .setPath(TalentIdPath)
      .setPayload(UpdateTalentInput)
      .addSuccess(Talent)
      .addError(Schema.String, { status: 404 })
      .addError(Schema.String, { status: 500 })
  )
  .prefix("/api/talents") {}

// ---------------------------------------------------------------------------
// Root API
// ---------------------------------------------------------------------------

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(JobsGroup)
  .add(TalentsGroup) {}
