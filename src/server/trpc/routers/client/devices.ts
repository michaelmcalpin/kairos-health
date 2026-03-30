import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { deviceConnections, syncLogs } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { PROVIDERS } from "@/lib/integrations/devices/providers";

const providerEnum = z.enum(["oura", "apple_health", "dexcom", "garmin", "whoop", "withings"]);

export const clientDevicesRouter = router({
  /**
   * List all device connections for the current user
   * Returns: id, provider, status, lastSyncAt, scopes, tokenExpiresAt
   */
  list: clientProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db.query.deviceConnections.findMany({
      where: eq(deviceConnections.clientId, ctx.dbUserId),
      orderBy: desc(deviceConnections.lastSyncAt),
    });

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
      const connection = await ctx.db.query.deviceConnections.findFirst({
        where: and(
          eq(deviceConnections.clientId, ctx.dbUserId),
          eq(deviceConnections.provider, input.provider)
        ),
      });

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
      const providerConfig = PROVIDERS[input.provider];
      if (!providerConfig) {
        throw new Error(`Provider ${input.provider} not found`);
      }

      // Get OAuth credentials from environment
      const envKeyPrefix = input.provider.toUpperCase();
      const clientId = process.env[`${envKeyPrefix}_CLIENT_ID`];

      if (!clientId) {
        throw new Error(`Missing OAuth configuration for ${input.provider}`);
      }

      // Build redirect URI
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/callbacks/${input.provider}`;

      // Encode state with userId and provider
      const state = Buffer.from(
        JSON.stringify({
          userId: ctx.dbUserId,
          provider: input.provider,
          timestamp: Date.now(),
        })
      ).toString("base64");

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
        throw new Error(`Connection for ${input.provider} not found`);
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
   * Creates a sync log entry and sets status to "syncing"
   * Input: { provider: string }
   * Returns: { syncLogId: string }
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
        throw new Error(`Connection for ${input.provider} not found`);
      }

      if (connection.status !== "connected") {
        throw new Error(
          `Device ${input.provider} is not connected. Status: ${connection.status}`
        );
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

      // Update connection status to syncing
      await ctx.db
        .update(deviceConnections)
        .set({
          status: "syncing",
        })
        .where(eq(deviceConnections.id, connection.id));

      return {
        syncLogId: syncLog[0]?.id ?? null,
      };
    }),

  /**
   * Get sync history for a device connection
   * Returns the last 10 sync logs
   * Input: { provider: string }
   */
  getSyncHistory: clientProcedure
    .input(z.object({ provider: providerEnum }))
    .query(async ({ ctx, input }) => {
      const connection = await ctx.db.query.deviceConnections.findFirst({
        where: and(
          eq(deviceConnections.clientId, ctx.dbUserId),
          eq(deviceConnections.provider, input.provider)
        ),
      });

      if (!connection) {
        return [];
      }

      const logs = await ctx.db.query.syncLogs.findMany({
        where: eq(syncLogs.deviceConnectionId, connection.id),
        orderBy: desc(syncLogs.startedAt),
        limit: 10,
      });

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
