-- Sprint 56: Add notifications & notification preferences tables

DO $$ BEGIN
  CREATE TYPE "public"."notif_category" AS ENUM('health_alert', 'insight', 'weekly_report', 'coach_message', 'appointment', 'lab_result', 'supplement', 'fasting', 'streak', 'billing', 'system', 'onboarding');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notif_priority" AS ENUM('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category" "notif_category" NOT NULL,
  "priority" "notif_priority" DEFAULT 'normal' NOT NULL,
  "title" varchar(500) NOT NULL,
  "body" text NOT NULL,
  "action_url" varchar(500),
  "action_label" varchar(100),
  "metadata" jsonb,
  "channels" jsonb DEFAULT '[]'::jsonb,
  "delivery_status" jsonb DEFAULT '{}'::jsonb,
  "read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "quiet_hours_start" varchar(5),
  "quiet_hours_end" varchar(5),
  "categories" jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "notif_user_created_idx" ON "notifications" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "notif_user_read_idx" ON "notifications" USING btree ("user_id","read");
