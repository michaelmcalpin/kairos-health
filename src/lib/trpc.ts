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

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        headers() {
          return {
            "x-trpc-source": "react",
          };
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
