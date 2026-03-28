import { Schema } from "effect";

/**
 * System-wide embedding vector size. All embedding adapters must produce
 * vectors of this length. Changing this value requires a DB migration.
 */
export const EMBEDDING_DIMENSIONS = 3072;

export const Vector = Schema.Array(Schema.Number);
export type Vector = typeof Vector.Type;
