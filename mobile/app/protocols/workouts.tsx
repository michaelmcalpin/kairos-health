/**
 * Workouts screen — active program, today's workout, and recent history.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const ACTIVE_PROGRAM = {
  name: "Hypertrophy Phase 2",
  week: 3,
  totalWeeks: 8,
  completedWorkouts: 10,
  totalWorkouts: 32,
};

const TODAY_WORKOUT = {
  name: "Upper Body Push",
  estimatedDuration: "55 min",
  exercises: [
    { name: "Bench Press", sets: 4, reps: 8, weight: "185 lbs", rest: "90s" },
    { name: "Overhead Press", sets: 3, reps: 10, weight: "95 lbs", rest: "75s" },
    { name: "Incline DB Press", sets: 3, reps: 12, weight: "55 lbs", rest: "60s" },
    { name: "Cable Flyes", sets: 3, reps: 15, weight: null, rest: "45s" },
    { name: "Tricep Pushdowns", sets: 3, reps: 12, weight: null, rest: "45s" },
  ],
};

const RECENT_HISTORY = [
  { date: "Jun 12", name: "Lower Body", duration: "62 min" },
  { date: "Jun 10", name: "Upper Body Pull", duration: "48 min" },
  { date: "Jun 8", name: "Upper Body Push", duration: "54 min" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function WorkoutsScreen() {
  const progress = ACTIVE_PROGRAM.completedWorkouts / ACTIVE_PROGRAM.totalWorkouts;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Workouts" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Program */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Active Program</Text>
            <Badge label="Active" variant="success" />
          </View>

          <Text style={styles.programName}>{ACTIVE_PROGRAM.name}</Text>
          <Text style={styles.programWeek}>
            Week {ACTIVE_PROGRAM.week} of {ACTIVE_PROGRAM.totalWeeks}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {ACTIVE_PROGRAM.completedWorkouts}/{ACTIVE_PROGRAM.totalWorkouts} workouts
            completed
          </Text>
        </Card>

        {/* Today's Workout */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <Text style={styles.duration}>{TODAY_WORKOUT.estimatedDuration}</Text>
          </View>

          <Text style={styles.workoutName}>{TODAY_WORKOUT.name}</Text>

          {/* Exercise list */}
          <View style={styles.exerciseList}>
            {TODAY_WORKOUT.exercises.map((ex, idx) => (
              <View
                key={idx}
                style={[
                  styles.exerciseRow,
                  idx < TODAY_WORKOUT.exercises.length - 1 && styles.exerciseBorder,
                ]}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseDetail}>
                    {ex.sets}x{ex.reps}
                    {ex.weight ? ` @ ${ex.weight}` : ""}
                  </Text>
                </View>
                <View style={styles.restBadge}>
                  <Text style={styles.restText}>Rest {ex.rest}</Text>
                </View>
              </View>
            ))}
          </View>

          <Button
            title="Start Workout"
            variant="primary"
            size="lg"
            style={styles.startButton}
          />
        </Card>

        {/* Recent History */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>

          {RECENT_HISTORY.map((session, idx) => (
            <View
              key={idx}
              style={[
                styles.historyRow,
                idx < RECENT_HISTORY.length - 1 && styles.historyBorder,
              ]}
            >
              <View>
                <Text style={styles.historyName}>{session.name}</Text>
                <Text style={styles.historyDate}>{session.date}</Text>
              </View>
              <Text style={styles.historyDuration}>{session.duration}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  /* Sections */
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Active program */
  programName: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  programWeek: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Today's workout */
  workoutName: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  duration: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Exercise list */
  exerciseList: {
    marginTop: Spacing.xs,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
  },
  exerciseBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  exerciseDetail: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  restBadge: {
    backgroundColor: Colors.navyLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  restText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Start button */
  startButton: {
    marginTop: Spacing.sm,
  },

  /* History */
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  historyBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  historyDate: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
  },
  historyDuration: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
});
