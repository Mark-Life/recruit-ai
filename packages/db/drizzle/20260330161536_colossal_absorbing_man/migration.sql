ALTER TABLE "job_descriptions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "talents" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_descriptions_organization_id_idx" ON "job_descriptions" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_descriptions_status_idx" ON "job_descriptions" ("status");