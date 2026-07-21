import { z } from "zod";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import {
  deviceConnections,
  syncLogs,
  heartRateReadings,
  hrvReadings,
  glucoseReadings,
  bloodPressureReadings,
  sleepSessions,
  bodyMeasurements,
  activitySummaries,
} from "@/server/db/schema";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { PROVIDERS } from "@/lib/integrations/devices/providers";
import { env } from "@/lib/config/env";
import { syncProviderData } from "@/server/services/device-sync";

/**
 * Sign OAuth state with HMAC to prevent tampering.  Uses CLERK_SECRET_KEY
 * as the signing key (always available in the server context).
 */
function signOAuthState(payload: string): string {
  const secret = env.CLERK_SECRET_KEY || process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CLERK_SECRET_KEY or OAUTH_STATE_SECRET must be set in production");
    }
    return crypto.createHmac("sha256", "dev-only-fallback").update(payload, "utf8").digest("hex");
  }
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

const providerEnum = z.enum(["oura", "apple_health", "dexcom", "garmin", "whoop", "withings", "fitbit", "hume"]);

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientDevicesRouter = router({
  /**
   * List all device connections for the current user
   * Returns: id, provider, status, lastSyncAt, scopes, tokenExpiresAt
   */
  list: clientProcedure.query(async ({ ctx }) => {
    const connections = await safeQ(
      () => ctx.db.query.deviceConnections.findMany({
        where: eq(deviceConnections.clientId, ctx.dbUserId),
        orderBy: desc(deviceConnections.lastSyncAt),
      }),
      [],
    );

    return connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
      scopes: conn.scopes ?? [],
      tokenExpiresAt: conn.tokenExpiresAt?.toISOString() ?? null,
    }));
  }),

  /**
   * Get a specific device connection by provider
   * Input: { provider: string }
   */
  getConnection: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .query(async ({ ctx, input }) => {
      const connection = await safeQ(
        () => ctx.db.query.deviceConnections.findFirst({
          where: and(
            eq(deviceConnections.clientId, ctx.dbUserId),
            eq(deviceConnections.provider, input.provider)
          ),
        }),
        undefined,
      );

      if (!connection) {
        return null;
      }

      return {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        scopes: connection.scopes ?? [],
        tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
      };
    }),

  /**
   * Initiate OAuth connection for a device provider
   * Generates OAuth URL and returns authUrl + provider
   * Input: { provider: string }
   */
  initiateConnect: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .mutation(async ({ ctx, input }) => {
      // Special case: Apple Health uses native HealthKit permissions on device,
      // not OAuth. We just create/update the backend connection record.
      if (input.provider === "apple_health") {
        const existing = await ctx.db.query.deviceConnections.findFirst({
          where: and(
            eq(deviceConnections.clientId, ctx.dbUserId),
            eq(deviceConnections.provider, "apple_health")
          ),
        });

        if (existing) {
          await ctx.db
            .update(deviceConnections)
            .set({ status: "connected" })
            .where(eq(deviceConnections.id, existing.id));
        } else {
          await ctx.db.insert(deviceConnections).values({
            clientId: ctx.dbUserId,
            provider: "apple_health",
            status: "connected",
            scopes: ["read"],
          });
        }

        return { authUrl: null, provider: "apple_health", nativeAuth: true };
      }

      const providerConfig = PROVIDERS[input.provider];
      if (!providerConfig) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Provider ${input.provider} not found` });
      }

      // Get OAuth credentials from typed env
      const providerClientIds: Record<string, string> = {
        oura: env.OURA_CLIENT_ID,
        dexcom: env.DEXCOM_CLIENT_ID,
        whoop: env.WHOOP_CLIENT_ID,
        fitbit: env.FITBIT_CLIENT_ID,
        withings: env.WITHINGS_CLIENT_ID,
        garmin: env.GARMIN_CLIENT_ID,
        hume: env.HUME_CLIENT_ID,
      };
      const clientId = providerClientIds[input.provider] ?? "";

      if (!clientId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Missing OAuth configuration for ${input.provider}. Please set ${input.provider.toUpperCase()}_CLIENT_ID in your environment variables.` });
      }

      // Build redirect URI
      const redirectUri = `${env.APP_URL}/api/callbacks/${input.provider}`;

      // Encode state with userId, provider, and HMAC signature to prevent tampering
      const statePayload = JSON.stringify({
        userId: ctx.dbUserId,
        provider: input.provider,
        timestamp: Date.now(),
      });
      const sig = signOAuthState(statePayload);
      const state = Buffer.from(JSON.stringify({ payload: statePayload, sig })).toString("base64");

      // Build authorization URL
      const authUrl = new URL(providerConfig.oauthUrl);
      authUrl.searchParams.append("client_id", clientId);
      authUrl.searchParams.append("redirect_uri", redirectUri);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("state", state);

      // Add scopes if available
      if (providerConfig.scopes && providerConfig.scopes.length > 0) {
        authUrl.searchParams.append("scope", providerConfig.scopes.join(" "));
      }

      return {
        authUrl: authUrl.toString(),
        provider: input.provider,
      };
    }),

  /**
   * Disconnect a device connection
   * Sets status to "disconnected" and clears tokens
   * Input: { provider: string }
   */
  disconnect: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.query.deviceConnections.findFirst({
        where: and(
          eq(deviceConnections.clientId, ctx.dbUserId),
          eq(deviceConnections.provider, input.provider)
        ),
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Connection for ${input.provider} not found` });
      }

      // Update connection status and clear tokens
      await ctx.db
        .update(deviceConnections)
        .set({
          status: "disconnected",
          accessTokenEnc: null,
          refreshTokenEnc: null,
          tokenExpiresAt: null,
        })
        .where(eq(deviceConnections.id, connection.id));

      return { success: true };
    }),

  /**
   * Trigger a manual sync for a device
   * Fetches data from the provider API and inserts it into the DB
   * Input: { provider: string }
   * Returns: { syncLogId, recordsSynced, success, note?, errors? }
   */
  syncNow: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.query.deviceConnections.findFirst({
        where: and(
          eq(deviceConnections.clientId, ctx.dbUserId),
          eq(deviceConnections.provider, input.provider)
        ),
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Connection for ${input.provider} not found` });
      }

      if (connection.status !== "connected") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Device ${input.provider} is not connected. Status: ${connection.status}`,
        });
      }

      // Create sync log entry
      const syncLog = await ctx.db
        .insert(syncLogs)
        .values({
          deviceConnectionId: connection.id,
          status: "in_progress",
          startedAt: new Date(),
        })
        .returning();

      const syncLogId = syncLog[0]?.id ?? null;

      // Update connection status to syncing
      await ctx.db
        .update(deviceConnections)
        .set({ status: "syncing" })
        .where(eq(deviceConnections.id, connection.id));

      // Perform the actual data sync
      try {
        const result = await syncProviderData(
          ctx.dbUserId,
          input.provider,
          connection.accessTokenEnc ?? "",
          connection.refreshTokenEnc ?? null,
          connection.id,
        );

        if (result.success) {
          // Update sync log as completed
          if (syncLogId) {
            await ctx.db
              .update(syncLogs)
              .set({
                status: "completed",
                completedAt: new Date(),
                recordsSynced: result.recordsSynced,
              })
              .where(eq(syncLogs.id, syncLogId));
          }

          // Update connection status back to connected and record sync time
          await ctx.db
            .update(deviceConnections)
            .set({
              status: "connected",
              lastSyncAt: new Date(),
            })
            .where(eq(deviceConnections.id, connection.id));

          return {
            syncLogId,
            recordsSynced: result.recordsSynced,
            success: true,
            note: result.note ?? null,
          };
        } else {
          // Sync returned errors but didn't throw
          const errorMsg = result.errors.join("; ") || "Unknown sync error";

          if (syncLogId) {
            await ctx.db
              .update(syncLogs)
              .set({
                status: "failed",
                completedAt: new Date(),
                errorMessage: errorMsg,
              })
              .where(eq(syncLogs.id, syncLogId));
          }

          await ctx.db
            .update(deviceConnections)
            .set({ status: "error" })
            .where(eq(deviceConnections.id, connection.id));

          return {
            syncLogId,
            recordsSynced: 0,
            success: false,
            errors: result.errors,
          };
        }
      } catch (err) {
        // Catch-all: sync threw an unexpected error
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (syncLogId) {
          await ctx.db
            .update(syncLogs)
            .set({
              status: "failed",
              completedAt: new Date(),
              errorMessage: errorMsg,
            })
            .where(eq(syncLogs.id, syncLogId));
        }

        // Revert connection status to connected (not error) so the user can retry
        await ctx.db
          .update(deviceConnections)
          .set({ status: "connected" })
          .where(eq(deviceConnections.id, connection.id));

        return {
          syncLogId,
          recordsSynced: 0,
          success: false,
          errors: [errorMsg],
        };
      }
    }),

  /**
   * Bulk-ingest Apple HealthKit data pushed from the mobile app.
   *
   * All arrays are optional; each is capped at 2000 items. Rows are
   * inserted with source "apple_health" using the same delete-then-insert
   * dedup pattern as the server-side device sync (delete existing
   * apple_health rows in the same timestamp window / same dates, then
   * insert in batches of 100).
   *
   * Returns counts per category and updates the apple_health
   * device connection's lastSyncAt.
   */
  healthkitSync: clientProcedure
    .input(
      z.object({
        heartRate: z.array(z.object({
          timestamp: z.string(),
          bpm: z.number(),
        })).max(2000).optional(),
        hrv: z.array(z.object({
          timestamp: z.string(),
          ms: z.number(),
        })).max(2000).optional(),
        glucose: z.array(z.object({
          timestamp: z.string(),
          valueMgdl: z.number(),
        })).max(2000).optional(),
        bloodPressure: z.array(z.object({
          date: z.string(),
          systolic: z.number(),
          diastolic: z.number(),
        })).max(2000).optional(),
        sleep: z.array(z.object({
          date: z.string(),
          totalMinutes: z.number(),
          bedtime: z.string().optional(),
          wakeTime: z.string().optional(),
        })).max(2000).optional(),
        weight: z.array(z.object({
          date: z.string(),
          weightLbs: z.number().optional(),
          bodyFatPct: z.number().optional(),
        })).max(2000).optional(),
        activity: z.array(z.object({
          date: z.string(),
          steps: z.number().optional(),
          caloriesActive: z.number().optional(),
        })).max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const SOURCE = "apple_health";
      const userId = ctx.dbUserId;
      const BATCH = 100;

      /** Min/max Date window for a set of ISO timestamps */
      const tsWindow = (timestamps: Date[]) => ({
        minTs: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
        maxTs: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
      });

      const counts = {
        heartRate: 0,
        hrv: 0,
        glucose: 0,
        bloodPressure: 0,
        sleep: 0,
        weight: 0,
        activity: 0,
      };

      // ── Heart rate (timestamp window dedup) ──
      if (input.heartRate && input.heartRate.length > 0) {
        const rows = input.heartRate.map((r) => ({
          clientId: userId,
          timestamp: new Date(r.timestamp),
          bpm: Math.round(r.bpm),
          source: SOURCE,
        }));
        const { minTs, maxTs } = tsWindow(rows.map((r) => r.timestamp));
        await ctx.db.delete(heartRateReadings).where(
          and(
            eq(heartRateReadings.clientId, userId),
            eq(heartRateReadings.source, SOURCE),
            gte(heartRateReadings.timestamp, minTs),
            lte(heartRateReadings.timestamp, maxTs),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(heartRateReadings).values(rows.slice(i, i + BATCH));
        }
        counts.heartRate = rows.length;
      }

      // ── HRV (timestamp window dedup; SDNN ms stored in rmssd) ──
      if (input.hrv && input.hrv.length > 0) {
        const rows = input.hrv.map((r) => ({
          clientId: userId,
          timestamp: new Date(r.timestamp),
          rmssd: r.ms,
          source: SOURCE,
        }));
        const { minTs, maxTs } = tsWindow(rows.map((r) => r.timestamp));
        await ctx.db.delete(hrvReadings).where(
          and(
            eq(hrvReadings.clientId, userId),
            eq(hrvReadings.source, SOURCE),
            gte(hrvReadings.timestamp, minTs),
            lte(hrvReadings.timestamp, maxTs),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(hrvReadings).values(rows.slice(i, i + BATCH));
        }
        counts.hrv = rows.length;
      }

      // ── Glucose (timestamp window dedup) ──
      if (input.glucose && input.glucose.length > 0) {
        const rows = input.glucose.map((r) => ({
          clientId: userId,
          timestamp: new Date(r.timestamp),
          valueMgdl: r.valueMgdl,
          source: SOURCE,
        }));
        const { minTs, maxTs } = tsWindow(rows.map((r) => r.timestamp));
        await ctx.db.delete(glucoseReadings).where(
          and(
            eq(glucoseReadings.clientId, userId),
            eq(glucoseReadings.source, SOURCE),
            gte(glucoseReadings.timestamp, minTs),
            lte(glucoseReadings.timestamp, maxTs),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(glucoseReadings).values(rows.slice(i, i + BATCH));
        }
        counts.glucose = rows.length;
      }

      // ── Blood pressure (same-dates dedup) ──
      if (input.bloodPressure && input.bloodPressure.length > 0) {
        const rows = input.bloodPressure.map((r) => ({
          clientId: userId,
          date: r.date,
          systolic: Math.round(r.systolic),
          diastolic: Math.round(r.diastolic),
          source: SOURCE,
        }));
        const dates = Array.from(new Set(rows.map((r) => r.date)));
        await ctx.db.delete(bloodPressureReadings).where(
          and(
            eq(bloodPressureReadings.clientId, userId),
            eq(bloodPressureReadings.source, SOURCE),
            inArray(bloodPressureReadings.date, dates),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(bloodPressureReadings).values(rows.slice(i, i + BATCH));
        }
        counts.bloodPressure = rows.length;
      }

      // ── Sleep sessions (same-dates dedup) ──
      if (input.sleep && input.sleep.length > 0) {
        const rows = input.sleep.map((r) => ({
          clientId: userId,
          date: r.date,
          totalMinutes: Math.round(r.totalMinutes),
          bedtime: r.bedtime ?? null,
          wakeTime: r.wakeTime ?? null,
          source: SOURCE,
        }));
        const dates = Array.from(new Set(rows.map((r) => r.date)));
        await ctx.db.delete(sleepSessions).where(
          and(
            eq(sleepSessions.clientId, userId),
            eq(sleepSessions.source, SOURCE),
            inArray(sleepSessions.date, dates),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(sleepSessions).values(rows.slice(i, i + BATCH));
        }
        counts.sleep = rows.length;
      }

      // ── Body measurements (same-dates dedup) ──
      if (input.weight && input.weight.length > 0) {
        const rows = input.weight.map((r) => ({
          clientId: userId,
          date: r.date,
          weightLbs: r.weightLbs ?? null,
          bodyFatPct: r.bodyFatPct ?? null,
          source: SOURCE,
        }));
        const dates = Array.from(new Set(rows.map((r) => r.date)));
        await ctx.db.delete(bodyMeasurements).where(
          and(
            eq(bodyMeasurements.clientId, userId),
            eq(bodyMeasurements.source, SOURCE),
            inArray(bodyMeasurements.date, dates),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(bodyMeasurements).values(rows.slice(i, i + BATCH));
        }
        counts.weight = rows.length;
      }

      // ── Activity summaries (same-dates dedup) ──
      if (input.activity && input.activity.length > 0) {
        const rows = input.activity.map((r) => ({
          clientId: userId,
          date: r.date,
          steps: r.steps != null ? Math.round(r.steps) : null,
          caloriesActive: r.caloriesActive != null ? Math.round(r.caloriesActive) : null,
          source: SOURCE,
        }));
        const dates = Array.from(new Set(rows.map((r) => r.date)));
        await ctx.db.delete(activitySummaries).where(
          and(
            eq(activitySummaries.clientId, userId),
            eq(activitySummaries.source, SOURCE),
            inArray(activitySummaries.date, dates),
          ),
        );
        for (let i = 0; i < rows.length; i += BATCH) {
          await ctx.db.insert(activitySummaries).values(rows.slice(i, i + BATCH));
        }
        counts.activity = rows.length;
      }

      // ── Record the sync on the apple_health connection ──
      await ctx.db
        .update(deviceConnections)
        .set({ lastSyncAt: new Date(), status: "connected" })
        .where(
          and(
            eq(deviceConnections.clientId, userId),
            eq(deviceConnections.provider, "apple_health"),
          ),
        );

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { success: true, counts, total };
    }),

  /**
   * Get sync history for a device connection
   * Returns the last 10 sync logs
   * Input: { provider: string }
   */
  getSyncHistory: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .query(async ({ ctx, input }) => {
      const connection = await safeQ(
        () => ctx.db.query.deviceConnections.findFirst({
          where: and(
            eq(deviceConnections.clientId, ctx.dbUserId),
            eq(deviceConnections.provider, input.provider)
          ),
        }),
        undefined,
      );

      if (!connection) {
        return [];
      }

      const logs = await safeQ(
        () => ctx.db.query.syncLogs.findMany({
          where: eq(syncLogs.deviceConnectionId, connection.id),
          orderBy: desc(syncLogs.startedAt),
          limit: 10,
        }),
        [],
      );

      return logs.map((log) => ({
        id: log.id,
        status: log.status,
        startedAt: log.startedAt?.toISOString() ?? null,
        completedAt: log.completedAt?.toISOString() ?? null,
        recordsSynced: log.recordsSynced ?? 0,
        errorMessage: log.errorMessage ?? null,
      }));
    }),
});
