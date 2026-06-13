/**
 * ProgressBar component -- horizontal progress indicator with optional label.
 * Used across health detail screens for goals, ranges, and breakdowns.
 */

import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

import { Colors, Radii } from "@/lib/constants";

interface ProgressBarProps {
  /** Progress value 0-100 */
  progress: number;
  /** Bar fill color */
  color?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Bar height */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  progress,
  color = Colors.gold,
  trackColor = Colors.navyLight,
  height = 8,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }, style]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clampedProgress}%`,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: Radii.full,
  },
});
