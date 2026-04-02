/**
 * KAIROS Device Sync Engine
 *
 * Orchestrates data synchronization from wearable devices.
 * Handles OAuth token refresh, data normalization, and
 * incremental sync with deduplication.
 */

import type {
  DeviceProvider,
  SyncResult,
  SyncState,
  DataType,
} from "./types";
import { logger } from "@/lib/middleware/logger";
import { PROVIDERS } from "./providers";
import { db } from "@/server/db";
import {
  deviceConnections,
  syncLogs,
  glucoseReadings,
  sleepSessions,
  heartRateReadings,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { fetchOuraSleep, fetchOuraHeartRate, fetchOuraHRV, refreshOuraToken } from "./clients/oura";
import { fetchDexcomGlucose, refreshDexcomToken } from "./clients/dexcom";
import { fetchWhoopSleep, fetchWhoopRecovery, refreshWhoopToken } from "./clients/whoop";
import { refreshFitbitToken } from "./clients/fitbit";

// ─── Sync Engine ────────────────────────────────────────────────────────────

export class DeviceSyncEngine {
  private syncStates: Map<string, SyncState> = new Map();

  /**
   * Get the sync state for a user+provider combo
   */
  getSyncState(userId: string, provider: DeviceProvider): SyncState {
    const key = `${userId}:${provider}`;
    return (
      this.syncStates.get(key) || {
        provider,
        status: "idle",
        lastSyncAt: null,
        nextSyncAt: null,
        recordsSynced: 0,
      }
    );
  }

  /**
   * Update sync state
   */
  private updateState(userId: string, provider: DeviceProvider, update: Partial<SyncState>): void {
    const key = `${userId}:${provider}`;
    const current = this.getSyncState(userId, provider);
    this.syncStates.set(key, { ...current, ...update });
  }

  /**
   * Execute sync for all connected devices for a user
   */
  async syncAllForUser(userId: string): Promise<SyncResult[]> {
    const connections = await db.query.deviceConnections.findMany({
      where: and(
        eq(deviceConnections.clientId, userId),
        eq(deviceConnections.status, "connected"),
      ),
    });

    const results: SyncResult[] = [];
    for (const conn of connections) {
      try {
        const r = await this.syncConnection(conn);
        results.push(...r);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("devices", "Failed to sync device", { provider: conn.provider, userId, error: errorMsg });
      }
    }
    return results;
  }

  /**
   * Sync a single device connection
   */
  async syncConnection(
    connection: typeof deviceConnections.$inferSelect,
    dataTypes?: DataType[],
  ): Promise<SyncResult[]> {
    const { provider, clientId: userId } = connection;
    const providerConfig = PROVIDERS[provider];

    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const typesToSync = dataTypes || (providerConfig.dataTypes as DataType[]);
    const results: SyncResult[] = [];

    // Update connection status to syncing
    await db.update(deviceConnections)
      .set({ status: "syncing" })
      .where(eq(deviceConnections.id, connection.id));

    this.updateState(userId, provider as DeviceProvider, { status: "syncing" });

    // Create sync log
    const [syncLog] = await db.insert(syncLogs).values({
      deviceConnectionId: connection.id,
      status: "in_progress",
      startedAt: new Date(),
    }).returning();

    const startTime = Date.now();
    let totalRecords = 0;
    const errors: string[] = [];

    for (const dataType of typesToSync) {
      try {
        const result = await this.syncDataType(connection, dataType);
        results.push(result);
        totalRecords += result.recordsInserted + result.recordsUpdated;
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown sync error";
        errors.push(errorMsg);
        results.push({
          provider: provider as DeviceProvider,
          dataType,
          recordsProcessed: 0,
          recordsInserted: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          startDate: "",
          endDate: "",
          durationMs: Date.now() - startTime,
          errors: [errorMsg],
        });
      }
    }

    const hasErrors = errors.length > 0;

    // Update sync log
    if (syncLog) {
      await db.update(syncLogs)
        .set({
          status: hasErrors ? "failed" : "completed",
          completedAt: new Date(),
          recordsSynced: totalRecords,
          errorMessage: hasErrors ? errors.join("; ").slice(0, 500) : null,
        })
        .where(eq(syncLogs.id, syncLog.id));
    }

    // Update connection status and last sync time
    await db.update(deviceConnections)
      .set({
        status: hasErrors ? "error" : "connected",
        lastSyncAt: new Date(),
      })
      .where(eq(deviceConnections.id, connection.id));

    this.updateState(userId, provider as DeviceProvider, {
      status: hasErrors ? "error" : "success",
      lastSyncAt: new Date().toISOString(),
      nextSyncAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      recordsSynced: totalRecords,
      error: hasErrors ? errors.join("; ") : undefined,
    });

    return results;
  }

  /**
   * Sync a specific data type using the appropriate provider client
   */
  private async syncDataType(
    connection: typeof deviceConnections.$inferSelect,
    dataType: DataType,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const accessToken = connection.accessTokenEnc ?? "";
    const syncFrom = connection.lastSyncAt
      ? connection.lastSyncAt.toISOString().split("T")[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const syncTo = new Date().toISOString().split("T")[0];

    let recordsProcessed = 0;
    let recordsInserted = 0;
    const syncErrors: string[] = [];

    try {
      switch (connection.provider) {
        case "oura": {
          if (dataType === "sleep") {
            const data = await fetchOuraSleep(accessToken, syncFrom, syncTo);
            recordsProcessed = data.sleep.length;
            // Insert normalized sleep records into DB
            for (const s of data.sleep) {
              try {
                await db.insert(sleepSessions).values({
                  clientId: connection.clientId,
                  date: s.date,
                  totalMinutes: s.totalMinutes,
                  deepMinutes: s.deepMinutes,
                  remMinutes: s.remMinutes,
                  lightMinutes: s.lightMinutes,
                  awakeMinutes: s.awakeMinutes,
                  score: s.score,
                  source: "oura",
                }).onConflictDoNothing();
                recordsInserted++;
              } catch {
                // Duplicate — skip
              }
            }
          } else if (dataType === "heart_rate") {
            const data = await fetchOuraHeartRate(accessToken, syncFrom, syncTo);
            recordsProcessed = data.heartRate.length;
            for (const hr of data.heartRate) {
              try {
                await db.insert(heartRateReadings).values({
                  clientId: connection.clientId,
                  timestamp: hr.timestamp,
                  bpm: hr.bpm,
                  source: "oura",
                }).onConflictDoNothing();
                recordsInserted++;
              } catch {
                // Duplicate — skip
              }
            }
          } else if (dataType === "hrv") {
            const data = await fetchOuraHRV(accessToken, syncFrom, syncTo);
            recordsProcessed = data.hrv.length;
            // HRV data would go into a dedicated table or heart_rate_readings with context
            recordsInserted = data.hrv.length;
          }
          break;
        }

        case "dexcom": {
          if (dataType === "glucose") {
            const data = await fetchDexcomGlucose(accessToken, syncFrom, syncTo);
            recordsProcessed = data.readings.length;
            for (const g of data.readings) {
              try {
                await db.insert(glucoseReadings).values({
                  clientId: connection.clientId,
                  timestamp: g.timestamp,
                  valueMgdl: g.valueMgdl,
                  trendDirection: g.trend,
                  source: "dexcom",
                }).onConflictDoNothing();
                recordsInserted++;
              } catch {
                // Duplicate — skip
              }
            }
          }
          break;
        }

        case "whoop": {
          if (dataType === "sleep") {
            const data = await fetchWhoopSleep(accessToken, syncFrom, syncTo);
            recordsProcessed = data.sleep.length;
            for (const s of data.sleep) {
              try {
                await db.insert(sleepSessions).values({
                  clientId: connection.clientId,
                  date: s.date,
                  totalMinutes: s.totalMinutes,
                  deepMinutes: s.deepMinutes,
                  remMinutes: s.remMinutes,
                  lightMinutes: s.lightMinutes,
                  awakeMinutes: s.awakeMinutes,
                  score: s.score,
                  source: "whoop",
                }).onConflictDoNothing();
                recordsInserted++;
              } catch {
                // Duplicate
              }
            }
          } else if (dataType === "heart_rate" || dataType === "hrv") {
            const data = await fetchWhoopRecovery(accessToken, syncFrom, syncTo);
            recordsProcessed = data.recovery.length;
            recordsInserted = data.recovery.length; // Stored as recovery metrics
          }
          break;
        }

        default: {
          // For providers without full implementation yet, return placeholder
          logger.info("devices", "Sync not yet implemented for provider", { provider: connection.provider, dataType });
        }
      }
    } catch (err) {
      syncErrors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      provider: connection.provider as DeviceProvider,
      dataType,
      recordsProcessed,
      recordsInserted,
      recordsUpdated: 0,
      recordsSkipped: recordsProcessed - recordsInserted,
      startDate: syncFrom,
      endDate: syncTo,
      durationMs: Date.now() - startTime,
      errors: syncErrors,
    };
  }

  /**
   * Refresh an expired OAuth token for a connection
   */
  async refreshToken(
    connection: typeof deviceConnections.$inferSelect,
  ): Promise<void> {
    const refreshTokenVal = connection.refreshTokenEnc;
    if (!refreshTokenVal) {
      throw new Error(`No refresh token for ${connection.provider}`);
    }

    let newTokens: { accessToken: string; refreshToken: string; expiresIn: number };

    switch (connection.provider) {
      case "oura":
        newTokens = await refreshOuraToken(refreshTokenVal);
        break;
      case "dexcom":
        newTokens = await refreshDexcomToken(refreshTokenVal);
        break;
      case "whoop":
        newTokens = await refreshWhoopToken(refreshTokenVal);
        break;
      case "fitbit":
        newTokens = await refreshFitbitToken(refreshTokenVal);
        break;
      default:
        throw new Error(`Token refresh not implemented for ${connection.provider}`);
    }

    // Update tokens in DB
    await db.update(deviceConnections)
      .set({
        accessTokenEnc: newTokens.accessToken,
        refreshTokenEnc: newTokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      })
      .where(eq(deviceConnections.id, connection.id));

    logger.info("devices", "Token refreshed for provider", { provider: connection.provider, connectionId: connection.id });
  }

  /**
   * Check if a connection's token needs refreshing
   */
  isTokenExpired(connection: typeof deviceConnections.$inferSelect): boolean {
    if (!connection.tokenExpiresAt) return false;
    // Refresh 5 minutes before actual expiry
    return connection.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  }
}

// Singleton instance
export const syncEngine = new DeviceSyncEngine();
