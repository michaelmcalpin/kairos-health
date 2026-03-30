-- Create enums for appointments (safely, skipping if already exists)
DO $$ BEGIN
  CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."meeting_type" AS ENUM('video', 'phone', 'in_person');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."session_type" AS ENUM('initial_consultation', 'follow_up', 'protocol_review', 'lab_review', 'goal_setting', 'ad_hoc');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."blood_sugar_timing" AS ENUM('fasted', '1hr', '2hr', '3hr', '4hr');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- meal_type enum already exists from migration 0000
--> statement-breakpoint

-- Create companies table
CREATE TABLE IF NOT EXISTS "public"."companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL UNIQUE,
	"logo_url" text,
	"brand_color" varchar(7),
	"email_from_name" varchar(255),
	"email_footer" text,
	"website" varchar(500),
	"status" "user_status" NOT NULL DEFAULT 'active',
	"max_trainers" integer DEFAULT 10,
	"max_clients" integer DEFAULT 100,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_slug_idx" ON "public"."companies" ("slug");
--> statement-breakpoint

-- Create appointments table
CREATE TABLE IF NOT EXISTS "public"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_name" varchar(255),
	"client_name" varchar(255),
	"session_type" "session_type" NOT NULL DEFAULT 'follow_up',
	"meeting_type" "meeting_type" NOT NULL DEFAULT 'video',
	"date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5),
	"duration_minutes" integer DEFAULT 60,
	"status" "appointment_status" NOT NULL DEFAULT 'pending',
	"notes" text,
	"cancellation_reason" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_coach_date_idx" ON "public"."appointments" ("coach_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_client_date_idx" ON "public"."appointments" ("client_id","date");
--> statement-breakpoint

-- Create blood_sugar_readings table
CREATE TABLE IF NOT EXISTS "public"."blood_sugar_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"timing" "blood_sugar_timing" NOT NULL,
	"value_mgdl" real NOT NULL,
	"meal_description" text,
	"meal_log_id" uuid,
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bs_client_date_idx" ON "public"."blood_sugar_readings" ("client_id","date");
--> statement-breakpoint

-- Create checkin_priorities table
CREATE TABLE IF NOT EXISTS "public"."checkin_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"priority_sections" jsonb DEFAULT '[]'::jsonb,
	"enabled_sections" jsonb,
	"custom_prompts" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_prio_client_idx" ON "public"."checkin_priorities" ("client_id");
--> statement-breakpoint

-- Create coach_availability table
CREATE TABLE IF NOT EXISTS "public"."coach_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL UNIQUE,
	"weekly_schedule" jsonb,
	"buffer_minutes" integer DEFAULT 15,
	"blocked_dates" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Create cycle_data table
CREATE TABLE IF NOT EXISTS "public"."cycle_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"cycle_length" integer,
	"period_length" integer,
	"flow_intensity" varchar(20),
	"symptoms" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cycle_client_date_idx" ON "public"."cycle_data" ("client_id","start_date");
--> statement-breakpoint

-- Create genetic_markers table
CREATE TABLE IF NOT EXISTS "public"."genetic_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"section" varchar(100),
	"gene" varchar(50) NOT NULL,
	"rs_id" varchar(50),
	"pathway" text,
	"function" text,
	"mutation" text,
	"symptoms" text,
	"supplement_protocol" text,
	"peptide_support" text,
	"diet_strategy" text,
	"lifestyle_strategy" text,
	"lab_tests" text,
	"clinical_priority" varchar(20),
	"created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "genetic_markers_profile_idx" ON "public"."genetic_markers" ("profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "genetic_markers_client_idx" ON "public"."genetic_markers" ("client_id");
--> statement-breakpoint

