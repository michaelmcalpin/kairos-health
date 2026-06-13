/**
 * StackedBar component -- horizontal stacked bar for breakdowns (e.g. sleep stages).
 * Shows colored segments with a legend below.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface StackedBarSegment {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  segments: StackedBarSegment[];
  /** Height of the bar */
  height?: number;
  /** Show legend below the bar */
  showLegend?: boolean;
  /** Unit for legend values */
  unit?: string;
}

export function StackedBar({
  segments,
  height = 24,
  showLegend = true,
  unit = "h",
}: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <View>
      <View style={[styles.bar, { height }]}>
        {segments.map((segment, idx) => {
          const widthPct = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <View
              key={idx}
              style={[
                styles.segment,
                {
                  width: `${widthPct}%`,
                  backgroundColor: segment.color,
                  borderTopLeftRadius: idx === 0 ? Radii.sm : 0,
                  borderBottomLeftRadius: idx === 0 ? Radii.sm : 0,
                  borderTopRightRadius:
                    idx === segments.length - 1 ? Radii.sm : 0,
                  borderBottomRightRadius:
                    idx === segments.length - 1 ? Radii.sm : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {segments.map((segment, idx) => (
            <View key={idx} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: segment.color }]}
              />
              <Text style={styles.legendLabel}>{segment.label}</Text>
              <Text style={styles.legendValue}>
                {segment.value}
                {unit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderRadius: Radii.sm,
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  legendValue: {
    color: Colors.silverLight,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
});
