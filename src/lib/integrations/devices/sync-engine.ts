/**
 * KAIROS Device Sync Engine
 *
 * Orchestrates data synchronization from wearable devices.
 * Handles OAuth token refresh, data normalization, and
 * incremental sync with deduplication.
 */

import type {
  DeviceProvider,
  DeviceConnection,
  SyncResult,
  SyncState,
  DataType,
} from "./types";
import { PROVIDERS } from "./providers";
import { eventBus, createRealtimeEvent } from "@/lib/realtime";

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
   * Execute a sync for a specific provider and data types
   */
  async sync(
    connection: DeviceConnection,
    dataTypes?: DataType[]
  ): Promise<SyncResult[]> {
    const { userId, provider } = connection;
    const providerConfig = PROVIDERS[provider];

    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const typesToSync = dataTypes || providerConfig.dataTypes;
    const results: SyncResult[] = [];

    this.updateState(userId, provider, { status: "syncing" });

    // Notify client that sync started
    eventBus.publish(
      createRealtimeEvent("notification:new", userId, {
        notificationId: `sync_start_${Date.now()}`,
        title: `${providerConfig.name} Sync Started`,
        body: `Syncing ${typesToSync.join(", ")} data...`,
        category: "health" as const,
        read: false,
      })
    );

    const startTime = Date.now();

    for (const dataType of typesToSync) {
      try {
        const result = await this.syncDataType(connection, dataType);
        results.push(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown sync error";
        results.push({
          provider,
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

    const totalRecords = results.reduce((sum, r) => sum + r.recordsInserted + r.recordsUpdated, 0);
    const hasErrors = results.some((r) => r.errors.length > 0);

    this.updateState(userId, provider, {
      status: hasErrors ? "error" : "success",
      lastSyncAt: new Date().toISOString(),
      nextSyncAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next sync in 15 min
      recordsSynced: totalRecords,
      error: hasErrors ? results.flatMap((r) => r.errors).join("; ") : undefined,
    });

    // Notify sync complete
    eventBus.publish(
      createRealtimeEvent("notification:new", userId, {
        notificationId: `sync_done_${Date.now()}`,
        title: `${providerConfig.name} Sync Complete`,
        body: `${totalRecords} records synced${hasErrors ? " (with errors)" : ""}`,
        category: "health" as const,
        read: false,
      })
    );

    return results;
  }

  /**
   * Sync a specific data type — provider-specific implementations
   * In production, each case would call the respective API and
   * normalize the response data.
   */
  private async syncDataType(
    connection: DeviceConnection,
    dataType: DataType
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const syncFrom = connection.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const syncTo = new Date().toISOString();

    // ──────────────────────────────────────────────────────────────
    // PROVIDER-SPECIFIC SYNC LOGIC
    //
    // In production, each case below would:
    // 1. Call the provider's REST API with the connection's access token
    // 2. Parse the response into normalized KAIROS types
    // 3. Upsert into the database with deduplication
    //
    // For now, we return a placeholder result to demonstrate the
    // framework structure. Replace with actual API calls.
    // ──────────────────────────────────────────────────────────────

    const recordCount = Math.floor(Math.random() * 50) + 10; // Placeholder

    return {
      provider: connection.provider,
      dataType,
      recordsProcessed: recordCount,
      recordsInserted: Math.floor(recordCount * 0.8),
      recordsUpdated: Math.floor(recordCount * 0.15),
      recordsSkipped: Math.floor(recordCount * 0.05),
      startDate: syncFrom.slice(0, 10),
      endDate: syncTo.slice(0, 10),
      durationMs: Date.now() - startTime,
      errors: [],
    };
  }

  /**
   * Refresh an expired OAuth token
   */
  async refreshToken(connection: DeviceConnection): Promise<DeviceConnection> {
    const providerConfig = PROVIDERS[connection.provider];
    if (!providerConfig || !providerConfig.tokenUrl) {
      throw new Error(`Token refresh not supported for ${connection.provider}`);
    }

    // In production, this would make a POST to the provider's token endpoint
    // with the refresh_token grant type
    console.log(`[SyncEngine] Token refresh for ${connection.provider} (user: ${connection.userId})`);

    // Placeholder — return connection as-is
    return {
      ...connection,
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }
}

// Singleton instance
export const syncEngine = new DeviceSyncEngine();