-- Create genetic_pathway_scores table
CREATE TABLE IF NOT EXISTS "public"."genetic_pathway_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"pathway" varchar(100) NOT NULL,
	"genes_in_pathway" text,
	"genes_affected" integer DEFAULT 0,
	"homozygous_count" integer DEFAULT 0,
	"heterozygous_count" integer DEFAULT 0,
	"priority_level" varchar(20),
	"created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "genetic_pathway_scores_profile_idx" ON "public"."genetic_pathway_scores" ("profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "genetic_pathway_scores_client_idx" ON "public"."genetic_pathway_scores" ("client_id");
--> statement-breakpoint

-- Create genetic_profiles table
CREATE TABLE IF NOT EXISTS "public"."genetic_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"upload_type" varchar(50),
	"source_url" text,
	"source_file_name" varchar(255),
	"raw_data" jsonb,
	"status" varchar(50) NOT NULL DEFAULT 'pending',
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "genetic_profiles_client_idx" ON "public"."genetic_profiles" ("client_id");
--> statement-breakpoint

-- Create meal_photos table
CREATE TABLE IF NOT EXISTS "public"."meal_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"meal_log_id" uuid,
	"checkin_id" uuid,
	"photo_url" text NOT NULL,
	"meal_type" "meal_type",
	"ai_analysis" jsonb,
	"notes" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_photo_client_idx" ON "public"."meal_photos" ("client_id","created_at");
--> statement-breakpoint

-- Create session_notes table
CREATE TABLE IF NOT EXISTS "public"."session_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"summary" text,
	"key_findings" jsonb DEFAULT '[]'::jsonb,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"next_session_focus" text,
	"private_notes" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Add company_id column to users table (references companies)
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "public"."users" ADD CONSTRAINT "users_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_company_idx" ON "public"."users" ("company_id");
--> statement-breakpoint

-- Rename coach_client_relationships to trainer_client_relationships
ALTER TABLE IF EXISTS "public"."coach_client_relationships" RENAME TO "trainer_client_relationships";
--> statement-breakpoint

-- Rename coach_profiles to trainer_profiles
ALTER TABLE IF EXISTS "public"."coach_profiles" RENAME TO "trainer_profiles";
--> statement-breakpoint

-- Rename coach_reviews to trainer_reviews
ALTER TABLE IF EXISTS "public"."coach_reviews" RENAME TO "trainer_reviews";
--> statement-breakpoint

-- Add foreign key constraints for appointments
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_coach_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for blood_sugar_readings
ALTER TABLE "public"."blood_sugar_readings" ADD CONSTRAINT "blood_sugar_readings_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."blood_sugar_readings" ADD CONSTRAINT "blood_sugar_readings_meal_log_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for checkin_priorities
ALTER TABLE "public"."checkin_priorities" ADD CONSTRAINT "checkin_priorities_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."checkin_priorities" ADD CONSTRAINT "checkin_priorities_trainer_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for coach_availability
ALTER TABLE "public"."coach_availability" ADD CONSTRAINT "coach_availability_coach_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for cycle_data
ALTER TABLE "public"."cycle_data" ADD CONSTRAINT "cycle_data_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for genetic_markers
ALTER TABLE "public"."genetic_markers" ADD CONSTRAINT "genetic_markers_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."genetic_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."genetic_markers" ADD CONSTRAINT "genetic_markers_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for genetic_pathway_scores
ALTER TABLE "public"."genetic_pathway_scores" ADD CONSTRAINT "genetic_pathway_scores_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."genetic_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."genetic_pathway_scores" ADD CONSTRAINT "genetic_pathway_scores_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for genetic_profiles
ALTER TABLE "public"."genetic_profiles" ADD CONSTRAINT "genetic_profiles_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for meal_photos
ALTER TABLE "public"."meal_photos" ADD CONSTRAINT "meal_photos_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."meal_photos" ADD CONSTRAINT "meal_photos_meal_log_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."meal_photos" ADD CONSTRAINT "meal_photos_checkin_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."daily_checkins"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add foreign key constraints for session_notes
ALTER TABLE "public"."session_notes" ADD CONSTRAINT "session_notes_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."session_notes" ADD CONSTRAINT "session_notes_coach_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
