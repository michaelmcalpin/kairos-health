/**
 * Stack layout for device connection sub-screens.
 *
 * Provides a dark-themed header with back navigation,
 * consistent with the Everist.ai Summit Glyph design.
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function DevicesLayout() {
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
      <Stack.Screen name="index" options={{ title: "Connected Devices" }} />
      <Stack.Screen name="add" options={{ title: "Add Device" }} />
      <Stack.Screen
        name="apple-health"
        options={{ title: "Apple Health" }}
      />
      <Stack.Screen
        name="oura"
        options={{ title: "Oura Ring" }}
      />
      <Stack.Screen
        name="hume"
        options={{ title: "Hume AI" }}
      />
      <Stack.Screen
        name="connect"
        options={{ title: "Connect Account" }}
      />
    </Stack>
  );
}
