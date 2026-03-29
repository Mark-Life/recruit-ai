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

const ConfirmSkillsPayload = Schema.Struct({
  skills: Schema.Array(Schema.String),
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
    HttpApiEndpoint.put("confirmSkills", "/:id/skills")
      .setPath(TalentIdPath)
      .setPayload(ConfirmSkillsPayload)
      .addSuccess(Talent)
      .addError(Schema.String, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("matches", "/:id/matches")
      .setPath(TalentIdPath)
      .addSuccess(Schema.Array(Match))
      .addError(Schema.String, { status: 404 })
  )
  .prefix("/api/talents") {}

// ---------------------------------------------------------------------------
// Root API
// ---------------------------------------------------------------------------

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(JobsGroup)
  .add(TalentsGroup) {}
