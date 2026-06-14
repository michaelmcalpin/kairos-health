/**
 * RecommendationItem -- numbered priority recommendation with
 * title, description, and urgency badge.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import type { StatusVariant } from "@/lib/types";

interface RecommendationItemProps {
  number: number;
  title: string;
  description: string;
  urgency: string;
  urgencyVariant: StatusVariant;
}

export function RecommendationItem({
  number,
  title,
  description,
  urgency,
  urgencyVariant,
}: RecommendationItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.numberWrap}>
        <Text style={styles.number}>{number}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Badge label={urgency} variant={urgencyVariant} />
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  numberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200, 169, 81, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(200, 169, 81, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  number: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.gold,
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
  description: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    lineHeight: 18,
  },
});
