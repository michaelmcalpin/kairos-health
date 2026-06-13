/**
 * AuthGuard — handles auth redirects based on Clerk session state.
 *
 * Sits inside Providers but outside the Stack navigator.
 * - Not loaded → show full-screen loading spinner
 * - Not signed in → redirect to /sign-in
 * - Signed in but not onboarded → redirect to /onboarding
 * - Signed in + onboarded → render children (main app)
 *
 * Auth and onboarding screens are excluded from guard logic via
 * segment checks so they remain accessible without a session.
 */

import React from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useSegments, useRouter, Redirect } from "expo-router";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/** Segments that should be accessible without authentication. */
const PUBLIC_SEGMENTS = ["sign-in", "sign-up", "onboarding", "+not-found"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments();

  // ---- Still loading Clerk session ----
  if (!isLoaded) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Current top-level segment (e.g. "sign-in", "(tabs)", "onboarding")
  const currentSegment = segments[0] ?? "";
  const isOnPublicScreen = PUBLIC_SEGMENTS.includes(currentSegment);

  // ---- Not signed in ----
  if (!isSignedIn) {
    // Already on a public screen — let it render
    if (isOnPublicScreen) {
      return <>{children}</>;
    }

    // Protected route — bounce to sign-in
    return <Redirect href="/sign-in" />;
  }

  // ---- Signed in — check onboarding status ----
  const isOnboarded = !!(user?.publicMetadata as Record<string, unknown>)
    ?.onboarded;

  if (!isOnboarded) {
    // Already viewing onboarding — let it render
    if (currentSegment === "onboarding") {
      return <>{children}</>;
    }

    // Signed-in user hasn't completed onboarding yet
    return <Redirect href="/onboarding" />;
  }

  // ---- Fully authenticated + onboarded ----
  // If user manually navigates back to auth screens, send them home
  if (currentSegment === "sign-in" || currentSegment === "sign-up") {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}
