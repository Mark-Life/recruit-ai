import { jsonSchema as aiJsonSchema, type JSONSchema7 } from "ai";
import { Either, JSONSchema, Schema } from "effect";

/**
 * Converts an Effect Schema into an AI SDK Schema by:
 * 1. Generating JSON Schema (draft-07) via Effect's JSONSchema.make
 * 2. Creating a validate function via Schema.decodeUnknownEither
 * 3. Wrapping both with AI SDK's jsonSchema() helper
 */
export const toAiSchema = <A, I>(schema: Schema.Schema<A, I, never>) =>
  aiJsonSchema<A>(JSONSchema.make(schema) as JSONSchema7, {
    validate: (value) => {
      const result = Schema.decodeUnknownEither(schema)(value);
      return Either.isRight(result)
        ? { success: true as const, value: result.right }
        : { success: false as const, error: new Error("Validation failed") };
    },
  });
