/**
 * AuthGuard — redirects users based on Clerk authentication state.
 *
 * - Not signed in + not on an auth screen  -> redirect to /sign-in
 * - Signed in   + on an auth screen        -> redirect to /(tabs)
 * - Otherwise                              -> render children normally
 *
 * Waits for Clerk to finish loading before doing anything, so there is
 * no flash of the wrong screen.
 */

import React, { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";

/** Segments that unauthenticated users are allowed to visit. */
const AUTH_SEGMENTS = ["sign-in", "sign-up"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect until Clerk has finished loading.
    if (!isLoaded) return;

    const firstSegment = segments[0] as string | undefined;
    const onAuthScreen = AUTH_SEGMENTS.includes(firstSegment ?? "");

    if (!isSignedIn && !onAuthScreen) {
      // User is not signed in and is trying to access a protected screen.
      router.replace("/sign-in");
    } else if (isSignedIn && onAuthScreen) {
      // User is signed in but still sitting on an auth screen.
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return <>{children}</>;
}
