-- Create peptide cycle status enum
DO $$ BEGIN
  CREATE TYPE "peptide_cycle_status" AS ENUM ('planned', 'active', 'completed', 'paused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Peptide Cycles table
CREATE TABLE IF NOT EXISTS "peptide_cycles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "name" varchar(255) NOT NULL,
  "peptide_name" varchar(255) NOT NULL,
  "dosage" varchar(100),
  "unit" varchar(50),
  "frequency" varchar(100),
  "route" varchar(50) DEFAULT 'subcutaneous',
  "injection_sites" jsonb DEFAULT '[]'::jsonb,
  "start_date" date NOT NULL,
  "end_date" date,
  "duration_weeks" integer,
  "status" "peptide_cycle_status" NOT NULL DEFAULT 'planned',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "peptide_cycles_client_idx" ON "peptide_cycles" ("client_id", "status");

-- Peptide Logs table
CREATE TABLE IF NOT EXISTS "peptide_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "cycle_id" uuid REFERENCES "peptide_cycles"("id"),
  "peptide_name" varchar(255) NOT NULL,
  "dosage" varchar(100),
  "unit" varchar(50),
  "date" date NOT NULL,
  "time" varchar(20),
  "injection_site" varchar(100),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "peptide_logs_client_date_idx" ON "peptide_logs" ("client_id", "date");
CREATE INDEX IF NOT EXISTS "peptide_logs_cycle_idx" ON "peptide_logs" ("cycle_id");
