/**
 * Rich seed script — populates talents and jobs from CSV/JSON datasets.
 * Inserts raw text only; structured fields use placeholders.
 * LLM extraction + embeddings are a separate batch step.
 *
 * Usage: bun run db:seed:data
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import Papa from "papaparse";
import postgres from "postgres";
import { jobDescriptions } from "./schema/job-descriptions";
import { organizations } from "./schema/organizations";
import { recruiters } from "./schema/recruiters";
import { talents } from "./schema/talents";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATASETS_DIR = resolve(import.meta.dir, "../../../datasets");

/** Deterministic UUID v4-shaped ID from a seed string. Stable across re-runs. */
const seedId = (prefix: string, index: number) => {
  const raw = `${prefix}-${index}`;
  const hash = new Uint8Array(
    new Bun.CryptoHasher("sha256").update(raw).digest().buffer
  );
  const HASH_BYTES = 16;
  const HEX_BASE = 16;
  const HEX_PAD = 2;
  const hex = [...hash.slice(0, HASH_BYTES)]
    .map((b) => b.toString(HEX_BASE).padStart(HEX_PAD, "0"))
    .join("");
  // UUID v4 segment boundaries
  const S1 = 8;
  const S2 = 12;
  const S3 = 13;
  const S4 = 16;
  const S5 = 20;
  const S6 = 32;
  return [
    hex.slice(0, S1),
    hex.slice(S1, S2),
    `4${hex.slice(S3, S4)}`,
    hex.slice(S4, S5),
    hex.slice(S5, S6),
  ].join("-");
};

const RECRUITER_COUNT = 10;
const TALENTS_PER_RECRUITER = 10;
const TOTAL_TALENTS = RECRUITER_COUNT * TALENTS_PER_RECRUITER;
const TOTAL_JOBS = 100;
const BATCH_SIZE = 20;

const SEED_ORG = {
  id: seedId("org", 1),
  name: "Demo Corp",
  industry: "Technology",
};

const RESUME_CATEGORIES = [
  "INFORMATION-TECHNOLOGY",
  "ENGINEERING",
  "FINANCE",
  "HEALTHCARE",
  "HR",
  "SALES",
  "DESIGNER",
  "CONSULTANT",
  "BANKING",
  "TEACHER",
] as const;

// ---------------------------------------------------------------------------
// CSV / JSON helpers
// ---------------------------------------------------------------------------

const readCsv = <T>(path: string): T[] => {
  const text = readFileSync(path, "utf-8");
  const result = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  return result.data;
};

const readJson = <T>(path: string): T[] => {
  return JSON.parse(readFileSync(path, "utf-8")) as T[];
};

// ---------------------------------------------------------------------------
// Dataset types
// ---------------------------------------------------------------------------

interface ResumeRow {
  Category: string;
  ID: string;
  Resume_str: string;
}

interface JdJsonRow {
  ExperienceLevel: string;
  JobID: string;
  Keywords: string[];
  Responsibilities: string[];
  Skills: string[];
  Title: string;
  YearsOfExperience: string;
}

interface MlJobRow {
  company_address_locality: string;
  company_address_region: string;
  company_name: string;
  job_description_text: string;
  job_title: string;
  seniority_level: string;
}

// ---------------------------------------------------------------------------
// Data preparation
// ---------------------------------------------------------------------------

/** Pick N resumes spread evenly across the target categories. */
const pickResumes = (rows: ResumeRow[], total: number): ResumeRow[] => {
  const perCategory = Math.ceil(total / RESUME_CATEGORIES.length);
  const byCategory = new Map<string, ResumeRow[]>();

  for (const row of rows) {
    if (!(RESUME_CATEGORIES as readonly string[]).includes(row.Category)) {
      continue;
    }
    const list = byCategory.get(row.Category) ?? [];
    list.push(row);
    byCategory.set(row.Category, list);
  }

  const picked: ResumeRow[] = [];
  for (const cat of RESUME_CATEGORIES) {
    const pool = byCategory.get(cat) ?? [];
    for (const item of pool.slice(0, perCategory)) {
      if (picked.length >= total) {
        break;
      }
      picked.push(item);
    }
  }

  return picked.slice(0, total);
};

/** Combine adityarajsrv-jd JSON row into a single text block. */
const jdJsonToText = (row: JdJsonRow): string => {
  const skills = Array.isArray(row.Skills) ? row.Skills.join(", ") : row.Skills;
  const responsibilities = Array.isArray(row.Responsibilities)
    ? row.Responsibilities.join("; ")
    : row.Responsibilities;
  return [
    `Title: ${row.Title}`,
    `Experience Level: ${row.ExperienceLevel} (${row.YearsOfExperience} years)`,
    `Skills: ${skills}`,
    `Responsibilities: ${responsibilities}`,
  ].join("\n");
};

