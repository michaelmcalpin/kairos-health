/**
 * Stack layout for clinical sub-screens
 * (labs, genetics, dexa, gut-biome, medical-records).
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function ClinicalLayout() {
  const router = useRouter();

  const sharedOptions = {
    headerStyle: { backgroundColor: Colors.dark },
    headerTintColor: Colors.white,
    headerTitleStyle: { fontWeight: "600" as const },
    contentStyle: { backgroundColor: Colors.dark },
    headerShadowVisible: false,
    animation: "slide_from_right" as const,
    headerLeft: () => (
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 8 }}>
        <Ionicons name="chevron-back" size={24} color={Colors.white} />
      </Pressable>
    ),
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
