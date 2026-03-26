import { VectorSearchError } from "@workspace/core/domain/errors";
import type { TalentId } from "@workspace/core/domain/models/ids";
import type { Vector } from "@workspace/core/domain/models/vector";
import { VectorSearchPort } from "@workspace/core/ports/vector-search-port";
import { sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { DrizzleClient } from "../client";

interface VectorSearchRow extends Record<string, unknown> {
  id: string;
  similarity: number;
}

export const VectorSearchPostgresLayer = Layer.effect(
  VectorSearchPort,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return VectorSearchPort.of({
      search: (vector: Vector, topK: number) =>
        Effect.gen(function* () {
          const vectorStr = `[${vector.join(",")}]`;

          const rows = yield* Effect.tryPromise({
            try: () =>
              db.execute<VectorSearchRow>(sql`
                SELECT
                  id,
                  1 - (embedding <=> ${vectorStr}::vector) AS similarity
                FROM talents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> ${vectorStr}::vector
                LIMIT ${topK}
              `),
            catch: (error) =>
              new VectorSearchError({
                message: "pgvector search query failed",
                cause: error,
              }),
          });

          return rows.map((row) => ({
            talentId: row.id as TalentId,
            similarity: row.similarity,
          }));
        }),
    });
  })
);
