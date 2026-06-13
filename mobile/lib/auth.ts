/**
 * Clerk authentication utilities for the Everist.ai mobile app.
 */

import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

/** ------------------------------------------------------------------ */
/** Secure token cache for Clerk (persisted with expo-secure-store)     */
/** ------------------------------------------------------------------ */

export const tokenCache = {
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
      // Silently fail — user will just need to re-authenticate
    }
  },

  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // no-op
    }
  },
};

/** ------------------------------------------------------------------ */
/** Hooks                                                              */
/** ------------------------------------------------------------------ */

/**
 * Convenience wrapper around Clerk's useAuth with typed helpers.
 */
export function useAuth() {
  const { isLoaded, isSignedIn, userId, signOut, getToken } = useClerkAuth();
  const { user } = useUser();

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId,
    user,
    signOut,
    getToken,
  };
}

/** ------------------------------------------------------------------ */
/** Token provider for tRPC                                            */
/** ------------------------------------------------------------------ */

/**
 * Returns a function that fetches the current Clerk session token.
 * Used by the tRPC client to attach Authorization headers.
 */
export function createTokenProvider(getToken: () => Promise<string | null>) {
  return async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  };
}

/** ------------------------------------------------------------------ */
/** Sign-out helper                                                    */
/** ------------------------------------------------------------------ */

/**
 * Full sign-out: clears Clerk session and any locally-cached tokens.
 */
export async function performSignOut(
  signOut: () => Promise<void>,
): Promise<void> {
  try {
    await signOut();
    // Clear any additional cached data
    await SecureStore.deleteItemAsync("clerk-session");
  } catch (error) {
    console.error("[Auth] Sign-out error:", error);
    throw error;
  }
}
