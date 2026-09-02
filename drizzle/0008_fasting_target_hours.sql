-- Dedicated total-fast-length column so extended fasts (24/36/48/72h) keep a
-- distinct identity instead of encoding it in feeding_end_hour. Idempotent.
ALTER TABLE "fasting_protocols" ADD COLUMN IF NOT EXISTS "target_hours" integer;