/** Combine ivankmk-jd CSV row into a single text block. */
const mlJobToText = (row: MlJobRow): string => {
  const parts = [`Title: ${row.job_title}`];
  if (row.seniority_level) {
    parts.push(`Seniority: ${row.seniority_level}`);
  }
  if (row.company_name) {
    parts.push(`Company: ${row.company_name}`);
  }
  if (row.company_address_locality || row.company_address_region) {
    parts.push(
      `Location: ${[row.company_address_locality, row.company_address_region].filter(Boolean).join(", ")}`
    );
  }
  if (row.job_description_text) {
    parts.push(`\nDescription:\n${row.job_description_text}`);
  }
  return parts.join("\n");
};

// ---------------------------------------------------------------------------
// Seed builders
// ---------------------------------------------------------------------------

const buildRecruiters = () => {
  return Array.from({ length: RECRUITER_COUNT }, (_, i) => ({
    id: seedId("rec", i + 1),
    name: `Recruiter ${i + 1}`,
    email: `recruiter${i + 1}@demo.local`,
  }));
};

const buildTalents = (resumes: ResumeRow[]) => {
  const now = new Date().toISOString();
  return resumes.map((row, i) => ({
    id: seedId("talent", i + 1),
    name: `Candidate ${i + 1}`,
    title: row.Category.replace("-", " ").toLowerCase(),
    keywords: [] as string[],
    experienceYears: 0,
    location: "Unknown",
    workModes: [] as string[],
    willingToRelocate: false,
    recruiterId: seedId("rec", (i % RECRUITER_COUNT) + 1),
    resumeText: row.Resume_str,
    status: "uploaded",
    createdAt: now,
  }));
};

const buildJobs = (jdRows: JdJsonRow[], mlRows: MlJobRow[]) => {
  const now = new Date().toISOString();
  const half = Math.ceil(TOTAL_JOBS / 2);

  const fromJd = jdRows.slice(0, half).map((row, i) => ({
    id: seedId("job", i + 1),
    organizationId: SEED_ORG.id,
    rawText: jdJsonToText(row),
    roleTitle: row.Title || "Unknown",
    summary: "",
    keywords: [] as string[],
    seniority: "mid",
    employmentType: "full-time",
    workMode: "remote",
    location: "Unknown",
    willingToSponsorRelocation: false,
    experienceYearsMin: 0,
    experienceYearsMax: 0,
    status: "draft",
    createdAt: now,
  }));

  const offset = fromJd.length;
  const fromMl = mlRows
    .filter((r) => r.job_title && r.job_description_text)
    .slice(0, TOTAL_JOBS - half)
    .map((row, i) => ({
      id: seedId("job", offset + i + 1),
      organizationId: SEED_ORG.id,
      rawText: mlJobToText(row),
      roleTitle: row.job_title || "Unknown",
      summary: "",
      keywords: [] as string[],
      seniority: "mid",
      employmentType: "full-time",
      workMode: "remote",
      location: "Unknown",
      willingToSponsorRelocation: false,
      experienceYearsMin: 0,
      experienceYearsMax: 0,
      status: "draft",
      createdAt: now,
    }));

  return [...fromJd, ...fromMl];
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  // Load datasets
  console.log("Loading datasets...");
  const resumeRows = readCsv<ResumeRow>(
    resolve(DATASETS_DIR, "snehaanbhawal-resume/Resume/Resume.csv")
  );
  const jdRows = readJson<JdJsonRow>(
    resolve(DATASETS_DIR, "adityarajsrv-jd/job_dataset.json")
  );
  const mlRows = readCsv<MlJobRow>(
    resolve(DATASETS_DIR, "ivankmk-jd/1000_ml_jobs_us.csv")
  );

  console.log(
    `Loaded: ${resumeRows.length} resumes, ${jdRows.length} JDs, ${mlRows.length} ML jobs`
  );

  // Prepare seed data
  const selectedResumes = pickResumes(resumeRows, TOTAL_TALENTS);
  const seedRecruiters = buildRecruiters();
  const seedTalents = buildTalents(selectedResumes);
  const seedJobs = buildJobs(jdRows, mlRows);

  console.log(
    `Prepared: ${seedRecruiters.length} recruiters, ${seedTalents.length} talents, ${seedJobs.length} jobs`
  );

  // Insert
  const sql = postgres(url);
  const db = drizzle({ client: sql });

  console.log("Seeding organization...");
  await db.insert(organizations).values(SEED_ORG).onConflictDoNothing();

  console.log("Seeding recruiters...");
  await db.insert(recruiters).values(seedRecruiters).onConflictDoNothing();

  console.log("Seeding talents...");
  for (const batch of chunk(seedTalents, BATCH_SIZE)) {
    await db.insert(talents).values(batch).onConflictDoNothing();
  }

  console.log("Seeding jobs...");
  for (const batch of chunk(seedJobs, BATCH_SIZE)) {
    await db.insert(jobDescriptions).values(batch).onConflictDoNothing();
  }

  console.log(
    `Seed complete: ${seedRecruiters.length} recruiters, ${seedTalents.length} talents, ${seedJobs.length} jobs`
  );
  await sql.end();
};

/** Split array into chunks of given size. */
const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
