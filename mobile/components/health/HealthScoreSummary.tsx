/**
 * HealthScoreSummary -- Hero card with large health score ring, trend info,
 * and sub-scores.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { HealthScoreRing } from "@/components/dashboard/HealthScoreRing";

interface HealthScoreSummaryProps {
  score: number;
  trend: "up" | "down" | "flat";
  trendDelta: number;
  trendLabel: string;
  subScores: { label: string; value: number }[];
}

export function HealthScoreSummary({
  score,
  trend,
  trendDelta,
  trendLabel,
  subScores,
}: HealthScoreSummaryProps) {
  const trendColor =
    trend === "up" ? Colors.success : trend === "down" ? Colors.danger : Colors.silver;
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <Card style={styles.card}>
      <View style={styles.topSection}>
        <HealthScoreRing score={score} size={140} strokeWidth={11} />

        <View style={styles.trendContainer}>
          <View style={styles.trendRow}>
            <Text style={[styles.trendArrow, { color: trendColor }]}>
              {trendArrow}
            </Text>
            <Text style={[styles.trendDelta, { color: trendColor }]}>
              {trendDelta > 0 ? "+" : ""}
              {trendDelta}
            </Text>
          </View>
          <Text style={styles.trendLabel}>{trendLabel}</Text>
        </View>
      </View>

      {/* Sub-score breakdown */}
      <View style={styles.subScoresRow}>
        {subScores.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.subScore}>
              <Text style={styles.subScoreValue}>{s.value}</Text>
              <Text style={styles.subScoreLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  trendContainer: {
    alignItems: "flex-start",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  trendArrow: {
    fontSize: FontSizes.xl,
    fontWeight: "800",
  },
  trendDelta: {
    fontSize: FontSizes.xl,
    fontWeight: "800",
  },
  trendLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    maxWidth: 120,
  },
  subScoresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  subScore: {
    alignItems: "center",
    flex: 1,
  },
  subScoreValue: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  subScoreLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: Colors.border,
  },
});
