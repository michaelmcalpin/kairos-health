/**
 * Badge component — status indicators with semantic colors.
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import type { StatusVariant } from "@/lib/types";

interface BadgeProps {
  label: string;
  variant?: StatusVariant;
  /** Small dot-only badge (no text) */
  dot?: boolean;
}

const variantColors: Record<StatusVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successMuted, text: Colors.success },
  warning: { bg: Colors.warningMuted, text: Colors.warning },
  danger: { bg: Colors.dangerMuted, text: Colors.danger },
  info: { bg: Colors.infoMuted, text: Colors.info },
  default: { bg: Colors.navyLight, text: Colors.silver },
};

export function Badge({ label, variant = "default", dot = false }: BadgeProps) {
  const colors = variantColors[variant];

  if (dot) {
    return (
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View style={[styles.dotInline, { backgroundColor: colors.text }]} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInline: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
