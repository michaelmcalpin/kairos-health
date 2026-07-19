/**
 * Stack layout for protocol sub-screens
 * (workouts, meals, supplements, medications, fasting, peptides).
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function ProtocolsLayout() {
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
      <Stack.Screen name="workouts" options={{ title: "Workouts" }} />
      <Stack.Screen name="workout-session" options={{ title: "Workout", presentation: "modal" }} />
      <Stack.Screen name="workout-history" options={{ title: "Workout History" }} />
      <Stack.Screen name="meals" options={{ title: "Meals" }} />
      <Stack.Screen name="supplements" options={{ title: "Supplements" }} />
      <Stack.Screen name="medications" options={{ title: "Medications" }} />
      <Stack.Screen name="fasting" options={{ title: "Fasting" }} />
      <Stack.Screen name="peptides" options={{ title: "Peptides" }} />
      <Stack.Screen name="shopping-list" options={{ title: "Shopping List" }} />
      <Stack.Screen name="add-item" options={{ title: "Add to Protocol", presentation: "modal" }} />
    </Stack>
  );
}
