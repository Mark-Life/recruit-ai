ALTER TABLE "job_descriptions" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "created_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "status" text DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "created_at" text NOT NULL;