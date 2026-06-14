/**
 * EmptyState — Shown when a filtered notification view has no results.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface EmptyStateProps {
  filterLabel: string;
}

export function EmptyState({ filterLabel }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{"\u{1F514}"}</Text>
      <Text style={styles.title}>No notifications</Text>
      <Text style={styles.message}>
        {filterLabel === "All"
          ? "You're all caught up! No notifications to display."
          : `No "${filterLabel}" notifications at this time.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
});
