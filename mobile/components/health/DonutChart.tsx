/**
 * DonutChart component -- circular progress/breakdown chart.
 * Uses View-based rendering (no SVG dependency) with layered arcs
 * approximated by bordered views.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, FontSizes, Spacing } from "@/lib/constants";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Size of the donut */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Center label (e.g. "85%") */
  centerLabel?: string;
  /** Center sublabel */
  centerSublabel?: string;
  /** Show legend */
  showLegend?: boolean;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 14,
  centerLabel,
  centerSublabel,
  showLegend = true,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const innerSize = size - strokeWidth * 2;

  // Build rotation segments
  let cumulativeDeg = 0;
  const arcs = segments.map((seg) => {
    const degrees = total > 0 ? (seg.value / total) * 360 : 0;
    const startDeg = cumulativeDeg;
    cumulativeDeg += degrees;
    return { ...seg, startDeg, degrees };
  });

  return (
    <View style={styles.wrapper}>
      <View style={[styles.ring, { width: size, height: size }]}>
        {/* Track */}
        <View
          style={[
            styles.trackCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: Colors.navyLight,
            },
          ]}
        />

        {/* Segments - rendered as half-circle rotated arcs */}
        {arcs.map((arc, idx) => (
          <React.Fragment key={idx}>
            {/* First half of the arc */}
            <View
              style={[
                styles.arcContainer,
                {
                  width: size,
                  height: size,
                  transform: [{ rotate: `${arc.startDeg}deg` }],
                },
              ]}
            >
              <View
                style={[
                  styles.arcHalf,
                  {
                    width: size,
                    height: size / 2,
                    borderTopLeftRadius: size / 2,
                    borderTopRightRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderBottomWidth: 0,
                    borderColor: arc.color,
                    transform: [
                      {
                        rotate: `${Math.min(arc.degrees, 180)}deg`,
                      },
                    ],
                    transformOrigin: "center bottom",
                  },
                ]}
              />
            </View>
            {/* Second half for arcs > 180deg */}
            {arc.degrees > 180 && (
              <View
                style={[
                  styles.arcContainer,
                  {
                    width: size,
                    height: size,
                    transform: [{ rotate: `${arc.startDeg + 180}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.arcHalf,
                    {
                      width: size,
                      height: size / 2,
                      borderTopLeftRadius: size / 2,
                      borderTopRightRadius: size / 2,
                      borderWidth: strokeWidth,
                      borderBottomWidth: 0,
                      borderColor: arc.color,
                      transform: [
                        {
                          rotate: `${arc.degrees - 180}deg`,
                        },
                      ],
                      transformOrigin: "center bottom",
                    },
                  ]}
                />
              </View>
            )}
          </React.Fragment>
        ))}

        {/* Inner circle (background cover) */}
        <View
          style={[
            styles.innerCircle,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {centerLabel && (
            <Text style={styles.centerLabel}>{centerLabel}</Text>
          )}
          {centerSublabel && (
            <Text style={styles.centerSublabel}>{centerSublabel}</Text>
          )}
        </View>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {segments.map((seg, idx) => (
            <View key={idx} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: seg.color }]}
              />
              <Text style={styles.legendLabel}>{seg.label}</Text>
              <Text style={styles.legendValue}>{seg.value}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  ring: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  trackCircle: {
    position: "absolute",
  },
  arcContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  arcHalf: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  innerCircle: {
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  centerLabel: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  centerSublabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
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
