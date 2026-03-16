CREATE TYPE "public"."alert_priority" AS ENUM('urgent', 'action', 'info');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'acknowledged', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."device_provider" AS ENUM('oura', 'apple_health', 'dexcom', 'garmin', 'whoop', 'withings');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('connected', 'disconnected', 'error', 'syncing');--> statement-breakpoint
CREATE TYPE "public"."fasting_type" AS ENUM('16_8', '20_4', '36hr', 'omad', 'custom');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."protocol_item_category" AS ENUM('supplement', 'medication', 'peptide', 'injection');--> statement-breakpoint
CREATE TYPE "public"."protocol_status" AS ENUM('active', 'proposed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('tier1', 'tier2', 'tier3');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'accepted', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'coach', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'onboarding');--> statement-breakpoint
CREATE TABLE "activity_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"steps" integer,
	"calories_active" integer,
	"exercise_minutes" integer,
	"stand_hours" integer,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "adherence_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"protocol_item_id" uuid NOT NULL,
	"date" date NOT NULL,
	"taken_at" timestamp,
	"skipped" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ai_coaching_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"model" varchar(100),
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"action_taken" varchar(100),
	"started_at" timestamp,
	"completed_at" timestamp,
	"follow_up_result" jsonb
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"priority" "alert_priority" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"data" jsonb,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(255),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomarker_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"default_ref_low" real,
	"default_ref_high" real,
	"unit" varchar(50),
	"description" text,
	CONSTRAINT "biomarker_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "biomarker_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"biomarker_code" varchar(50) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(50),
	"ref_low" real,
	"ref_high" real,
	"status" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_lbs" real,
	"body_fat_pct" real,
	"waist_inches" real,
	"chest_inches" real,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "tier" DEFAULT 'tier3' NOT NULL,
	"date_of_birth" date,
	"gender" varchar(20),
	"height_inches" real,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"onboarding_step" integer DEFAULT 1,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "client_transfers" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"from_coach_id" uuid NOT NULL,
	"to_coach_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"revenue_share_pct" real DEFAULT 25,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "client_workout_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "coach_client_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"transferred_from" uuid
);
--> statement-breakpoint
CREATE TABLE "coach_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"specialties" jsonb DEFAULT '[]'::jsonb,
	"credentials" jsonb DEFAULT '[]'::jsonb,
	"capacity" integer DEFAULT 25,
	"marketplace_visible" boolean DEFAULT false,
	"accepting_clients" boolean DEFAULT true,
	"monthly_rate" numeric(10, 2),
	"packages" jsonb,
	"rating" real DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coach_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "coach_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"coach_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid,
	"client_id" uuid NOT NULL,
	"is_ai_coach" boolean DEFAULT false,
	"last_message_at" timestamp,
	"unread_count_coach" integer DEFAULT 0,
	"unread_count_client" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight" real,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"fiber_g" real,
	"water_oz" real,
	"training_type" varchar(50),
	"stress" integer,
	"hunger" integer,
	"energy" integer,
	"sleep_quality" integer,
	"bm_count" integer,
	"deviations" text,
	"notes" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"provider" "device_provider" NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"scopes" jsonb,
	"status" "device_status" DEFAULT 'disconnected' NOT NULL,
	"last_sync_at" timestamp,
	"token_expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "exercise_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"muscle_groups" jsonb DEFAULT '[]'::jsonb,
	"equipment" jsonb DEFAULT '[]'::jsonb,
	"video_url" text,
	"instructions" text,
	"is_custom" boolean DEFAULT false,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "fasting_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"completed" boolean DEFAULT false,
	"metabolic_zones" jsonb
);
--> statement-breakpoint
CREATE TABLE "fasting_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid,
	"is_ai_generated" boolean DEFAULT false,
	"type" "fasting_type" NOT NULL,
	"feeding_start_hour" integer,
	"feeding_end_hour" integer,
	"active_days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_database" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"brand" varchar(255),
	"barcode" varchar(50),
	"serving_size" varchar(100),
	"calories" real,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"fiber_g" real,
	"micronutrients" jsonb,
	"source" varchar(50) DEFAULT 'usda',
	"verified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "glucose_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"value_mgdl" real NOT NULL,
	"source" varchar(50) DEFAULT 'dexcom',
	"trend_direction" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "glycemic_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"meal_log_id" uuid NOT NULL,
	"peak_glucose" real,
	"time_to_peak_minutes" integer,
	"area_under_curve" real,
	"baseline" real
);
--> statement-breakpoint
CREATE TABLE "heart_rate_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"bpm" integer NOT NULL,
	"source" varchar(50),
	"activity_context" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hrv_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"rmssd" real NOT NULL,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "injection_site_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"protocol_item_id" uuid NOT NULL,
	"date" date NOT NULL,
	"site_code" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ketone_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"value_mmol" real NOT NULL,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid,
	"provider" varchar(50),
	"panel_name" varchar(255),
	"status" varchar(50) DEFAULT 'ordered',
	"ordered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"client_id" uuid NOT NULL,
	"received_at" timestamp DEFAULT now(),
	"pdf_url" text,
	"ocr_status" varchar(50) DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"items" jsonb,
	"photo_url" text,
	"total_calories" real,
	"total_protein" real,
	"total_carbs" real,
	"total_fat" real,
	"total_fiber" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid,
	"client_id" uuid NOT NULL,
	"is_ai_generated" boolean DEFAULT false,
	"name" varchar(255) NOT NULL,
	"meals" jsonb,
	"macro_targets" jsonb,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"items" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid,
	"is_ai_message" boolean DEFAULT false,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"photo_urls" jsonb,
	"pose_type" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "protocol_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "protocol_item_category" NOT NULL,
	"dosage" varchar(100),
	"unit" varchar(50),
	"form" varchar(50),
	"route" varchar(50),
	"frequency" varchar(50),
	"time_of_day" varchar(50),
	"injection_sites" jsonb,
	"rationale" text,
	"coach_notes" text
);
--> statement-breakpoint
CREATE TABLE "sleep_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"total_minutes" integer,
	"deep_minutes" integer,
	"rem_minutes" integer,
	"light_minutes" integer,
	"awake_minutes" integer,
	"score" integer,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "tier",
	"stripe_subscription_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplement_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid,
	"is_ai_generated" boolean DEFAULT false,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "protocol_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"responses" jsonb,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_connection_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"records_synced" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'in_progress',
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "temperature_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"temp_deviation" real NOT NULL,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"avatar_url" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"status" "user_status" DEFAULT 'onboarding' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"session_id" uuid,
	"date" date NOT NULL,
	"exercises_completed" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workout_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid,
	"is_ai_generated" boolean DEFAULT false,
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration_weeks" integer,
	"schedule" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"name" varchar(255),
	"exercises" jsonb
);
--> statement-breakpoint
ALTER TABLE "activity_summaries" ADD CONSTRAINT "activity_summaries_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adherence_logs" ADD CONSTRAINT "adherence_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adherence_logs" ADD CONSTRAINT "adherence_logs_protocol_item_id_protocol_items_id_fk" FOREIGN KEY ("protocol_item_id") REFERENCES "public"."protocol_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_coaching_sessions" ADD CONSTRAINT "ai_coaching_sessions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_responses" ADD CONSTRAINT "alert_responses_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_responses" ADD CONSTRAINT "alert_responses_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomarker_values" ADD CONSTRAINT "biomarker_values_result_id_lab_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."lab_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transfers" ADD CONSTRAINT "client_transfers_from_coach_id_users_id_fk" FOREIGN KEY ("from_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transfers" ADD CONSTRAINT "client_transfers_to_coach_id_users_id_fk" FOREIGN KEY ("to_coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transfers" ADD CONSTRAINT "client_transfers_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_program_id_workout_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."workout_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_client_relationships" ADD CONSTRAINT "coach_client_relationships_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_client_relationships" ADD CONSTRAINT "coach_client_relationships_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_reviews" ADD CONSTRAINT "coach_reviews_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_reviews" ADD CONSTRAINT "coach_reviews_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_library" ADD CONSTRAINT "exercise_library_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fasting_logs" ADD CONSTRAINT "fasting_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fasting_protocols" ADD CONSTRAINT "fasting_protocols_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fasting_protocols" ADD CONSTRAINT "fasting_protocols_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glycemic_responses" ADD CONSTRAINT "glycemic_responses_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glycemic_responses" ADD CONSTRAINT "glycemic_responses_meal_log_id_meal_logs_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart_rate_readings" ADD CONSTRAINT "heart_rate_readings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrv_readings" ADD CONSTRAINT "hrv_readings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_site_logs" ADD CONSTRAINT "injection_site_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_site_logs" ADD CONSTRAINT "injection_site_logs_protocol_item_id_protocol_items_id_fk" FOREIGN KEY ("protocol_item_id") REFERENCES "public"."protocol_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ketone_readings" ADD CONSTRAINT "ketone_readings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_order_id_lab_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."lab_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_items" ADD CONSTRAINT "protocol_items_protocol_id_supplement_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."supplement_protocols"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_protocols" ADD CONSTRAINT "supplement_protocols_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_protocols" ADD CONSTRAINT "supplement_protocols_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_assessments" ADD CONSTRAINT "symptom_assessments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_device_connection_id_device_connections_id_fk" FOREIGN KEY ("device_connection_id") REFERENCES "public"."device_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temperature_readings" ADD CONSTRAINT "temperature_readings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_programs" ADD CONSTRAINT "workout_programs_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_id_workout_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."workout_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_client_date_idx" ON "activity_summaries" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "adherence_client_date_idx" ON "adherence_logs" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "alert_client_status_idx" ON "alerts" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ccr_coach_idx" ON "coach_client_relationships" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "ccr_client_idx" ON "coach_client_relationships" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "checkin_client_date_idx" ON "daily_checkins" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "device_client_provider_idx" ON "device_connections" USING btree ("client_id","provider");--> statement-breakpoint
CREATE INDEX "fasting_client_date_idx" ON "fasting_logs" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "food_barcode_idx" ON "food_database" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "glucose_client_ts_idx" ON "glucose_readings" USING btree ("client_id","timestamp");--> statement-breakpoint
CREATE INDEX "hr_client_ts_idx" ON "heart_rate_readings" USING btree ("client_id","timestamp");--> statement-breakpoint
CREATE INDEX "hrv_client_ts_idx" ON "hrv_readings" USING btree ("client_id","timestamp");--> statement-breakpoint
CREATE INDEX "meal_client_date_idx" ON "meal_logs" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "msg_conv_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "sleep_client_date_idx" ON "sleep_sessions" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "users_clerk_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "workout_log_client_idx" ON "workout_logs" USING btree ("client_id","date");