/**
 * Stack layout for the Notifications center.
 *
 * Provides a dark-themed header with back navigation,
 * consistent with the Everist.ai Summit Glyph design.
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function NotificationsLayout() {
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
      <Stack.Screen
        name="index"
        options={{ title: "Notifications", headerShown: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Notification" }}
      />
    </Stack>
  );
}
