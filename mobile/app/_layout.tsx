/**
 * Root layout for the Everist.ai mobile app.
 *
 * Sets up global providers (Clerk, tRPC, React Query), configures the
 * navigation stack with the dark Summit Glyph theme, and handles the
 * splash screen.
 */

import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

import { Providers } from "@/lib/providers";
import { Colors } from "@/lib/constants";

import "../global.css";

// Prevent the splash screen from auto-hiding so we control the reveal.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash once the layout is mounted and fonts / assets are ready.
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Providers>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.dark },
            headerTintColor: Colors.white,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: Colors.dark },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        >
          {/* Main tab navigator — no header, tabs provide their own */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Auth screens */}
          <Stack.Screen
            name="sign-in"
            options={{
              title: "Sign In",
              presentation: "modal",
              headerStyle: { backgroundColor: Colors.navy },
            }}
          />
          <Stack.Screen
            name="sign-up"
            options={{
              title: "Create Account",
              presentation: "modal",
              headerStyle: { backgroundColor: Colors.navy },
            }}
          />

          {/* Onboarding */}
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />

          {/* Health detail sub-screens */}
          <Stack.Screen name="health" options={{ headerShown: false }} />

          {/* Protocol sub-screens */}
          <Stack.Screen name="protocols" options={{ headerShown: false }} />

          {/* Clinical sub-screens */}
          <Stack.Screen name="clinical" options={{ headerShown: false }} />

          {/* Insight Sherpa (AI reports) */}
          <Stack.Screen name="insights" options={{ headerShown: false }} />

          {/* Appointments */}
          <Stack.Screen name="appointments" options={{ headerShown: false }} />

          {/* 404 */}
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>
      </Providers>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
});
