import { Schema } from "effect";

export const EMBEDDING_DIMENSIONS = 3072;

export const Vector = Schema.Array(Schema.Number);
export type Vector = typeof Vector.Type;
