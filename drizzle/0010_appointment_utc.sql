-- Store appointments as an absolute UTC instant so times can be translated into
-- each viewer's timezone (coaches/clients across zones). date+start_time remain
-- the coach-local wall-clock; starts_at is the canonical instant. Idempotent.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "starts_at" timestamptz;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "booking_timezone" varchar(64);

-- Backfill the booking timezone from the coach's saved availability zone,
-- defaulting to Mountain time (the existing app-wide fallback) when unknown.
UPDATE "appointments" a
SET "booking_timezone" = COALESCE(ca."timezone", 'America/Denver')
FROM "coach_availability" ca
WHERE ca."coach_id" = a."coach_id" AND a."booking_timezone" IS NULL;

UPDATE "appointments"
SET "booking_timezone" = 'America/Denver'
WHERE "booking_timezone" IS NULL;

-- Derive the UTC instant from the coach-local wall-clock: interpret
-- (date + start_time) as a wall time in booking_timezone → timestamptz.
UPDATE "appointments"
SET "starts_at" = ((("date"::text || ' ' || "start_time" || ':00')::timestamp)
                    AT TIME ZONE "booking_timezone")
WHERE "starts_at" IS NULL AND "start_time" IS NOT NULL;
