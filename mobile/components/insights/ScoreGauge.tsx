/**
 * ScoreGauge -- circular score display with trend indicator.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  trend: number; // positive = improving, negative = declining
  label?: string;
}

export function ScoreGauge({
  score,
  maxScore = 100,
  trend,
  label = "Health Score",
}: ScoreGaugeProps) {
  const getScoreColor = () => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.danger;
  };

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp size={16} color={Colors.success} />;
    if (trend < 0) return <TrendingDown size={16} color={Colors.danger} />;
    return <Minus size={16} color={Colors.silver} />;
  };

  const getTrendColor = () => {
    if (trend > 0) return Colors.success;
    if (trend < 0) return Colors.danger;
    return Colors.silver;
  };

  const scoreColor = getScoreColor();

  return (
    <View style={styles.container}>
      {/* Score circle */}
      <View style={[styles.circle, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.maxText}>/{maxScore}</Text>
      </View>

      {/* Label and trend */}
      <View style={styles.meta}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.trendRow}>
          {getTrendIcon()}
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {trend > 0 ? "+" : ""}
            {trend} pts
          </Text>
          <Text style={styles.trendPeriod}>vs. last period</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  scoreText: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  maxText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: -2,
  },
  meta: {
    flex: 1,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  trendPeriod: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
});
