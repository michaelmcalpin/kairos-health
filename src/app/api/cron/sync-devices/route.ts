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
import { logger } from "@/lib/middleware/logger";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

/** Per-connection timeout: 30 seconds. Prevents a single slow provider from consuming the entire cron window. */
const CONNECTION_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms syncing ${label}`)), ms),
    ),
  ]);
}

export async function GET(req: Request) {
  // Verify cron secret — REQUIRED in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV === "production") {
    logger.error("cron", "CRON_SECRET not configured in production — rejecting request");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("cron", "Unauthorized cron request");
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

    logger.info("cron", `Found ${connectionsToSync.length} connections to sync`);

    // Process each connection
    for (const conn of connectionsToSync) {
      try {
        const syncLabel = `${conn.provider}:${conn.id}`;

        // Check and refresh token if needed
        if (syncEngine.isTokenExpired(conn)) {
          logger.info("cron", `Refreshing token for ${conn.provider}`, { connectionId: conn.id });
          await withTimeout(syncEngine.refreshToken(conn), CONNECTION_TIMEOUT_MS, syncLabel);
        }

        // Run sync with per-connection timeout
        const syncResults = await withTimeout(
          syncEngine.syncConnection(conn),
          CONNECTION_TIMEOUT_MS,
          syncLabel,
        );
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
        logger.error("cron", `Failed to sync ${conn.provider}`, { connectionId: conn.id, error: errorMsg });
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

    logger.info("cron", "Sync complete", {
      connections: connectionsToSync.length,
      totalRecords: totalSynced,
      totalErrors,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      connections: connectionsToSync.length,
      totalRecords: totalSynced,
      totalErrors,
      durationMs,
      results,
    });
  } catch (err) {
    logger.error("cron", "Sync devices failed", { error: err instanceof Error ? err.message : "Unknown error" });
    return NextResponse.json(
      { error: "Sync failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
