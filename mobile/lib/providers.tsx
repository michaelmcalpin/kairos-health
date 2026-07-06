/**
 * Global providers wrapper for the Everist.ai mobile app.
 *
 * ClerkProvider is the outermost wrapper, providing auth context.
 * ClerkTRPCBridge reads the Clerk session token and creates the
 * tRPC client so every API call carries the Bearer token.
 *
 * If CLERK_PUBLISHABLE_KEY is empty the app shows a configuration
 * error screen instead of crashing.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

import { trpc, createQueryClient, createTRPCClient } from "./trpc";
import { CLERK_PUBLISHABLE_KEY, Colors, FontSizes, Spacing } from "./constants";

/** ------------------------------------------------------------------ */
/** Secure-store backed token cache for Clerk                         */
/** ------------------------------------------------------------------ */

const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

/** ------------------------------------------------------------------ */
/** Bridge: reads Clerk auth and creates the tRPC client              */
/** ------------------------------------------------------------------ */

function ClerkTRPCBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

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
/** Configuration error screen                                        */
/** ------------------------------------------------------------------ */

function ClerkConfigError() {
  return (
    <View style={configStyles.container}>
      <Text style={configStyles.title}>Configuration Required</Text>
      <Text style={configStyles.body}>
        The Clerk publishable key is not set.{"\n\n"}
        Please add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your environment
        variables and restart the app.
      </Text>
    </View>
  );
}

const configStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.gold,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  body: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 24,
  },
});

/** ------------------------------------------------------------------ */
/** Root Providers                                                     */
/** ------------------------------------------------------------------ */

export function Providers({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <ClerkConfigError />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkTRPCBridge>{children}</ClerkTRPCBridge>
    </ClerkProvider>
  );
}
