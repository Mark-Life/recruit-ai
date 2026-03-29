import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Context, Effect, Layer, Redacted } from "effect";
import postgres from "postgres";
import { DatabaseConfig } from "./config/database-config";
import * as schema from "./schema";

export class DrizzleClient extends Context.Tag("@recruit/DrizzleClient")<
  DrizzleClient,
  PostgresJsDatabase<typeof schema>
>() {
  static readonly layer = Layer.scoped(
    DrizzleClient,
    Effect.gen(function* () {
      const config = yield* DatabaseConfig;
      const sql = postgres(Redacted.value(config.url));

      yield* Effect.addFinalizer(() => Effect.promise(() => sql.end()));

      return drizzle({ client: sql, schema, relations: schema.relations });
    })
  );
}
