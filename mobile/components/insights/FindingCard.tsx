/**
 * FindingCard -- individual health analysis finding with icon, title,
 * status badge, and explanation text.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import type { StatusVariant } from "@/lib/types";

interface FindingCardProps {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusVariant: StatusVariant;
  explanation: string;
}

export function FindingCard({
  icon,
  title,
  status,
  statusVariant,
  explanation,
}: FindingCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Badge label={status} variant={statusVariant} />
        </View>
        <Text style={styles.explanation}>{explanation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: "rgba(200, 169, 81, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
    flex: 1,
  },
  explanation: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    lineHeight: 18,
  },
});
