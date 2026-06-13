/**
 * Stack layout for protocol sub-screens (workouts, meals, supplements, medications).
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function ProtocolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: Colors.dark },
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    />
  );
}
