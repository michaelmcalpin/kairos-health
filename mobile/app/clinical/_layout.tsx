/**
 * Stack layout for clinical sub-screens
 * (labs, genetics, dexa, gut-biome, medical-records).
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function ClinicalLayout() {
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
      <Stack.Screen name="labs" options={{ title: "Lab Results" }} />
      <Stack.Screen name="genetics" options={{ title: "Genetics" }} />
      <Stack.Screen name="dexa" options={{ title: "DEXA Scan" }} />
      <Stack.Screen name="gut-biome" options={{ title: "Gut Biome" }} />
      <Stack.Screen name="medical-records" options={{ title: "Medical Records" }} />
    </Stack>
  );
}
