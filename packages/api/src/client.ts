import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect } from "effect";
import { AppApi } from "./api";

export const makeClient = (baseUrl: string) =>
  HttpApiClient.make(AppApi, { baseUrl }).pipe(
    Effect.provide(FetchHttpClient.layer)
  );
