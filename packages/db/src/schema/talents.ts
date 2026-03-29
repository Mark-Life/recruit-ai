import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { recruiters } from "./recruiters";

export const talents = pgTable(
  "talents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    keywords: text("keywords").array().notNull(),
    experienceYears: integer("experience_years").notNull(),
    location: text("location").notNull(),
    workModes: text("work_modes").array().notNull(),
    willingToRelocate: boolean("willing_to_relocate").notNull(),
    recruiterId: text("recruiter_id")
      .notNull()
      .references(() => recruiters.id),
    resumeText: text("resume_text"),
    resumePdfBase64: text("resume_pdf_base64"),
    status: text("status").notNull().default("uploaded"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("talents_recruiter_id_idx").on(table.recruiterId)]
);
