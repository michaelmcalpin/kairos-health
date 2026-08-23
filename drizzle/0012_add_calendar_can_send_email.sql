-- Track whether a coach's Google OAuth grant included the gmail.send scope.
-- When true, the app sends the coach's client-facing emails FROM their own
-- Gmail; when false (default), it falls back to the system email sender.
-- Existing connections default to false until the coach reconnects and grants
-- the scope (see src/lib/integrations/google-calendar.ts GOOGLE_SCOPES).
ALTER TABLE "calendar_connections"
  ADD COLUMN IF NOT EXISTS "can_send_email" boolean NOT NULL DEFAULT false;
