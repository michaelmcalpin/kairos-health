/**
 * SectionHeader — Reusable section title with optional "View all" action.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm + 2,
    marginTop: Spacing.md,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  action: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
});
