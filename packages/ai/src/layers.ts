import { Layer } from "effect";
import { EmbeddingAdapterGeminiLayer } from "./adapters/embedding-adapter-gemini";
import { LlmAdapterGeminiLayer } from "./adapters/llm-adapter-gemini";
import { GoogleAiClient } from "./clients/google-ai-client";
import { AiConfig } from "./config/ai-config";

// ---------------------------------------------------------------------------
// Pre-composed "batteries-included" layers
// ---------------------------------------------------------------------------

/** LlmPort backed by Gemini. Requires GOOGLE_GENERATIVE_AI_API_KEY env var. */
export const GeminiLlmLive = LlmAdapterGeminiLayer.pipe(
  Layer.provide(GoogleAiClient.Default),
  Layer.provide(AiConfig.layer)
);

/** EmbeddingPort backed by Gemini. Requires GOOGLE_GENERATIVE_AI_API_KEY env var. */
export const GeminiEmbeddingLive = EmbeddingAdapterGeminiLayer.pipe(
  Layer.provide(GoogleAiClient.Default),
  Layer.provide(AiConfig.layer)
);
