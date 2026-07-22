/**
 * Settings stack layout.
 *
 * Provides a shared header style for all settings sub-screens and
 * a back-navigation pattern consistent with the rest of the app.
 */

import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/lib/constants";

export default function SettingsLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: Colors.dark },
        headerShadowVisible: false,
        animation: "slide_from_right",
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 8 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="edit-profile"
        options={{ title: "Edit Profile" }}
      />
      <Stack.Screen
        name="care-team"
        options={{ title: "Care Team" }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: "Privacy & Security" }}
      />
      <Stack.Screen
        name="help"
        options={{ title: "Help & Support" }}
      />
      <Stack.Screen
        name="about"
        options={{ title: "About" }}
      />
      <Stack.Screen
        name="data-sources"
        options={{ title: "Data Sources" }}
      />
      <Stack.Screen
        name="feedback"
        options={{ title: "Send Feedback" }}
      />
    </Stack>
  );
}
