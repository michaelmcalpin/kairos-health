/**
 * Workouts screen — active program, today's workout, and recent history.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { History } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const SAMPLE_ACTIVE_PROGRAM = {
  name: "Hypertrophy Phase 2",
  week: 3,
  totalWeeks: 8,
  completedWorkouts: 10,
  totalWorkouts: 32,
};

const SAMPLE_TODAY_WORKOUT = {
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

const SAMPLE_RECENT_HISTORY = [
  { date: "Jun 12", name: "Lower Body", duration: "62 min" },
  { date: "Jun 10", name: "Upper Body Pull", duration: "48 min" },
  { date: "Jun 8", name: "Upper Body Push", duration: "54 min" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function WorkoutsScreen() {
  const router = useRouter();

  /* ---- tRPC queries & mutations ---- */
  const programQuery = trpc.clientPortal.workouts.getActiveProgram.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const workoutsQuery = trpc.clientPortal.workouts.list.useQuery({ limit: 20 }, DEFAULT_QUERY_OPTIONS);
  const statsQuery = trpc.clientPortal.workouts.stats.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const quickLogMutation = trpc.clientPortal.workouts.quickLog.useMutation({
    onSuccess: () => { workoutsQuery.refetch(); statsQuery.refetch(); },
  });

  /* ---- Map API data with sample fallback ---- */
  const activeProgram = useMemo(() => {
    if (programQuery.data) {
      const p = programQuery.data as any;
      return {
        name: p.name ?? p.programName ?? SAMPLE_ACTIVE_PROGRAM.name,
        week: p.currentWeek ?? p.week ?? SAMPLE_ACTIVE_PROGRAM.week,
        totalWeeks: p.totalWeeks ?? p.durationWeeks ?? SAMPLE_ACTIVE_PROGRAM.totalWeeks,
        completedWorkouts: p.completedWorkouts ?? p.workoutsCompleted ?? SAMPLE_ACTIVE_PROGRAM.completedWorkouts,
        totalWorkouts: p.totalWorkouts ?? SAMPLE_ACTIVE_PROGRAM.totalWorkouts,
      };
    }
    return SAMPLE_ACTIVE_PROGRAM;
  }, [programQuery.data]);

  const todayWorkout = useMemo(() => {
    if (programQuery.data) {
      const p = programQuery.data as any;
      const todayW = p.todayWorkout ?? p.nextWorkout;
      if (todayW) {
        return {
          name: todayW.name ?? todayW.title ?? SAMPLE_TODAY_WORKOUT.name,
          estimatedDuration: todayW.estimatedDuration
            ? `${todayW.estimatedDuration} min`
            : todayW.durationMinutes
              ? `${todayW.durationMinutes} min`
              : SAMPLE_TODAY_WORKOUT.estimatedDuration,
          exercises: (todayW.exercises ?? []).map((ex: any) => ({
            name: ex.name,
            sets: ex.sets ?? 3,
            reps: ex.reps ?? 10,
            weight: ex.weightLbs ? `${ex.weightLbs} lbs` : null,
            rest: ex.restSeconds ? `${ex.restSeconds}s` : "60s",
          })),
        };
      }
    }
    return SAMPLE_TODAY_WORKOUT;
  }, [programQuery.data]);

  const recentHistory = useMemo(() => {
    if (workoutsQuery.data && Array.isArray(workoutsQuery.data) && workoutsQuery.data.length > 0) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return (workoutsQuery.data as any[]).slice(0, 3).map((w: any) => {
        const d = new Date(w.date ?? w.createdAt);
        return {
          date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
          name: w.type ?? w.name ?? w.title ?? "Workout",
          duration: `${w.durationMinutes ?? 0} min`,
        };
      });
    }
    return SAMPLE_RECENT_HISTORY;
  }, [workoutsQuery.data]);

  const progress = activeProgram.completedWorkouts / activeProgram.totalWorkouts;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Workouts",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/protocols/workout-history")}
              style={{ padding: 8 }}
            >
              <History size={22} color={Colors.gold} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Program */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Active Program</Text>
            <Badge label={programQuery.data ? "Active" : "Sample"} variant="success" />
          </View>

          <Text style={styles.programName}>{activeProgram.name}</Text>
          <Text style={styles.programWeek}>
            Week {activeProgram.week} of {activeProgram.totalWeeks}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {activeProgram.completedWorkouts}/{activeProgram.totalWorkouts} workouts
            completed
          </Text>
        </Card>

        {/* Today's Workout */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <Text style={styles.duration}>{todayWorkout.estimatedDuration}</Text>
          </View>

          <Text style={styles.workoutName}>{todayWorkout.name}</Text>

          {/* Exercise list */}
          <View style={styles.exerciseList}>
            {todayWorkout.exercises.map((ex: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.exerciseRow,
                  idx < todayWorkout.exercises.length - 1 && styles.exerciseBorder,
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
            onPress={() => router.push({ pathname: "/protocols/workout-session", params: { workoutName: todayWorkout.name, exercises: JSON.stringify(todayWorkout.exercises) } })}
          />
        </Card>

        {/* Quick Log */}
        <Button
          title="Quick Log Workout"
          variant="secondary"
          size="md"
          onPress={() => {
            Alert.alert(
              "Quick Log",
              "Log a quick workout session?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log 30 min",
                  onPress: () =>
                    quickLogMutation.mutate({
                      type: todayWorkout.name,
                      durationMinutes: 30,
                      notes: "Quick logged from mobile",
                    }),
                },
                {
                  text: "Log 60 min",
                  onPress: () =>
                    quickLogMutation.mutate({
                      type: todayWorkout.name,
                      durationMinutes: 60,
                      notes: "Quick logged from mobile",
                    }),
                },
              ]
            );
          }}
        />

        {/* Recent History */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>

          {recentHistory.map((session: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.historyRow,
                idx < recentHistory.length - 1 && styles.historyBorder,
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
