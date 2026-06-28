/**
 * tRPC client setup for the Everist.ai mobile app.
 *
 * Connects to the Next.js/tRPC backend with Clerk auth token injection
 * and SuperJSON transformer.
 */

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";

import { API_URL } from "./constants";

// ---- Type import from the backend ---------------------------------
// The shared AppRouter type lives in the web project.  In a monorepo
// this would be a direct import.  We cast the return value so that
// procedure paths compile loosely; runtime still works because tRPC
// resolves paths by name on the server.
//
//   import type { AppRouter } from "../../src/server/trpc/routers/_app";
//

/** The typed tRPC-React hooks instance.
 *
 * We cast to `any` AFTER creation so that `trpc.clientPortal.*` paths
 * don't trigger TS errors.  `createTRPCReact<any>()` itself produces
 * collision-error string types in tRPC v11, so we create with a dummy
 * generic and immediately cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact<any>();

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
