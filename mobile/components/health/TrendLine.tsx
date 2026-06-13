/**
 * TrendLine component -- simple line-style trend visualization.
 * Renders a series of connected dots with labels, no SVG needed.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface TrendLineItem {
  label: string;
  value: number;
}

interface TrendLineProps {
  data: TrendLineItem[];
  /** Dot/line color */
  color?: string;
  /** Optional second data series */
  secondaryData?: TrendLineItem[];
  secondaryColor?: string;
  /** Height of the chart area */
  height?: number;
  /** Show value labels */
  showValues?: boolean;
  /** Unit for values */
  unit?: string;
}

export function TrendLine({
  data,
  color = Colors.gold,
  secondaryData,
  secondaryColor = Colors.info,
  height = 100,
  showValues = true,
  unit = "",
}: TrendLineProps) {
  const allValues = [
    ...data.map((d) => d.value),
    ...(secondaryData?.map((d) => d.value) ?? []),
  ];
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  const getY = (value: number) => {
    return height - ((value - minValue) / range) * (height * 0.75) - height * 0.1;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {/* Primary series */}
        {data.map((item, idx) => {
          const y = getY(item.value);
          const leftPct = data.length > 1
            ? (idx / (data.length - 1)) * 100
            : 50;

          return (
            <View
              key={`p-${idx}`}
              style={[
                styles.dotWrapper,
                {
                  left: `${leftPct}%`,
                  top: y,
                },
              ]}
            >
              {showValues && (
                <Text style={[styles.dotValue, { color }]}>
                  {item.value}
                  {unit}
                </Text>
              )}
              <View
                style={[styles.dot, { backgroundColor: color }]}
              />
            </View>
          );
        })}

        {/* Secondary series */}
        {secondaryData?.map((item, idx) => {
          const y = getY(item.value);
          const leftPct = secondaryData.length > 1
            ? (idx / (secondaryData.length - 1)) * 100
            : 50;

          return (
            <View
              key={`s-${idx}`}
              style={[
                styles.dotWrapper,
                {
                  left: `${leftPct}%`,
                  top: y,
                },
              ]}
            >
              {showValues && (
                <Text style={[styles.dotValue, { color: secondaryColor }]}>
                  {item.value}
                  {unit}
                </Text>
              )}
              <View
                style={[
                  styles.dot,
                  { backgroundColor: secondaryColor },
                ]}
              />
            </View>
          );
        })}

        {/* Connecting lines (visual guide lines) */}
        <View style={[styles.guideLine, { top: "25%" }]} />
        <View style={[styles.guideLine, { top: "50%" }]} />
        <View style={[styles.guideLine, { top: "75%" }]} />
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {data.map((item, idx) => (
          <Text key={idx} style={styles.xLabel}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  chartArea: {
    position: "relative",
    width: "100%",
  },
  dotWrapper: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -4 }],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotValue: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
  },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  xLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
});
