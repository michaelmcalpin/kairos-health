/**
 * BarChart component -- simple vertical bar chart for trend data.
 * Renders bars with labels below and optional value labels above.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface BarChartItem {
  label: string;
  value: number;
  /** Optional color override per bar */
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  /** Bar fill color (default gold) */
  color?: string;
  /** Height of the chart area */
  height?: number;
  /** Show value labels above bars */
  showValues?: boolean;
  /** Unit suffix for value labels */
  unit?: string;
  /** Decimal places for value labels */
  decimals?: number;
}

export function BarChart({
  data,
  color = Colors.gold,
  height = 120,
  showValues = true,
  unit = "",
  decimals = 1,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height: height + 40 }]}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxValue) * height * 0.85;
          const barColor = item.color ?? color;

          return (
            <View key={idx} style={styles.barColumn}>
              {showValues && (
                <Text style={styles.valueLabel}>
                  {item.value.toFixed(decimals)}
                  {unit}
                </Text>
              )}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.axisLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "60%",
    minWidth: 12,
    maxWidth: 32,
    borderRadius: Radii.sm,
  },
  valueLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 4,
  },
  axisLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
  },
});
