/**
 * SettingsSection -- a titled group of SettingsRow items inside a Card.
 *
 * Provides a consistent section header (icon + title) and wraps children
 * in the shared Card component so every section looks identical.
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";

interface SettingsSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SettingsSection({
  title,
  icon,
  children,
  style,
}: SettingsSectionProps) {
  return (
    <Card style={[styles.card, style]}>
      <View style={styles.header}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(200, 169, 81, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
