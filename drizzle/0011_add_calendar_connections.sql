-- Add calendar_connections table for coach external calendar integrations
-- (Google Calendar, Calendly-style). Busy times remove conflicting slots.
-- OAuth tokens are encrypted at rest (see src/lib/crypto.ts).
CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coach_id" uuid NOT NULL REFERENCES "users"("id"),
  "provider" varchar(32) NOT NULL DEFAULT 'google',
  "google_email" varchar(255),
  "access_token_enc" text,
  "refresh_token_enc" text,
  "expires_at" timestamp,
  "calendar_id" varchar(255) DEFAULT 'primary',
  "status" varchar(32) NOT NULL DEFAULT 'connected',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_coach_provider_idx" ON "calendar_connections" ("coach_id", "provider");
