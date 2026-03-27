import { jsonSchema as aiJsonSchema, type JSONSchema7 } from "ai";
import { Either, JSONSchema, Schema } from "effect";

/**
 * Recursively inlines all `$ref` / `$defs` produced by Effect's JSONSchema.make
 * so that LLM providers (e.g. Gemini) that don't support JSON Schema references
 * still receive the full property definitions.
 */
const inlineRefs = (root: Record<string, unknown>): Record<string, unknown> => {
  const defs = root.$defs as Record<string, unknown> | undefined;

  const resolve = (node: unknown): unknown => {
    if (node === null || typeof node !== "object") {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(resolve);
    }

    const obj = node as Record<string, unknown>;
    if (typeof obj.$ref === "string" && defs) {
      const name = (obj.$ref as string).replace("#/$defs/", "");
      if (defs[name]) {
        return resolve(defs[name]);
      }
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "$defs") {
        continue;
      }
      out[key] = resolve(value);
    }
    return out;
  };

  return resolve(root) as Record<string, unknown>;
};

/**
 * Converts an Effect Schema into an AI SDK Schema by:
 * 1. Generating JSON Schema (draft-07) via Effect's JSONSchema.make
 * 2. Inlining any $ref/$defs so all LLM providers see flat property definitions
 * 3. Creating a validate function via Schema.decodeUnknownEither
 * 4. Wrapping both with AI SDK's jsonSchema() helper
 */
export const toAiSchema = <A, I>(schema: Schema.Schema<A, I, never>) =>
  aiJsonSchema<A>(
    inlineRefs(
      JSONSchema.make(schema) as unknown as Record<string, unknown>
    ) as JSONSchema7,
    {
      validate: (value) => {
        const result = Schema.decodeUnknownEither(schema)(value);
        return Either.isRight(result)
          ? { success: true as const, value: result.right }
          : { success: false as const, error: new Error("Validation failed") };
      },
    }
  );
