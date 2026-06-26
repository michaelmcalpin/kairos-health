/**
 * Global providers wrapper for the Everist.ai mobile app.
 *
 * DEV MODE: Clerk is bypassed so the app can run without auth.
 * When Clerk is configured, swap back to the ClerkProvider version.
 */

import React, { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { trpc, createQueryClient, createTRPCClient } from "./trpc";

/** ------------------------------------------------------------------ */
/** Root Providers (dev mode — no Clerk)                               */
/** ------------------------------------------------------------------ */

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => createQueryClient(), []);
  const trpcClient = useMemo(
    () => createTRPCClient(() => Promise.resolve(null)),
    [],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
