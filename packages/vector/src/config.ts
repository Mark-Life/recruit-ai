import { Context, type Redacted } from "effect";

export class QdrantConfig extends Context.Tag("@recruit/QdrantConfig")<
  QdrantConfig,
  { readonly url: string; readonly apiKey?: Redacted.Redacted }
>() {}
