/**
 * RecentReadingItem -- A single entry in the recent-readings timeline.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface RecentReadingItemProps {
  time: string;
  type: string;
  value: string;
  source: string;
  icon: React.ReactNode;
  iconBgColor?: string;
}

export function RecentReadingItem({
  time,
  type,
  value,
  source,
  icon,
  iconBgColor = "rgba(74, 144, 217, 0.15)",
}: RecentReadingItemProps) {
  return (
    <View style={styles.row}>
      {/* Timeline connector */}
      <View style={styles.timeline}>
        <View style={[styles.iconBubble, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        <View style={styles.line} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.type}>{type}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.source}>{source}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    minHeight: 64,
  },
  timeline: {
    width: 36,
    alignItems: "center",
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  type: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  time: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  value: {
    color: Colors.goldLight,
    fontSize: FontSizes.md,
    fontWeight: "700",
    marginBottom: 2,
  },
  source: {
    color: Colors.silver,
    fontSize: 11,
  },
});
