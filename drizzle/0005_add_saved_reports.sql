CREATE TABLE IF NOT EXISTS "saved_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "users"("id"),
  "report_type" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "report_data" jsonb NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "saved_reports_client_idx" ON "saved_reports" ("client_id");
CREATE INDEX IF NOT EXISTS "saved_reports_client_type_idx" ON "saved_reports" ("client_id", "report_type");
