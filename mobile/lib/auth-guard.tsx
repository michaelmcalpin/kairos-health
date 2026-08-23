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

import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { registerForPushNotifications } from "@/lib/notifications";
import { trpc } from "@/lib/api";

/** Segments that unauthenticated users are allowed to visit. */
const AUTH_SEGMENTS = ["sign-in", "sign-up"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRegisteredNotifications = useRef(false);
  const pushTokenRef = useRef<string | null>(null);

  // Persist / remove the device's Expo push token on the backend so the server
  // can target push notifications (e.g. coach protocol updates) to this device.
  // The mobile tRPC client is untyped, so these calls aren't type-checked.
  const registerPushToken = trpc.clientPortal.notifications.registerPushToken.useMutation();
  const unregisterPushToken = trpc.clientPortal.notifications.unregisterPushToken.useMutation();

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

  // Register for push notifications once the user is authenticated, and
  // persist the token on the backend so the server can deliver targeted push.
  useEffect(() => {
    if (isSignedIn && !hasRegisteredNotifications.current) {
      hasRegisteredNotifications.current = true;
      registerForPushNotifications()
        .then((token) => {
          if (token) {
            pushTokenRef.current = token;
            const platform =
              Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";
            registerPushToken.mutate({ token, platform });
          }
        })
        .catch(() => {
          // Non-critical — push simply won't be available on this device.
        });
    }

    // On sign-out, best-effort unregister this device's token and reset so a
    // future sign-in re-registers.
    if (!isSignedIn && hasRegisteredNotifications.current) {
      hasRegisteredNotifications.current = false;
      const token = pushTokenRef.current;
      pushTokenRef.current = null;
      if (token) {
        try {
          unregisterPushToken.mutate({ token });
        } catch {
          // Ignore — token cleanup is best-effort.
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return <>{children}</>;
}
