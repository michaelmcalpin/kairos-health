/**
 * tRPC client setup for the Everist.ai mobile app.
 *
 * Connects to the Next.js/tRPC backend with Clerk auth token injection
 * and SuperJSON transformer.
 */

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

import { API_URL } from "./constants";

// ---- Type import from the backend ---------------------------------
// The shared AppRouter type lives in the web project.  When the monorepo
// is properly set up this will be a direct import; until then we use
// `any` as a placeholder so the rest of the wiring compiles.
//
//   import type { AppRouter } from "../../src/server/api/root";
//
type AppRouter = any;

/** The typed tRPC-React hooks instance. */
export const trpc = createTRPCReact<AppRouter>();

/** ------------------------------------------------------------------ */
/** Query client                                                       */
/** ------------------------------------------------------------------ */

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30 s to reduce refetches on tab switches.
        staleTime: 30_000,
        // Keep unused data in cache for 5 min.
        gcTime: 5 * 60_000,
        // Retry once on failure.
        retry: 1,
        // Don't refetch on reconnect automatically — let pull-to-refresh handle it.
        refetchOnReconnect: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/** ------------------------------------------------------------------ */
/** tRPC client factory                                                */
/** ------------------------------------------------------------------ */

/**
 * Creates a tRPC client that injects the Clerk auth token on every
 * request via httpBatchLink.
 *
 * @param getToken - An async function that returns the current Clerk
 *                   session token (or null if unauthenticated).
 */
export function createTRPCClient(getToken: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,

        async headers() {
          const token = await getToken();
          return {
            Authorization: token ? `Bearer ${token}` : "",
            "x-trpc-source": "everist-mobile",
          };
        },

        /**
         * Custom fetch that adds timeout handling for mobile networks.
         */
        fetch(url, options) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15_000);

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));
        },
      }),
    ],
  });
}
