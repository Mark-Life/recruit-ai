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
  id: "org-seed-1",
  name: "Demo Corp",
  industry: "Technology",
};

const SEED_RECRUITER = {
  id: "rec-seed-1",
  name: "Demo Recruiter",
  email: "recruiter@demo.local",
};

async function main() {
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
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
