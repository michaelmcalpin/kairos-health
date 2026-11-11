-- Labs review-and-release (H5). Idempotent.
--
-- A lab result is visible to the client only once a coach releases it
-- (released_at). The coach can confirm units, flag values and add a note
-- (coach_note) shown to the client with the release.
--
-- Backfill: every result that exists when the columns are first added is
-- marked released (and reviewed) as of its received date, so nothing that
-- clients can see today disappears. The backfill runs only in the same block
-- that creates released_at, so re-running this file never releases results
-- that arrived later and are waiting for review.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lab_results' AND column_name = 'released_at'
  ) THEN
    ALTER TABLE "lab_results" ADD COLUMN "released_at" timestamp;
    ALTER TABLE "lab_results" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
    UPDATE "lab_results"
      SET "released_at" = COALESCE("received_at", now()),
          "reviewed_at" = COALESCE("received_at", now());
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN IF NOT EXISTS "coach_note" text;
--> statement-breakpoint
ALTER TABLE "biomarker_values" ADD COLUMN IF NOT EXISTS "flagged" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- Coach review queue: unreleased / unreviewed results per client.
CREATE INDEX IF NOT EXISTS "lab_results_client_review_idx" ON "lab_results" ("client_id", "released_at", "reviewed_at");
