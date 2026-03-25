import { Config, Context, Effect, Layer, type Redacted } from "effect";

export class DatabaseConfig extends Context.Tag("@recruit/DatabaseConfig")<
  DatabaseConfig,
  {
    readonly url: Redacted.Redacted;
  }
>() {
  static readonly layer = Layer.effect(
    DatabaseConfig,
    Config.redacted("DATABASE_URL").pipe(
      Effect.map((url) => DatabaseConfig.of({ url }))
    )
  );
}
