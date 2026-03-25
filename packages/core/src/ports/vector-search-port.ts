import { Context, type Effect } from "effect";
import type { VectorSearchError } from "../domain/errors";
import type { TalentId } from "../domain/models/ids";
import type { Vector } from "../domain/models/vector";

export interface VectorCandidate {
  readonly similarity: number;
  readonly talentId: TalentId;
}

export class VectorSearchPort extends Context.Tag("@recruit/VectorSearchPort")<
  VectorSearchPort,
  {
    readonly search: (
      vector: Vector,
      topK: number
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;
  }
>() {}
