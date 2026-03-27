import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class HealthCheckResponse extends Schema.Class<HealthCheckResponse>(
  "HealthCheckResponse"
)({
  status: Schema.Literal("ok"),
  timestamp: Schema.String,
}) {}

export class HealthGroup extends HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("check", "/health").addSuccess(HealthCheckResponse))
  .prefix("/api") {}

export class AppApi extends HttpApi.make("app").add(HealthGroup) {}
