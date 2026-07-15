/**
 * Auth utilities — DEV MODE stub.
 *
 * Provides mock auth hooks so screens compile without Clerk.
 * Swap back to the Clerk version when auth is configured.
 */

import * as SecureStore from "expo-secure-store";

/** Secure token cache (kept for future Clerk integration) */
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
    } catch {}
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

/** Mock useAuth hook for dev mode */
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "dev-user-001",
    user: {
      firstName: "Demo",
      lastName: "User",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      imageUrl: null,
      publicMetadata: { onboarded: true },
    },
    signOut: async () => {},
    getToken: async () => null,
  };
}

/** Token provider for tRPC */
export function createTokenProvider(getToken: () => Promise<string | null>) {
  return async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  };
}

/** Sign-out helper */
export async function performSignOut(
  signOut: () => Promise<void>,
): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    console.error("[Auth] Sign-out error:", error);
  }
}
