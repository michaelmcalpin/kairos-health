/**
 * Stack layout for clinical sub-screens (labs, genetics).
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function ClinicalLayout() {
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
