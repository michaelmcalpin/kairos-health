/**
 * Stack layout for health detail sub-screens.
 *
 * Provides a dark-themed header with back navigation,
 * consistent with the Everist.ai Summit Glyph design.
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function HealthLayout() {
  const router = useRouter();

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
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 8 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.gold} />
          </Pressable>
        ),
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
      <Stack.Screen name="goal-detail" options={{ title: "Goal Detail" }} />
      <Stack.Screen name="create-goal" options={{ title: "New Goal" }} />
    </Stack>
  );
}
