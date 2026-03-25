-- Sprint 62: Add coach_notes table for persistent coach notes

CREATE TABLE IF NOT EXISTS "coach_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "coach_id" uuid NOT NULL,
  "content" text NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "coach_notes_client_idx" ON "coach_notes" USING btree ("client_id","created_at");
CREATE INDEX IF NOT EXISTS "coach_notes_coach_idx" ON "coach_notes" USING btree ("coach_id");
