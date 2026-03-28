import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const jobDescriptions = pgTable("job_descriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  rawText: text("raw_text").notNull(),
  summary: text("summary").notNull(),
  roleTitle: text("role_title").notNull(),
  skills: text("skills").array().notNull(),
  keywords: text("keywords").array().notNull(),
  seniority: text("seniority").notNull(),
  employmentType: text("employment_type").notNull(),
  workMode: text("work_mode").notNull(),
  location: text("location").notNull(),
  willingToSponsorRelocation: boolean(
    "willing_to_sponsor_relocation"
  ).notNull(),
  experienceYearsMin: integer("experience_years_min").notNull(),
  experienceYearsMax: integer("experience_years_max").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
});
