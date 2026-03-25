import { pgTable, real, text } from "drizzle-orm/pg-core";
import { jobDescriptions } from "./job-descriptions";
import { recruiters } from "./recruiters";
import { talents } from "./talents";

export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  jobDescriptionId: text("job_description_id")
    .notNull()
    .references(() => jobDescriptions.id),
  talentId: text("talent_id")
    .notNull()
    .references(() => talents.id),
  recruiterId: text("recruiter_id")
    .notNull()
    .references(() => recruiters.id),
  totalScore: real("total_score").notNull(),
  semanticSimilarity: real("semantic_similarity").notNull(),
  keywordOverlap: real("keyword_overlap").notNull(),
  experienceFit: real("experience_fit").notNull(),
  constraintFit: real("constraint_fit").notNull(),
});
