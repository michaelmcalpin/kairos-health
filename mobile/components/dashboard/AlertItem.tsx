/**
 * AlertItem — Single alert row with icon, message, timestamp, and priority styling.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type AlertPriority = "urgent" | "action" | "info";
export type AlertType =
  | "glucose"
  | "heart_rate"
  | "sleep"
  | "hrv"
  | "coach"
  | "labs"
  | "system";

interface AlertItemProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  timestamp: string;
  priority: AlertPriority;
  onPress?: () => void;
}

const priorityBorderColors: Record<AlertPriority, string> = {
  urgent: Colors.danger,
  action: Colors.warning,
  info: Colors.info,
};

const priorityBgColors: Record<AlertPriority, string> = {
  urgent: "rgba(198, 93, 93, 0.06)",
  action: "rgba(212, 168, 67, 0.06)",
  info: "rgba(74, 144, 217, 0.06)",
};

export function AlertItem({
  icon,
  title,
  message,
  timestamp,
  priority,
  onPress,
}: AlertItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderLeftColor: priorityBorderColors[priority],
          backgroundColor: priorityBgColors[priority],
        },
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {message && (
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        )}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  message: {
    color: Colors.silver,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  timestamp: {
    color: Colors.silver,
    fontSize: 10,
  },
  chevron: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "300",
    marginLeft: Spacing.xs,
    marginTop: 2,
  },
});
