-- Everist LifeScore: whole-person wellbeing across five dimensions
-- (body, mind, purpose, relationships, work). See docs/lifescore-spec.md.
-- Body is auto-derived from health data; the other four are self-reported.
-- Idempotent.

CREATE TABLE IF NOT EXISTS "lifescore_dimension_checkins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "dimension" varchar(20) NOT NULL,
  "rating" integer,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lifescore_checkin_unique_idx"
  ON "lifescore_dimension_checkins" ("client_id", "date", "dimension");
CREATE INDEX IF NOT EXISTS "lifescore_checkin_client_date_idx"
  ON "lifescore_dimension_checkins" ("client_id", "date");

CREATE TABLE IF NOT EXISTS "lifescore_journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "text" text NOT NULL,
  "themes" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lifescore_journal_client_date_idx"
  ON "lifescore_journal_entries" ("client_id", "date");

CREATE TABLE IF NOT EXISTS "lifescore_weights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "coach_id" uuid REFERENCES "users"("id"),
  "body" integer DEFAULT 20 NOT NULL,
  "mind" integer DEFAULT 20 NOT NULL,
  "purpose" integer DEFAULT 20 NOT NULL,
  "relationships" integer DEFAULT 20 NOT NULL,
  "work" integer DEFAULT 20 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lifescore_weights_client_idx"
  ON "lifescore_weights" ("client_id");

CREATE TABLE IF NOT EXISTS "task_miss_reasons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "item_key" varchar(160) NOT NULL,
  "reason" varchar(40) NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_miss_unique_idx"
  ON "task_miss_reasons" ("client_id", "date", "item_key");
CREATE INDEX IF NOT EXISTS "task_miss_client_date_idx"
  ON "task_miss_reasons" ("client_id", "date");
