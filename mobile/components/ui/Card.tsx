/**
 * Card component — dark-themed card matching the Everist.ai web design.
 */

import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

import { Colors, Spacing, Radii } from "@/lib/constants";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use a slightly lighter background for nested cards */
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  elevated: {
    backgroundColor: Colors.navyLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
