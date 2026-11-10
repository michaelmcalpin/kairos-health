-- UX audit fixes (Nov 2026). Idempotent.

-- C1: record who uploaded each clinical document.
ALTER TABLE "clinical_documents" ADD COLUMN IF NOT EXISTS "uploaded_by" uuid REFERENCES "users"("id");
--> statement-breakpoint

-- D2: Apple Health stored body fat as a 0–1 fraction (0.20 shown as "0.2%").
-- Values at or below 1 are fractions; convert to percent. Safe to re-run.
UPDATE "body_measurements" SET "body_fat_pct" = "body_fat_pct" * 100
  WHERE "body_fat_pct" > 0 AND "body_fat_pct" <= 1;
--> statement-breakpoint

-- D1: clear impossible sleep durations (> 14 h), created by adding up
-- overlapping samples from several apps. The row (and any score) is kept;
-- the next sync writes the correct duration.
UPDATE "sleep_sessions" SET "total_minutes" = NULL WHERE "total_minutes" > 840;
--> statement-breakpoint

-- D5: "Lose 10 Pounds" goals were saved with an absolute target of 10 lb.
-- Re-point their milestones first (keep each milestone's share of the way),
-- then set target = start − 10. Only touches goals whose target is clearly a
-- loss amount (< half the start weight). Safe to re-run.
UPDATE "goal_milestones" m SET "target_value" =
  g."start_value" - ((g."start_value" - m."target_value") / NULLIF(g."start_value" - g."target_value", 0)) * g."target_value"
FROM "health_goals" g
WHERE m."goal_id" = g."id" AND g."title" ILIKE 'Lose % Pounds' AND g."target_direction" = 'decrease'
  AND g."target_value" < g."start_value" * 0.5;
--> statement-breakpoint
UPDATE "health_goals" SET "target_value" = "start_value" - "target_value"
WHERE "title" ILIKE 'Lose % Pounds' AND "target_direction" = 'decrease' AND "target_value" < "start_value" * 0.5;
--> statement-breakpoint

-- Labs: orders marked "results received" with no parsed markers are really
-- still being processed (uploaded PDF / URL import awaiting review).
UPDATE "lab_orders" o SET "status" = 'processing'
WHERE o."status" = 'results_received' AND NOT EXISTS (
  SELECT 1 FROM "lab_results" r JOIN "biomarker_values" b ON b."result_id" = r."id" WHERE r."order_id" = o."id"
);
--> statement-breakpoint

-- Labs: "normal" was assumed when no reference range existed. Clear it.
UPDATE "biomarker_values" SET "status" = NULL
WHERE "status" = 'normal' AND "ref_low" IS NULL AND "ref_high" IS NULL;
