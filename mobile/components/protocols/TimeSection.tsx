/**
 * TimeSection -- A collapsible time-of-day section header with an icon,
 * label, time range, and completion count.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface TimeSectionProps {
  icon: string;
  label: string;
  timeRange: string;
  completed: number;
  total: number;
  children: React.ReactNode;
}

export function TimeSection({
  icon,
  label,
  timeRange,
  completed,
  total,
  children,
}: TimeSectionProps) {
  const allDone = completed === total && total > 0;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.timeRange}>{timeRange}</Text>
        </View>
        <View
          style={[
            styles.countBadge,
            allDone && styles.countBadgeDone,
          ]}
        >
          <Text
            style={[
              styles.countText,
              allDone && styles.countTextDone,
            ]}
          >
            {completed}/{total}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.items}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  timeRange: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  countBadge: {
    backgroundColor: Colors.navyLight,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  countBadgeDone: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  countText: {
    color: Colors.silver,
    fontSize: 11,
    fontWeight: "600",
  },
  countTextDone: {
    color: Colors.success,
  },
  items: {},
});
