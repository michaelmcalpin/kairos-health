/**
 * NotificationIcon — Returns the appropriate icon for a notification type.
 * Uses simple emoji-based icons to avoid external icon library dependency.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Radii } from "@/lib/constants";
import type { NotificationType } from "./notification-data";

interface NotificationIconProps {
  type: NotificationType;
  size?: number;
}

const iconMap: Record<NotificationType, { emoji: string; bg: string }> = {
  glucose: { emoji: "\u{1F4C9}", bg: "rgba(212, 168, 67, 0.15)" },
  sleep: { emoji: "\u{1F319}", bg: "rgba(74, 144, 217, 0.15)" },
  labs: { emoji: "\u{1F9EA}", bg: "rgba(74, 157, 91, 0.15)" },
  coach: { emoji: "\u{1F4AC}", bg: "rgba(74, 144, 217, 0.15)" },
  appointment: { emoji: "\u{1F4C5}", bg: "rgba(74, 144, 217, 0.15)" },
  protocol: { emoji: "\u{1F4CB}", bg: "rgba(74, 144, 217, 0.15)" },
  heart: { emoji: "\u{2764}\u{FE0F}", bg: "rgba(198, 93, 93, 0.15)" },
  supplement: { emoji: "\u{1F48A}", bg: "rgba(74, 157, 91, 0.15)" },
  exercise: { emoji: "\u{1F3CB}\u{FE0F}", bg: "rgba(74, 144, 217, 0.15)" },
  report: { emoji: "\u{1F4CA}", bg: "rgba(74, 144, 217, 0.15)" },
  biome: { emoji: "\u{1F9EC}", bg: "rgba(74, 157, 91, 0.15)" },
  scan: { emoji: "\u{1F4F7}", bg: "rgba(74, 144, 217, 0.15)" },
  goal: { emoji: "\u{1F3C6}", bg: "rgba(74, 157, 91, 0.15)" },
  medication: { emoji: "\u{26A0}\u{FE0F}", bg: "rgba(198, 93, 93, 0.15)" },
};

export function NotificationIcon({ type, size = 36 }: NotificationIconProps) {
  const config = iconMap[type] ?? iconMap.labs;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.bg,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{config.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
