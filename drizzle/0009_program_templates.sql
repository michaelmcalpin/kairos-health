-- Reusable exercise / diet templates a coach builds once and applies to clients
-- (overwriting the client's live plan). Rows stored as jsonb in the same grid
-- shape the per-client bulk editor uses. Idempotent.
CREATE TABLE IF NOT EXISTS "program_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" varchar(20) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "plan_meta" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_templates_trainer_idx"
  ON "program_templates" ("trainer_id", "type");
