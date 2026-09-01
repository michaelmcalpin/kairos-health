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
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { History, PlayCircle } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function WorkoutsScreen() {
  const router = useRouter();

  /* ---- Date range for time-series queries (last 180 days) ---- */
  const rangeEnd = new Date().toISOString().split("T")[0];
  const rangeStart = new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0];

  /* ---- tRPC queries & mutations ---- */
  const programQuery = trpc.clientPortal.workouts.getActiveProgram.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const workoutsQuery = trpc.clientPortal.workouts.list.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    DEFAULT_QUERY_OPTIONS,
  );
  const statsQuery = trpc.clientPortal.workouts.stats.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    DEFAULT_QUERY_OPTIONS,
  );
  const quickLogMutation = trpc.clientPortal.workouts.quickLog.useMutation({
    onSuccess: () => { workoutsQuery.refetch(); statsQuery.refetch(); },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Could not log workout.");
    },
  });

  /* ---- Map real API data ONLY — no fabricated program ---- */
  const activeProgram = useMemo(() => {
    if (!programQuery.data) return null;
    const p = programQuery.data as any;
    return {
      name: p.name ?? p.programName ?? "Training Program",
      week: p.currentWeek ?? p.week ?? null,
      totalWeeks: p.totalWeeks ?? p.durationWeeks ?? null,
      completedWorkouts: p.completedWorkouts ?? p.workoutsCompleted ?? 0,
      totalWorkouts: p.totalWorkouts ?? 0,
    };
  }, [programQuery.data]);

  const hasProgram = !!activeProgram;

  const todayWorkout = useMemo(() => {
    if (!programQuery.data) return null;
    const p = programQuery.data as any;
    const todayW = p.todayWorkout ?? p.nextWorkout;
    if (!todayW) return null;
    return {
      name: todayW.name ?? todayW.title ?? "Today's Workout",
      estimatedDuration: todayW.estimatedDuration
        ? `${todayW.estimatedDuration} min`
        : todayW.durationMinutes
          ? `${todayW.durationMinutes} min`
          : null,
      exercises: (todayW.exercises ?? []).map((ex: any) => ({
        name: ex.name || ex.exerciseId || "Exercise",
        muscleGroup: ex.muscleGroup ?? null,
        sets: ex.sets ?? 3,
        reps: ex.reps ?? 10,
        weight: ex.weightLbs ? `${ex.weightLbs} lbs` : null,
        rest: ex.restSeconds ? `${ex.restSeconds}s` : "60s",
        notes: ex.notes || null,
        videoUrl: ex.videoUrl || null,
      })),
    };
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
    return [];
  }, [workoutsQuery.data]);

  const progress =
    activeProgram && activeProgram.totalWorkouts > 0
      ? activeProgram.completedWorkouts / activeProgram.totalWorkouts
      : 0;

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
        {programQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        ) : !hasProgram || !activeProgram ? (
          <EmptyState
            icon="activity"
            title="No active training program"
            message="Once your coach assigns a training program, your active plan and today's workout will appear here."
          />
        ) : (
        <>
        {/* Active Program */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Active Program</Text>
            <Badge label="Active" variant="success" />
          </View>

          <Text style={styles.programName}>{activeProgram.name}</Text>
          {activeProgram.week != null && activeProgram.totalWeeks != null && (
            <Text style={styles.programWeek}>
              Week {activeProgram.week} of {activeProgram.totalWeeks}
            </Text>
          )}

          {/* Progress bar */}
          {activeProgram.totalWorkouts > 0 && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {activeProgram.completedWorkouts}/{activeProgram.totalWorkouts} workouts
                completed
              </Text>
            </>
          )}
        </Card>

        {/* Today's Workout */}
        {todayWorkout && (
          <Card style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Today's Workout</Text>
              {todayWorkout.estimatedDuration && (
                <Text style={styles.duration}>{todayWorkout.estimatedDuration}</Text>
              )}
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
                    <View style={styles.exerciseNameRow}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      {ex.muscleGroup ? (
                        <View style={styles.muscleBadge}>
                          <Text style={styles.muscleText}>
                            {String(ex.muscleGroup).replace(/_/g, " ")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.exerciseDetail}>
                      {ex.sets}x{ex.reps}
                      {ex.weight ? ` @ ${ex.weight}` : ""}
                    </Text>
                    {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                    {ex.videoUrl ? (
                      <Pressable
                        onPress={() => Linking.openURL(ex.videoUrl)}
                        hitSlop={10}
                        style={styles.watchBtn}
                      >
                        <PlayCircle size={15} color={Colors.gold} />
                        <Text style={styles.watchText}>Watch demo</Text>
                      </Pressable>
                    ) : null}
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
        )}

        {/* Quick Log */}
        <Button
          title="Quick Log Workout"
          variant="secondary"
          size="md"
          onPress={() => {
            const noteName = todayWorkout?.name ?? "Workout";
            Alert.alert(
              "Quick Log",
              "Log a quick workout session?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log 30 min",
                  onPress: () =>
                    quickLogMutation.mutate({
                      workoutType: "strength",
                      durationMinutes: 30,
                      notes: `${noteName} — quick logged from mobile`,
                    }),
                },
                {
                  text: "Log 60 min",
                  onPress: () =>
                    quickLogMutation.mutate({
                      workoutType: "strength",
                      durationMinutes: 60,
                      notes: `${noteName} — quick logged from mobile`,
                    }),
                },
              ]
            );
          }}
        />

        {/* Recent History */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>

          {recentHistory.length === 0 ? (
            <Text style={styles.emptyHistory}>No workouts logged yet.</Text>
          ) : (
            recentHistory.map((session: any, idx: number) => (
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
            ))
          )}
        </Card>
        </>
        )}
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
  loadingWrap: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHistory: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontStyle: "italic",
    paddingVertical: Spacing.sm,
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
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  exerciseName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  muscleBadge: {
    backgroundColor: Colors.navyLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  muscleText: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    textTransform: "capitalize",
  },
  exerciseNotes: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 3 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: Radii.md,
    backgroundColor: "rgba(212,175,55,0.12)",
  },
  watchText: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
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
