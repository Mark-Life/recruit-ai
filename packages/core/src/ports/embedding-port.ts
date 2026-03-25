import { Context, type Effect } from "effect";
import type { EmbeddingError } from "../domain/errors";
import type { Vector } from "../domain/models/vector";

export class EmbeddingPort extends Context.Tag("@recruit/EmbeddingPort")<
  EmbeddingPort,
  {
    readonly embed: (text: string) => Effect.Effect<Vector, EmbeddingError>;
  }
>() {}
