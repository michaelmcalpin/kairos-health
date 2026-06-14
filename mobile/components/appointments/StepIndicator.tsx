/**
 * StepIndicator — horizontal progress bar showing 4 booking steps.
 * Active step is gold, completed steps filled gold, future steps dim.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

const STEP_LABELS = ["Provider", "Type", "Date & Time", "Confirm"];

interface StepIndicatorProps {
  currentStep: number; // 0-indexed
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {STEP_LABELS.map((label, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isFuture = i > currentStep;

        return (
          <View key={label} style={styles.stepWrapper}>
            {/* Connector line (before dot, skip first) */}
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  isCompleted || isActive
                    ? styles.connectorActive
                    : styles.connectorDim,
                ]}
              />
            )}

            {/* Dot */}
            <View
              style={[
                styles.dot,
                isCompleted && styles.dotCompleted,
                isActive && styles.dotActive,
                isFuture && styles.dotFuture,
              ]}
            >
              {isCompleted ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.dotNumber,
                    isActive && styles.dotNumberActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
                isCompleted && styles.labelCompleted,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  stepWrapper: {
    alignItems: "center",
    flex: 1,
  },
  connector: {
    position: "absolute",
    top: 14,
    right: "50%",
    width: "100%",
    height: 2,
    zIndex: -1,
  },
  connectorActive: {
    backgroundColor: Colors.gold,
  },
  connectorDim: {
    backgroundColor: Colors.border,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  dotCompleted: {
    backgroundColor: Colors.gold,
  },
  dotActive: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  dotFuture: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dotNumber: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.silver,
  },
  dotNumberActive: {
    color: Colors.gold,
  },
  checkmark: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.dark,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.silver,
    textAlign: "center",
  },
  labelActive: {
    color: Colors.gold,
    fontWeight: "600",
  },
  labelCompleted: {
    color: Colors.goldLight,
  },
});
