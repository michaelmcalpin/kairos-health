/**
 * Stack layout for health detail sub-screens.
 *
 * Provides a dark-themed header with back navigation,
 * consistent with the Everist.ai Summit Glyph design.
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function HealthLayout() {
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
      <Stack.Screen name="sleep" options={{ title: "Sleep" }} />
      <Stack.Screen name="glucose" options={{ title: "Glucose" }} />
      <Stack.Screen
        name="blood-pressure"
        options={{ title: "Blood Pressure" }}
      />
      <Stack.Screen name="body" options={{ title: "Body Measurements" }} />
      <Stack.Screen name="goals" options={{ title: "Goals" }} />
    </Stack>
  );
}
