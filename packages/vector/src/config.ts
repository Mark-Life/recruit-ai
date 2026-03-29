import { Context } from "effect";

export class QdrantConfig extends Context.Tag("@recruit/QdrantConfig")<
  QdrantConfig,
  { readonly url: string; readonly apiKey?: string }
>() {}
