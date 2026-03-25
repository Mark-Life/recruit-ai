import { Schema } from "effect";

export const Vector = Schema.Array(Schema.Number);
export type Vector = typeof Vector.Type;
