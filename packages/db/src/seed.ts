/**
 * Seed script for POC demo data.
 * Inserts a default organization and recruiter.
 *
 * Usage: bun run with-env bun src/seed.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { organizations } from "./schema/organizations";
import { recruiters } from "./schema/recruiters";

const SEED_ORGANIZATION = {
  id: "c24787a7-5cb3-43e4-bc33-871cff23a407",
  name: "Demo Corp",
  industry: "Technology",
};

const SEED_RECRUITER = {
  id: "a7c73f63-1276-48ba-8eea-cf43c2bccc19",
  name: "Demo Recruiter",
  email: "recruiter@demo.local",
};

const main = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url);
  const db = drizzle({ client: sql });

  console.log("Seeding organization:", SEED_ORGANIZATION.name);
  await db
    .insert(organizations)
    .values(SEED_ORGANIZATION)
    .onConflictDoNothing();

  console.log("Seeding recruiter:", SEED_RECRUITER.name);
  await db.insert(recruiters).values(SEED_RECRUITER).onConflictDoNothing();

  console.log("Seed complete.");
  await sql.end();
};

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
