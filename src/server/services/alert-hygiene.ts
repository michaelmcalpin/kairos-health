/**
 * Booking notices ("Follow-Up scheduled") are informational. Once the
 * appointment date has passed (or, for older notices without a date, after
 * 3 days) they resolve themselves so they stop sitting in Needs Attention.
 */
import { sql } from "drizzle-orm";

import type { db as DB } from "@/server/db";

export async function expireSchedulingAlerts(db: typeof DB, clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  await db.execute(sql`
    UPDATE alerts SET status = 'resolved', resolved_at = now()
    WHERE client_id = ANY(${clientIds}) AND type = 'scheduling' AND status = 'active' AND (
      ((data->>'date') ~ '^\\d{4}-\\d{2}-\\d{2}$' AND (data->>'date')::date < current_date)
      OR ((data->>'date') IS NULL AND created_at < now() - interval '3 days')
    )
  `).catch(() => {});
}
