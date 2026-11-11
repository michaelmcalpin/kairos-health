-- H2 coach Inbox: per-coach state (New → Acknowledged → Resolved) for inbox
-- items without a row of their own (HRV deviation, no device data, message
-- awaiting reply) and for shared-access coaches. Additive and idempotent.
CREATE TABLE IF NOT EXISTS "coach_inbox_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coach_id" uuid NOT NULL REFERENCES "users"("id"),
  "item_key" varchar(200) NOT NULL,
  "state" varchar(20) NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coach_inbox_states_coach_key_idx" ON "coach_inbox_states" ("coach_id", "item_key");
