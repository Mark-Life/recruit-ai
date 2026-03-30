import { makeClient } from "@workspace/api/client";
import { Effect } from "effect";

type ApiClient = Effect.Effect.Success<ReturnType<typeof makeClient>>;

const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
};

let clientPromise: Promise<ApiClient> | null = null;

/** Lazily creates and caches a typed Effect HTTP API client. */
export const getClient = () => {
  if (!clientPromise) {
    clientPromise = Effect.runPromise(makeClient(resolveBaseUrl()));
  }
  return clientPromise;
};
