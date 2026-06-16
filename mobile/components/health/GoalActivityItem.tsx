/**
 * GoalActivityItem -- single data point in a goal's activity log.
 * Shows a metric reading with timestamp and optional trend indicator.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TrendingDown, TrendingUp, Minus } from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";

export type ActivityTrend = "up" | "down" | "flat";

interface GoalActivityItemProps {
  label: string;
  value: string;
  date: string;
  trend?: ActivityTrend;
  /** Whether "down" is good (e.g. weight loss) */
  downIsGood?: boolean;
}

export function GoalActivityItem({
  label,
  value,
  date,
  trend,
  downIsGood = false,
}: GoalActivityItemProps) {
  const trendColor = (() => {
    if (!trend || trend === "flat") return Colors.silver;
    const isGood = downIsGood ? trend === "down" : trend === "up";
    return isGood ? Colors.success : Colors.danger;
  })();

  return (
    <View style={styles.row}>
      {/* Dot */}
      <View style={styles.dotColumn}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {trend && trend !== "flat" && (
            <View style={styles.trendIcon}>
              {trend === "down" ? (
                <TrendingDown size={14} color={trendColor} />
              ) : (
                <TrendingUp size={14} color={trendColor} />
              )}
            </View>
          )}
          {trend === "flat" && (
            <View style={styles.trendIcon}>
              <Minus size={14} color={trendColor} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dotColumn: {
    alignItems: "center",
    width: 20,
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  line: {
    width: 1,
    flex: 1,
    minHeight: 20,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  date: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  value: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  trendIcon: {
    marginTop: 1,
  },
});
