CREATE TABLE "job_descriptions" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"raw_text" text NOT NULL,
	"summary" text NOT NULL,
	"role_title" text NOT NULL,
	"skills" text[] NOT NULL,
	"keywords" text[] NOT NULL,
	"seniority" text NOT NULL,
	"employment_type" text NOT NULL,
	"work_mode" text NOT NULL,
	"location" text NOT NULL,
	"willing_to_sponsor_relocation" boolean NOT NULL,
	"experience_years_min" integer NOT NULL,
	"experience_years_max" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY,
	"job_description_id" text NOT NULL,
	"talent_id" text NOT NULL,
	"recruiter_id" text NOT NULL,
	"total_score" real NOT NULL,
	"semantic_similarity" real NOT NULL,
	"keyword_overlap" real NOT NULL,
	"experience_fit" real NOT NULL,
	"constraint_fit" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"industry" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruiters" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talents" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"skills" text[] NOT NULL,
	"keywords" text[] NOT NULL,
	"experience_years" integer NOT NULL,
	"location" text NOT NULL,
	"work_modes" text[] NOT NULL,
	"willing_to_relocate" boolean NOT NULL,
	"recruiter_id" text NOT NULL,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE INDEX "talents_recruiter_id_idx" ON "talents" ("recruiter_id");--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_job_description_id_job_descriptions_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_talent_id_talents_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "talents"("id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_recruiter_id_recruiters_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id");--> statement-breakpoint
ALTER TABLE "talents" ADD CONSTRAINT "talents_recruiter_id_recruiters_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id");