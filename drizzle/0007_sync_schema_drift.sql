-- Sync schema drift: additive columns/tables that `drizzle-kit push` failed to
-- apply on the deployed database. Written idempotently so it is safe to run
-- against databases in any partial state.

ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "coach_add_code" varchar(24);--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "feature_toggles" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "client_profiles_coach_add_code_unique" ON "client_profiles" ("coach_add_code");--> statement-breakpoint

ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "lean_mass_lbs" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "bmi" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "waist_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "chest_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "hips_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "right_bicep_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "left_bicep_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "right_thigh_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "left_thigh_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "right_calf_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "left_calf_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "neck_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "shoulders_inches" real;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

ALTER TABLE "activity_summaries" ADD COLUMN IF NOT EXISTS "distance_meters" real;--> statement-breakpoint
ALTER TABLE "activity_summaries" ADD COLUMN IF NOT EXISTS "flights_climbed" integer;--> statement-breakpoint
ALTER TABLE "activity_summaries" ADD COLUMN IF NOT EXISTS "exercise_minutes" integer;--> statement-breakpoint
ALTER TABLE "activity_summaries" ADD COLUMN IF NOT EXISTS "stand_hours" integer;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "vitals_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(20),
	"source" varchar(30) DEFAULT 'manual',
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vitals_client_type_ts_idx" ON "vitals_readings" ("client_id","type","recorded_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "daily_checklist_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"item_key" varchar(160) NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_checklist_client_date_idx" ON "daily_checklist_completions" ("client_id","date");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "client_daily_advice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid,
	"date" date,
	"message" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_daily_advice_idx" ON "client_daily_advice" ("client_id","date");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "client_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid,
	"title" varchar(255) NOT NULL,
	"notes" text,
	"due_date" date,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_tasks_client_idx" ON "client_tasks" ("client_id");
