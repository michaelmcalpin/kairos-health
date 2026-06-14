/**
 * Stack layout for manual data entry sub-screens.
 *
 * Provides a dark-themed header with back navigation,
 * consistent with the Everist.ai Summit Glyph design.
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function DataEntryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark },
        headerTintColor: Colors.gold,
        headerTitleStyle: {
          color: Colors.white,
          fontWeight: "600",
        },
        contentStyle: { backgroundColor: Colors.dark },
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Log Health Data" }} />
      <Stack.Screen name="log" options={{ title: "Log Entry" }} />
    </Stack>
  );
}
