/**
 * ExerciseCard — large, prominent card showing the current exercise
 * with set indicator, target, and previous performance.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";

interface ExerciseCardProps {
  name: string;
  muscleGroup: string;
  currentSet: number;
  totalSets: number;
  targetReps: string;
  targetWeight: string | null;
  previousPerformance: string | null;
}

export function ExerciseCard({
  name,
  muscleGroup,
  currentSet,
  totalSets,
  targetReps,
  targetWeight,
  previousPerformance,
}: ExerciseCardProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{name}</Text>
        <Badge label={muscleGroup} variant="info" />
      </View>

      {/* Set indicator */}
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set</Text>
        <View style={styles.setIndicators}>
          {Array.from({ length: totalSets }, (_, i) => (
            <View
              key={i}
              style={[
                styles.setDot,
                i < currentSet - 1 && styles.setDotCompleted,
                i === currentSet - 1 && styles.setDotCurrent,
              ]}
            >
              <Text
                style={[
                  styles.setDotText,
                  (i < currentSet - 1 || i === currentSet - 1) &&
                    styles.setDotTextActive,
                ]}
              >
                {i + 1}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.setCounter}>
          {currentSet} of {totalSets}
        </Text>
      </View>

      {/* Target */}
      <View style={styles.targetRow}>
        <View style={styles.targetItem}>
          <Text style={styles.targetLabel}>TARGET</Text>
          <Text style={styles.targetValue}>
            {targetReps} reps
            {targetWeight ? ` @ ${targetWeight}` : ""}
          </Text>
        </View>
      </View>

      {/* Previous performance */}
      {previousPerformance && (
        <View style={styles.previousRow}>
          <Text style={styles.previousLabel}>Last time:</Text>
          <Text style={styles.previousValue}>{previousPerformance}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    flex: 1,
    marginRight: Spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  setLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setIndicators: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  setDot: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  setDotCompleted: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success,
  },
  setDotCurrent: {
    backgroundColor: "rgba(200, 169, 81, 0.2)",
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  setDotText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
  },
  setDotTextActive: {
    color: Colors.white,
  },
  setCounter: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
  },
  targetRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  targetItem: {
    gap: 2,
  },
  targetLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetValue: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  previousRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.navyLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  previousLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  previousValue: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
  },
});
