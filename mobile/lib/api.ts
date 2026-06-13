/**
 * tRPC API helpers for the Everist.ai mobile app.
 *
 * Re-exports the typed tRPC hooks and provides utility wrappers
 * that simplify calling the backend from screens and custom hooks.
 *
 * The tRPC client (created in trpc.ts) uses the AppRouter type from
 * the backend.  Because the mobile project currently uses `any` as the
 * AppRouter placeholder, all procedure paths are typed loosely.
 * Once the monorepo is properly linked the full type-safety kicks in.
 */

export { trpc } from "./trpc";
export { SAMPLE_DATA } from "./sample-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper — detect whether the backend is likely reachable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { API_URL } from "./constants";

/**
 * Returns true when the API_URL points to a localhost / dev address
 * that is very likely unreachable from a physical device.
 *
 * Hooks use this to decide whether to even attempt a network call
 * or jump straight to sample data (saving time and avoiding
 * unnecessary error noise).
 */
export function isDevFallbackMode(): boolean {
  if (!API_URL) return true;
  return (
    API_URL.includes("localhost") ||
    API_URL.includes("127.0.0.1") ||
    API_URL.includes("0.0.0.0")
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Default query options for hooks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Shared query options used by the custom hooks.
 *
 * - `enabled`: skips the query entirely when in dev fallback mode,
 *   avoiding console noise and wasted network round-trips.
 * - `retry`: only 1 retry — mobile networks can be flaky but we
 *   don't want long waits.
 * - `staleTime`: 5 minutes — biometric data doesn't change on a
 *   second-by-second basis so aggressive refetching is wasteful.
 */
export const DEFAULT_QUERY_OPTIONS = {
  enabled: !isDevFallbackMode(),
  retry: 1,
  staleTime: 5 * 60_000, // 5 minutes
  refetchOnWindowFocus: false,
} as const;

/**
 * More aggressive caching for data that rarely changes (e.g. user
 * profile, device list, coach info).
 */
export const STATIC_QUERY_OPTIONS = {
  ...DEFAULT_QUERY_OPTIONS,
  staleTime: 30 * 60_000, // 30 minutes
} as const;

/**
 * Options for real-time-ish data (e.g. chat messages, alerts).
 */
export const REALTIME_QUERY_OPTIONS = {
  ...DEFAULT_QUERY_OPTIONS,
  staleTime: 30_000, // 30 seconds
} as const;
