-- Every daily health number from Apple Health / Oura (one row per metric,
-- day and source), plus device-recorded workouts. Idempotent.

CREATE TABLE IF NOT EXISTS "health_metric_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "metric" varchar(60) NOT NULL,
  "value" real NOT NULL,
  "unit" varchar(20),
  "source" varchar(30) NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "health_metric_daily_unique_idx"
  ON "health_metric_daily" ("client_id", "date", "metric", "source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_metric_daily_client_metric_idx"
  ON "health_metric_daily" ("client_id", "metric", "date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_workouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "source" varchar(30) NOT NULL,
  "external_id" varchar(80) NOT NULL,
  "activity" varchar(60) NOT NULL,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp NOT NULL,
  "duration_min" real,
  "energy_kcal" real,
  "distance_m" real,
  "avg_hr" real,
  "max_hr" real
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "health_workouts_unique_idx"
  ON "health_workouts" ("client_id", "source", "external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_workouts_client_start_idx"
  ON "health_workouts" ("client_id", "start_at");
