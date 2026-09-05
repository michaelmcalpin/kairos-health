"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTRPCClient } from "@/lib/trpc";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // Mint a fresh Clerk token per request so long editing sessions don't hit a
  // stale-token 401 on save. getToken reads the live session each call.
  const { getToken } = useAuth();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            // Don't retry client errors (4xx) — retrying a 429/401/403 just
            // hammers the server and can trip the rate limiter harder. Only
            // retry transient network/5xx failures, at most twice.
            retry: (failureCount, error) => {
              const status = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
              if (typeof status === "number" && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
          },
          mutations: {
            retry: 1,                  // mutations retry once at most
          },
        },
      })
  );
  const [trpcClient] = useState(() => getTRPCClient(() => getToken()));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
