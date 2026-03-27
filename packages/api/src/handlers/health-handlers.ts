import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { AppApi } from "../api";

export const HealthGroupLive = HttpApiBuilder.group(
  AppApi,
  "health",
  (handlers) =>
    handlers.handle("check", () =>
      Effect.sync(() => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      }))
    )
);
