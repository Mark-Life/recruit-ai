import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  vector,
} from "drizzle-orm/pg-core";
import { recruiters } from "./recruiters";

export const talents = pgTable(
  "talents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    skills: text("skills").array().notNull(),
    keywords: text("keywords").array().notNull(),
    experienceYears: integer("experience_years").notNull(),
    location: text("location").notNull(),
    workModes: text("work_modes").array().notNull(),
    willingToRelocate: boolean("willing_to_relocate").notNull(),
    recruiterId: text("recruiter_id")
      .notNull()
      .references(() => recruiters.id),
    status: text("status").notNull().default("uploaded"),
    createdAt: text("created_at").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [index("talents_recruiter_id_idx").on(table.recruiterId)]
);
