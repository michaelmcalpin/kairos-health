/**
 * GoalProgressRing -- large circular progress indicator for goal detail.
 * Uses View-based arc rendering (no SVG dependency), consistent with DonutChart.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, FontSizes } from "@/lib/constants";

interface GoalProgressRingProps {
  /** Progress 0-100 */
  progress: number;
  /** Ring fill color */
  color?: string;
  /** Outer size in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Center label (e.g. "60%") */
  centerLabel?: string;
  /** Center sublabel (e.g. "complete") */
  centerSublabel?: string;
}

export function GoalProgressRing({
  progress,
  color = Colors.gold,
  size = 180,
  strokeWidth = 12,
  centerLabel,
  centerSublabel,
}: GoalProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const degrees = (clamped / 100) * 360;
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      {/* Track circle */}
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

      {/* First half (0-180deg) */}
      {degrees > 0 && (
        <View
          style={[
            styles.arcContainer,
            {
              width: size,
              height: size,
              transform: [{ rotate: "0deg" }],
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
                borderColor: color,
                transform: [{ rotate: `${Math.min(degrees, 180)}deg` }],
                transformOrigin: "center bottom",
              },
            ]}
          />
        </View>
      )}

      {/* Second half (180-360deg) */}
      {degrees > 180 && (
        <View
          style={[
            styles.arcContainer,
            {
              width: size,
              height: size,
              transform: [{ rotate: "180deg" }],
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
                borderColor: color,
                transform: [{ rotate: `${degrees - 180}deg` }],
                transformOrigin: "center bottom",
              },
            ]}
          />
        </View>
      )}

      {/* Inner circle */}
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
  );
}

const styles = StyleSheet.create({
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
    fontSize: FontSizes.xxl,
    fontWeight: "800",
  },
  centerSublabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
    marginTop: 2,
  },
});
