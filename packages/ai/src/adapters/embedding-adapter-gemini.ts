import { EmbeddingError } from "@workspace/core/domain/errors";
import { EmbeddingPort } from "@workspace/core/ports/embedding-port";
import { embed } from "ai";
import { Effect, Layer } from "effect";
import { GoogleAiClient } from "../clients/google-ai-client";
import { AiConfig } from "../config/ai-config";

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const EmbeddingAdapterGeminiLayer = Layer.effect(
  EmbeddingPort,
  Effect.gen(function* () {
    const ai = yield* GoogleAiClient;
    const config = yield* AiConfig;

    return EmbeddingPort.of({
      embed: (text) =>
        ai
          .use((google) =>
            embed({
              model: google.embeddingModel(config.embeddingModel),
              value: text,
            })
          )
          .pipe(
            Effect.map(({ embedding }) => [...embedding]),
            Effect.mapError(
              (cause) =>
                new EmbeddingError({
                  message: "Gemini embedding request failed",
                  cause,
                })
            ),
            Effect.withSpan("embedding.embed")
          ),
    });
  })
);
