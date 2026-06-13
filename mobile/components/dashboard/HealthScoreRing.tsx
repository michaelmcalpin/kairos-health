/**
 * HealthScoreRing — Circular SVG progress ring for overall health score.
 *
 * Renders a gold arc on a dark track with the numeric score centered inside.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors, FontSizes } from "@/lib/constants";

interface HealthScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score >= 85) return Colors.success;
  if (score >= 70) return Colors.gold;
  if (score >= 55) return Colors.warning;
  return Colors.danger;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Focus";
}

export function HealthScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
}: HealthScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

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
        <Text style={[styles.scoreText, { fontSize: size * 0.28 }]}>
          {score}
        </Text>
        <Text style={[styles.labelText, { color }]}>{getScoreLabel(score)}</Text>
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
  scoreText: {
    color: Colors.white,
    fontWeight: "800",
  },
  labelText: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 2,
  },
});
