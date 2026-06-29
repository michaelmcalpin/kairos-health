/**
 * Stack layout for Insight Sherpa sub-screens (AI reports).
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function InsightsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Insight Sherpa" }} />
      <Stack.Screen name="report" options={{ title: "Report" }} />
      <Stack.Screen name="analyze" options={{ title: "Health Analysis" }} />
      <Stack.Screen name="ask" options={{ title: "Health Q&A" }} />
      <Stack.Screen name="export" options={{ title: "Health Report" }} />
    </Stack>
  );
}
