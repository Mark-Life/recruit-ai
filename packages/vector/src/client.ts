import { QdrantClient } from "@qdrant/js-client-rest";
import { Context, Effect, Layer, Redacted } from "effect";
import { QdrantConfig } from "./config";

export class QdrantClientService extends Context.Tag("@recruit/QdrantClient")<
  QdrantClientService,
  QdrantClient
>() {
  static readonly layer = Layer.effect(
    QdrantClientService,
    Effect.gen(function* () {
      const config = yield* QdrantConfig;
      return new QdrantClient({
        url: config.url,
        apiKey: config.apiKey ? Redacted.value(config.apiKey) : undefined,
      });
    })
  );
}
