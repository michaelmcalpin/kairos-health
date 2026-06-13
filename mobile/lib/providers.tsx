/**
 * Global providers wrapper for the Everist.ai mobile app.
 *
 * Composes Clerk, React Query, and tRPC providers into a single
 * component that wraps the root layout.
 */

import React, { useMemo } from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";

import { CLERK_PUBLISHABLE_KEY } from "./constants";
import { tokenCache } from "./auth";
import { trpc, createQueryClient, createTRPCClient } from "./trpc";

/** ------------------------------------------------------------------ */
/** Inner provider — needs to be inside ClerkProvider to use useAuth    */
/** ------------------------------------------------------------------ */

function TRPCQueryProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useClerkAuth();

  const queryClient = useMemo(() => createQueryClient(), []);
  const trpcClient = useMemo(
    () => createTRPCClient(() => getToken()),
    [getToken],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/** ------------------------------------------------------------------ */
/** Root Providers                                                     */
/** ------------------------------------------------------------------ */

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <TRPCQueryProvider>{children}</TRPCQueryProvider>
    </ClerkProvider>
  );
}
