import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";
import { Config, Context, Effect, Layer, type Redacted } from "effect";

const DEFAULT_LANGUAGE_MODEL = "gemini-2.5-flash";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2-preview";

export class AiConfig extends Context.Tag("@recruit/AiConfig")<
  AiConfig,
  {
    readonly geminiApiKey: Redacted.Redacted;
    readonly languageModel: string;
    readonly embeddingModel: string;
    readonly embeddingDimensions: number;
  }
>() {
  static readonly layer = Layer.effect(
    AiConfig,
    Effect.all({
      geminiApiKey: Config.redacted("GOOGLE_GENERATIVE_AI_API_KEY"),
      languageModel: Config.withDefault(
        Config.string("GEMINI_LANGUAGE_MODEL"),
        DEFAULT_LANGUAGE_MODEL
      ),
      embeddingModel: Config.withDefault(
        Config.string("GEMINI_EMBEDDING_MODEL"),
        DEFAULT_EMBEDDING_MODEL
      ),
      embeddingDimensions: Config.withDefault(
        Config.integer("GEMINI_EMBEDDING_DIMENSIONS"),
        EMBEDDING_DIMENSIONS
      ),
    }).pipe(Effect.map((config) => AiConfig.of(config)))
  );
}
