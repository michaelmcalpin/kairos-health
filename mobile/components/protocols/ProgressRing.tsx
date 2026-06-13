/**
 * ProgressRing -- Circular SVG progress ring for protocol completion.
 *
 * Displays a gold arc on a dark track with fraction text centered inside.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors, FontSizes } from "@/lib/constants";

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({
  completed,
  total,
  size = 120,
  strokeWidth = 10,
}: ProgressRingProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percent / 100) * circumference;

  const color =
    percent >= 80 ? Colors.success : percent >= 50 ? Colors.gold : Colors.warning;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.border}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.percentText, { fontSize: size * 0.22 }]}>
          {percent}%
        </Text>
        <Text style={styles.fractionText}>
          {completed}/{total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  labelContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    color: Colors.white,
    fontWeight: "800",
  },
  fractionText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    marginTop: 2,
  },
});
