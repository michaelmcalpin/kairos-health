/**
 * KAIROS Cron: Sync Devices
 *
 * This endpoint is called by Vercel Cron (or external scheduler)
 * to sync data from all connected devices on a regular interval.
 *
 * Vercel Cron config (add to vercel.json):
 * { "crons": [{ "path": "/api/cron/sync-devices", "schedule": "every 15 min" }] }
 */

import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { deviceConnections } from "@/server/db/schema";
import { eq, and, lt, or } from "drizzle-orm";
import { syncEngine } from "@/lib/integrations/devices/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{ provider: string; userId: string; records: number; errors: string[] }> = [];

  try {
    // Find all active connections that need syncing
    // Sync connections that haven't been synced in the last 14 minutes
    const staleThreshold = new Date(Date.now() - 14 * 60 * 1000);

    const connectionsToSync = await db.query.deviceConnections.findMany({
      where: and(
        eq(deviceConnections.status, "connected"),
        or(
          lt(deviceConnections.lastSyncAt, staleThreshold),
          eq(deviceConnections.lastSyncAt, null as unknown as Date),
        ),
      ),
    });

    console.log(`[Cron] Found ${connectionsToSync.length} connections to sync`);

    // Process each connection
    for (const conn of connectionsToSync) {
      try {
        // Check and refresh token if needed
        if (syncEngine.isTokenExpired(conn)) {
          console.log(`[Cron] Refreshing token for ${conn.provider} (${conn.id})`);
          await syncEngine.refreshToken(conn);
        }

        // Run sync
        const syncResults = await syncEngine.syncConnection(conn);
        const totalRecords = syncResults.reduce(
          (sum, r) => sum + r.recordsInserted + r.recordsUpdated,
          0,
        );
        const syncErrors = syncResults.flatMap((r) => r.errors);

        results.push({
          provider: conn.provider,
          userId: conn.clientId,
          records: totalRecords,
          errors: syncErrors,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Cron] Failed to sync ${conn.provider} (${conn.id}):`, errorMsg);
        results.push({
          provider: conn.provider,
          userId: conn.clientId,
          records: 0,
          errors: [errorMsg],
        });
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.records, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const durationMs = Date.now() - startTime;

    console.log(
      `[Cron] Sync complete: ${connectionsToSync.length} connections, ${totalSynced} records, ${totalErrors} errors, ${durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      connections: connectionsToSync.length,
      totalRecords: totalSynced,
      totalErrors,
      durationMs,
      results,
    });
  } catch (err) {
    console.error("[Cron] Sync devices failed:", err);
    return NextResponse.json(
      { error: "Sync failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
