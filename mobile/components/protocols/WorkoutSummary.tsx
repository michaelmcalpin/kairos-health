/**
 * WorkoutSummary — summary card shown after completing a workout.
 * Displays total volume, duration, sets completed, and PRs hit.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Trophy, Clock, Dumbbell, TrendingUp } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface WorkoutSummaryProps {
  workoutName: string;
  duration: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  prsHit: number;
  exerciseCount: number;
}

export function WorkoutSummary({
  workoutName,
  duration,
  totalVolume,
  totalSets,
  totalReps,
  prsHit,
  exerciseCount,
}: WorkoutSummaryProps) {
  const formattedVolume =
    totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k`
      : totalVolume.toString();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Trophy size={28} color={Colors.gold} />
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.workoutName}>{workoutName}</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.infoMuted }]}>
            <Clock size={18} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>{duration}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.successMuted }]}>
            <Dumbbell size={18} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>{formattedVolume} lbs</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.warningMuted }]}>
            <TrendingUp size={18} color={Colors.warning} />
          </View>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: "rgba(200, 169, 81, 0.15)" }]}>
            <Trophy size={18} color={Colors.gold} />
          </View>
          <Text style={styles.statValue}>{prsHit}</Text>
          <Text style={styles.statLabel}>PRs Hit</Text>
        </View>
      </View>

      {/* Bottom stats */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomStat}>
          <Text style={styles.bottomStatValue}>{exerciseCount}</Text>
          <Text style={styles.bottomStatLabel}>Exercises</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomStat}>
          <Text style={styles.bottomStatValue}>{totalReps}</Text>
          <Text style={styles.bottomStatLabel}>Total Reps</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomStat}>
          <Text style={styles.bottomStatValue}>
            {totalSets > 0 ? Math.round(totalVolume / totalSets) : 0}
          </Text>
          <Text style={styles.bottomStatLabel}>Avg Vol/Set</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.gold,
  },
  workoutName: {
    fontSize: FontSizes.md,
    color: Colors.silver,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: "40%",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.navyLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: Colors.navyLight,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  bottomStat: {
    alignItems: "center",
    gap: 2,
  },
  bottomStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  bottomStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  bottomDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
});
