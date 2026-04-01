import { makeClient } from "@workspace/api/client";
import { Effect, Scope } from "effect";

type ApiClient = Effect.Effect.Success<ReturnType<typeof makeClient>>;

const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
};

let clientPromise: Promise<ApiClient> | null = null;

/**
 * Lazily creates and caches a typed RPC client.
 * Uses a long-lived scope so the client's background fiber stays alive.
 */
export const getClient = () => {
  if (!clientPromise) {
    const scope = Effect.runSync(Scope.make());
    clientPromise = Effect.runPromise(
      makeClient(resolveBaseUrl()).pipe(
        Effect.provideService(Scope.Scope, scope)
      )
    );
  }
  return clientPromise;
};
