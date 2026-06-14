/**
 * Settings stack layout.
 *
 * Provides a shared header style for all settings sub-screens and
 * a back-navigation pattern consistent with the rest of the app.
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function SettingsLayout() {
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
    >
      <Stack.Screen
        name="edit-profile"
        options={{ title: "Edit Profile" }}
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
    </Stack>
  );
}
