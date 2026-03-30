/**
 * Truncate all tables (cascade) so seed scripts start fresh.
 *
 * Usage: bun run db:reset
 */

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const TABLES = [
  "talents",
  "job_descriptions",
  "recruiters",
  "organizations",
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url);
  const db = drizzle({ client });

  console.log("Truncating all tables...");
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} CASCADE`));
  console.log("Done — all tables empty.");

  await client.end();
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
