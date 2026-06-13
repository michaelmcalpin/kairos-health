/**
 * Stack layout for protocol sub-screens
 * (workouts, meals, supplements, medications, fasting, peptides).
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function ProtocolsLayout() {
  const sharedOptions = {
    headerStyle: { backgroundColor: Colors.dark },
    headerTintColor: Colors.white,
    headerTitleStyle: { fontWeight: "600" as const },
    contentStyle: { backgroundColor: Colors.dark },
    headerShadowVisible: false,
    animation: "slide_from_right" as const,
  };

  return (
    <Stack screenOptions={sharedOptions}>
      <Stack.Screen name="workouts" options={{ title: "Workouts" }} />
      <Stack.Screen name="meals" options={{ title: "Meals" }} />
      <Stack.Screen name="supplements" options={{ title: "Supplements" }} />
      <Stack.Screen name="medications" options={{ title: "Medications" }} />
      <Stack.Screen name="fasting" options={{ title: "Fasting" }} />
      <Stack.Screen name="peptides" options={{ title: "Peptides" }} />
    </Stack>
  );
}
