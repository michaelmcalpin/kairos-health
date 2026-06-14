/**
 * Stack layout for appointment sub-screens.
 */

import React from "react";
import { Stack } from "expo-router";

import { Colors } from "@/lib/constants";

export default function AppointmentsLayout() {
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
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="detail" options={{ title: "Appointment" }} />
      <Stack.Screen name="book" options={{ title: "Book Appointment" }} />
    </Stack>
  );
}
