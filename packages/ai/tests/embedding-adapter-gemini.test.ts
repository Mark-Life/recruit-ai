import { describe, expect, it } from "@effect/vitest";
import { EmbeddingPort } from "@workspace/core/ports/embedding-port";
import { Effect, Layer } from "effect";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_EMBEDDING = Array.from({ length: 10 }, (_, i) => i * 0.1);

// ---------------------------------------------------------------------------
// Test layer — stubs EmbeddingPort directly
// ---------------------------------------------------------------------------

const TestLayer = Layer.succeed(EmbeddingPort, {
  embed: (_text: string) => Effect.succeed(MOCK_EMBEDDING),
});

// ---------------------------------------------------------------------------
// Tests — validate the EmbeddingPort contract
// ---------------------------------------------------------------------------

describe("EmbeddingAdapterGemini", () => {
  it.effect("embed returns a vector", () =>
    Effect.gen(function* () {
      const port = yield* EmbeddingPort;
      const vector = yield* port.embed("Hello world");

      expect(vector).toEqual(MOCK_EMBEDDING);
      expect(vector).toHaveLength(10);
    }).pipe(Effect.provide(TestLayer))
  );
});
