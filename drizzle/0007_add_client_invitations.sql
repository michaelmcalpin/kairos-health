-- Add client_invitations table for trainer-to-client invite flow
CREATE TABLE IF NOT EXISTS "client_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_id" uuid NOT NULL REFERENCES "users"("id"),
  "email" varchar(255) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "tier" "tier" NOT NULL DEFAULT 'tier3',
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp,
  "accepted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "ci_trainer_idx" ON "client_invitations" ("trainer_id");
CREATE INDEX IF NOT EXISTS "ci_email_idx" ON "client_invitations" ("email");
