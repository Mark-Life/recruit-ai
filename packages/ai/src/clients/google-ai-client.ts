import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Config, Context, Data, Effect, Layer, Redacted } from "effect";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GoogleAiError extends Data.TaggedError("GoogleAiError")<{
  readonly cause: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

type GoogleAi = ReturnType<typeof createGoogleGenerativeAI>;

export type IGoogleAiClient = Readonly<{
  google: GoogleAi;
  use: <A>(
    fn: (google: GoogleAi) => Promise<A>
  ) => Effect.Effect<A, GoogleAiError>;
}>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const make = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("GOOGLE_GENERATIVE_AI_API_KEY");

  const google = createGoogleGenerativeAI({
    apiKey: Redacted.value(apiKey),
  });

  const use = <A>(fn: (google: GoogleAi) => Promise<A>) =>
    Effect.tryPromise({
      try: () => fn(google),
      catch: (cause) => new GoogleAiError({ cause }),
    }).pipe(Effect.withSpan(`google_ai.${fn.name ?? "use"}`));

  return { google, use } as const;
});

// ---------------------------------------------------------------------------
// Tag + Default layer
// ---------------------------------------------------------------------------

export class GoogleAiClient extends Context.Tag("@recruit/GoogleAiClient")<
  GoogleAiClient,
  IGoogleAiClient
>() {
  static readonly Default = Layer.effect(this, make).pipe(
    Layer.annotateSpans({ module: "GoogleAiClient" })
  );
}
