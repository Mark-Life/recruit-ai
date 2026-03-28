import { env } from "@workspace/env/server";
import { Context, Layer, Redacted } from "effect";

export class DatabaseConfig extends Context.Tag("@recruit/DatabaseConfig")<
  DatabaseConfig,
  {
    readonly url: Redacted.Redacted;
  }
>() {
  static readonly layer = Layer.succeed(
    DatabaseConfig,
    DatabaseConfig.of({ url: Redacted.make(env.DATABASE_URL) })
  );
}
