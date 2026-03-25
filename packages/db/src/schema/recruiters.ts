import { pgTable, text } from "drizzle-orm/pg-core";

export const recruiters = pgTable("recruiters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});
