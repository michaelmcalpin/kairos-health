/**
 * Server-side timezone helpers for appointments.
 *
 * Appointment wall-clock (date + startTime) is entered in the COACH's timezone.
 * We resolve that zone and convert to a canonical UTC instant (`startsAt`) so
 * the appointment can be shown in any viewer's local timezone.
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import { coachAvailability } from "@/server/db/schema";
import { zonedTimeToUtc } from "@/lib/timezone";

// App-wide fallback when a coach hasn't set an availability timezone.
export const DEFAULT_TZ = "America/Denver";

/** The coach's saved IANA availability timezone, or the app default. */
export async function getCoachTimezone(db: Database, coachId: string): Promise<string> {
  try {
    const row = await db.query.coachAvailability.findFirst({
      where: eq(coachAvailability.coachId, coachId),
    });
    return row?.timezone ?? DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

/** UTC instant for a coach-local wall-clock (date "YYYY-MM-DD", time "HH:MM"). */
export function appointmentStartsAt(date: string, startTime: string, timezone: string): Date {
  return zonedTimeToUtc(date, startTime, timezone);
}
