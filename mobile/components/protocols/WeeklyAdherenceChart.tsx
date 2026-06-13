/**
 * WeeklyAdherenceChart -- 7-day bar chart showing daily completion percentages.
 *
 * Highlights the current day in gold and displays average adherence below.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface DayData {
  day: string; // abbreviation e.g. "M", "T", "W"
  percent: number;
  isToday: boolean;
}

interface WeeklyAdherenceChartProps {
  data: DayData[];
}

function getBarColor(percent: number, isToday: boolean): string {
  if (isToday) return Colors.gold;
  if (percent >= 80) return Colors.success;
  if (percent >= 50) return Colors.warning;
  if (percent > 0) return Colors.danger;
  return Colors.border;
}

function getPercentColor(percent: number, isToday: boolean): string {
  if (isToday) return Colors.gold;
  if (percent >= 80) return Colors.success;
  if (percent >= 50) return Colors.warning;
  return Colors.danger;
}

export function WeeklyAdherenceChart({ data }: WeeklyAdherenceChartProps) {
  const average =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.percent, 0) / data.length)
      : 0;

  return (
    <View style={styles.container}>
      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((day, index) => {
          const barColor = getBarColor(day.percent, day.isToday);
          const percentColor = getPercentColor(day.percent, day.isToday);
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>
                {day.day}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(day.percent, 4)}%`,
                      backgroundColor: barColor,
                    },
                    day.isToday && styles.todayBar,
                  ]}
                />
              </View>
              <Text style={[styles.percentLabel, { color: percentColor }]}>
                {day.percent}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Average */}
      <View style={styles.averageRow}>
        <View style={styles.averageDivider} />
        <View style={styles.averageContent}>
          <Text style={styles.averageLabel}>Weekly Average</Text>
          <Text style={styles.averageValue}>{average}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 6,
  },
  todayLabel: {
    color: Colors.gold,
    fontWeight: "700",
  },
  barTrack: {
    width: "100%",
    height: 80,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 2,
  },
  barFill: {
    width: "100%",
    borderRadius: Radii.sm - 2,
    minHeight: 3,
  },
  todayBar: {
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
  },
  averageRow: {
    marginTop: Spacing.md,
  },
  averageDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  averageContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  averageLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  averageValue: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
});
