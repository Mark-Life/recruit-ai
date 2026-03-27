import { HttpApiBuilder, HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { AppApi } from "./api";
import { HealthGroupLive } from "./handlers/health-handlers";

const AppApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(HealthGroupLive)
);

export const createWebHandler = () =>
  HttpApiBuilder.toWebHandler(
    Layer.mergeAll(AppApiLive, HttpServer.layerContext)
  );
