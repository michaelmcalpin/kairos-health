"use client";

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Build the tRPC client.
 *
 * `getToken` (Clerk's useAuth().getToken) is passed in so every request carries
 * a FRESHLY minted session token as `Authorization: Bearer …`. Relying on the
 * Clerk session cookie alone means a long-lived editing session (e.g. filling in
 * a full diet plan over several minutes) can send a lapsed short-lived token and
 * get a spurious 401/"Unauthorized" on save. getToken refreshes from the live
 * session on each call, so writes keep working as long as the user is signed in.
 * The server's Clerk auth() reads this bearer OR the cookie, so no server change
 * is needed.
 */
export function getTRPCClient(getToken?: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          const headers: Record<string, string> = { "x-trpc-source": "react" };
          if (getToken) {
            try {
              const token = await getToken();
              if (token) headers["Authorization"] = `Bearer ${token}`;
            } catch {
              // No token (signed out / refresh failed) — fall back to the cookie.
            }
          }
          return headers;
        },
      }),
    ],
  });
}

/**
 * Default React Query options for tRPC.
 * Limits retries to prevent infinite request storms when the
 * server is unreachable (e.g. missing DATABASE_URL on Vercel).
 */
export const defaultQueryClientOptions = {
  queries: {
    retry: 2,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 10_000,
  },
  mutations: {
    retry: 1,
  },
};
