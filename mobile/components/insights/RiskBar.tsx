/**
 * RiskBar -- horizontal colored bar indicating risk level (low / moderate / high).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type RiskLevel = "low" | "moderate" | "high";

interface RiskBarProps {
  label: string;
  level: RiskLevel;
  description?: string;
}

const riskConfig: Record<RiskLevel, { color: string; bgColor: string; width: string; label: string }> = {
  low: {
    color: Colors.success,
    bgColor: Colors.successMuted,
    width: "30%",
    label: "Low",
  },
  moderate: {
    color: Colors.warning,
    bgColor: Colors.warningMuted,
    width: "60%",
    label: "Moderate",
  },
  high: {
    color: Colors.danger,
    bgColor: Colors.dangerMuted,
    width: "90%",
    label: "High",
  },
};

export function RiskBar({ label, level, description }: RiskBarProps) {
  const config = riskConfig[level];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.levelLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <View
          style={[
            styles.trackFill,
            {
              backgroundColor: config.color,
              width: config.width as any,
            },
          ]}
        />
      </View>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
  },
  levelLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trackOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
  },
  description: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 4,
    lineHeight: 16,
  },
});
