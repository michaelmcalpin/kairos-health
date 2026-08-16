/**
 * useAutoHealthSync — "automatic daily" Apple Health sync (on by default).
 *
 * Once Apple Health is connected AND HealthKit is available + authorized,
 * this hook silently runs the existing HealthKit sync automatically on app
 * open and whenever the app returns to the foreground — but at most once
 * per ~20 hours. Auto-sync is ENABLED BY DEFAULT for connected users: the
 * `auto_health_sync` feature toggle only needs to be flipped to turn it
 * OFF (an unset toggle is treated as enabled). Manual "Sync Now" is always
 * available regardless of this toggle.
 *
 * DESIGN (v1 — no new native modules, no background entitlements):
 * "automatic daily sync" here means an on-foreground opportunistic sync,
 * which covers the realistic daily-open case. It does NOT run while the
 * app is fully closed. True closed-app background sync (e.g. via
 * BGTaskScheduler) is a possible future follow-up and is intentionally
 * not built here.
 *
 * The 20-hour gate is driven by the server-side `lastSyncAt` on the
 * apple_health connection (source of truth across app restarts), plus an
 * in-session ref guard so a single foreground can't fire the sync twice
 * and a refetch race can't double-trigger. All runs here are SILENT —
 * errors are swallowed and no Alert popups are shown. Only the manual
 * "Sync Now" button shows alerts.
 *
 * Mount this once, app-wide, for authenticated users (see the (tabs)
 * layout). It is inert unless the toggle is on and everything lines up.
 */

import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

import { trpc } from "@/lib/api";
import * as HealthKit from "@/lib/healthkit";
import { useHealthSync } from "@/hooks/useHealthSync";

/** Feature-toggle key persisted via clientPortal.settings.updateFeatureToggle. */
export const AUTO_HEALTH_SYNC_KEY = "auto_health_sync";

/** Minimum spacing between automatic syncs (~ once per day). */
const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

export function useAutoHealthSync() {
  const { syncFromHealthKit } = useHealthSync();

  // Toggle state + connection status. These queries are lightweight and
  // shared/deduped by React Query with the other screens that read them.
  const togglesQuery = trpc.clientPortal.settings.getFeatureToggles.useQuery(
    undefined,
    { retry: false, staleTime: 5 * 60 * 1000 },
  );
  const connectionQuery = trpc.clientPortal.devices.getConnection.useQuery(
    { provider: "apple_health" },
    { retry: false, staleTime: 60 * 1000 },
  );

  // In-session guards. `runningRef` prevents concurrent runs; `lastRunRef`
  // prevents re-firing within the 20h window even before the server
  // `lastSyncAt` refetch has resolved (avoids a foreground-churn double sync).
  const runningRef = useRef(false);
  const lastRunRef = useRef(0);

  const maybeSync = useCallback(async () => {
    try {
      if (runningRef.current) return;

      const now = Date.now();

      // In-session gate: never attempt more than once per ~20h per app run.
      if (now - lastRunRef.current < TWENTY_HOURS_MS) return;

      // Enablement check. Auto-sync is ON BY DEFAULT once Apple Health is
      // connected: if the user has never explicitly set the toggle it is
      // treated as enabled, so a freshly-connected user gets automatic daily
      // sync without flipping a switch. Only an explicit `false` disables it
      // (manual "Sync Now" always remains available regardless).
      const toggles = togglesQuery.data as Record<string, boolean> | undefined;
      const enabled = toggles?.[AUTO_HEALTH_SYNC_KEY] ?? true;
      if (!enabled) return;

      // Native availability (iOS + module linked).
      if (!HealthKit.isHealthKitAvailable()) return;

      // Only auto-sync for users who have actually connected Apple Health.
      // This gate runs BEFORE any HealthKit permission call so a user who has
      // never connected is never surprised by a permission prompt on
      // foreground (the default-on behavior stays inert until they connect).
      const conn = connectionQuery.data as any;
      const isConnected = !!(conn?.connected || conn?.status === "connected");
      if (!isConnected) return;

      // Server-side staleness gate: sync only if we've never synced or the
      // last sync is older than 20 hours. `lastSyncAt` is the durable source
      // of truth across app restarts.
      const lastSyncAt = conn?.lastSyncAt;
      const lastMs = lastSyncAt ? new Date(lastSyncAt).getTime() : NaN;
      const isStale = Number.isNaN(lastMs) || now - lastMs >= TWENTY_HOURS_MS;
      if (!isStale) return;

      // Confirm HealthKit authorization. On iOS `initHealthKit` is idempotent
      // and does NOT re-prompt once permissions were granted, so this is
      // silent for an already-connected user. If not authorized, bail quietly.
      const status = await HealthKit.requestHealthKitPermissions();
      if (!status.isAuthorized) return;

      // Passed every gate — mark the attempt before awaiting so a racing
      // foreground event can't slip a second run through.
      lastRunRef.current = now;
      runningRef.current = true;

      // Silent run: no Alert popups (this is background-ish).
      await syncFromHealthKit({ silent: true });

      // Refresh the connection so the updated server `lastSyncAt` gates
      // future runs for the rest of this session.
      connectionQuery.refetch().catch(() => {});
    } catch {
      // Swallow — automatic sync must never surface errors or block the UI.
    } finally {
      runningRef.current = false;
    }
  }, [togglesQuery.data, connectionQuery, syncFromHealthKit]);

  // Run on mount (app open). Re-runs if the toggle/connection data loads
  // after first mount, since `maybeSync` depends on the query data.
  useEffect(() => {
    void maybeSync();
  }, [maybeSync]);

  // Run whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void maybeSync();
      }
    });
    return () => sub.remove();
  }, [maybeSync]);
}
