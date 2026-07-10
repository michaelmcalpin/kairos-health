/**
 * Workout History — calendar view of past workouts with stats and detail.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Calendar,
  Dumbbell,
  Clock,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface WorkoutLog {
  id: string;
  name: string;
  date: string; // ISO date string
  durationMinutes: number;
  totalVolume: number;
  exerciseCount: number;
  setsCompleted: number;
  exercises: {
    name: string;
    sets: { weight: number; reps: number; rpe: number | null }[];
  }[];
}

/* ------------------------------------------------------------------ */
/* Sample data: 12 workouts over past 30 days                          */
/* ------------------------------------------------------------------ */

function generateSampleWorkouts(): WorkoutLog[] {
  const today = new Date(2026, 5, 16); // June 16, 2026

  const workoutTemplates = [
    {
      name: "Push Day",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { weight: 185, reps: 10, rpe: 8 },
            { weight: 185, reps: 9, rpe: 8 },
            { weight: 185, reps: 8, rpe: 9 },
            { weight: 185, reps: 7, rpe: 9 },
          ],
        },
        {
          name: "Incline DB Press",
          sets: [
            { weight: 55, reps: 11, rpe: 7 },
            { weight: 55, reps: 10, rpe: 8 },
            { weight: 55, reps: 9, rpe: 8 },
          ],
        },
        {
          name: "Cable Flyes",
          sets: [
            { weight: 30, reps: 14, rpe: 7 },
            { weight: 30, reps: 13, rpe: 7 },
            { weight: 30, reps: 12, rpe: 8 },
          ],
        },
        {
          name: "Tricep Pushdowns",
          sets: [
            { weight: 50, reps: 12, rpe: 7 },
            { weight: 50, reps: 11, rpe: 8 },
            { weight: 50, reps: 10, rpe: 8 },
          ],
        },
        {
          name: "Overhead Tricep Extension",
          sets: [
            { weight: 35, reps: 13, rpe: 7 },
            { weight: 35, reps: 12, rpe: 8 },
            { weight: 35, reps: 11, rpe: 8 },
          ],
        },
      ],
    },
    {
      name: "Pull Day",
      exercises: [
        {
          name: "Barbell Rows",
          sets: [
            { weight: 155, reps: 10, rpe: 8 },
            { weight: 155, reps: 9, rpe: 8 },
            { weight: 155, reps: 8, rpe: 9 },
            { weight: 155, reps: 8, rpe: 9 },
          ],
        },
        {
          name: "Lat Pulldowns",
          sets: [
            { weight: 120, reps: 12, rpe: 7 },
            { weight: 120, reps: 11, rpe: 8 },
            { weight: 120, reps: 10, rpe: 8 },
          ],
        },
        {
          name: "Seated Cable Rows",
          sets: [
            { weight: 100, reps: 12, rpe: 7 },
            { weight: 100, reps: 11, rpe: 7 },
            { weight: 100, reps: 10, rpe: 8 },
          ],
        },
        {
          name: "Face Pulls",
          sets: [
            { weight: 40, reps: 15, rpe: 6 },
            { weight: 40, reps: 14, rpe: 7 },
            { weight: 40, reps: 13, rpe: 7 },
          ],
        },
        {
          name: "Barbell Curls",
          sets: [
            { weight: 65, reps: 12, rpe: 7 },
            { weight: 65, reps: 10, rpe: 8 },
            { weight: 65, reps: 9, rpe: 9 },
          ],
        },
      ],
    },
    {
      name: "Leg Day",
      exercises: [
        {
          name: "Barbell Squats",
          sets: [
            { weight: 225, reps: 8, rpe: 8 },
            { weight: 225, reps: 7, rpe: 9 },
            { weight: 225, reps: 6, rpe: 9 },
            { weight: 225, reps: 6, rpe: 10 },
          ],
        },
        {
          name: "Romanian Deadlifts",
          sets: [
            { weight: 185, reps: 10, rpe: 8 },
            { weight: 185, reps: 9, rpe: 8 },
            { weight: 185, reps: 8, rpe: 9 },
          ],
        },
        {
          name: "Leg Press",
          sets: [
            { weight: 360, reps: 12, rpe: 7 },
            { weight: 360, reps: 11, rpe: 8 },
            { weight: 360, reps: 10, rpe: 8 },
          ],
        },
        {
          name: "Leg Curls",
          sets: [
            { weight: 80, reps: 12, rpe: 7 },
            { weight: 80, reps: 11, rpe: 7 },
            { weight: 80, reps: 10, rpe: 8 },
          ],
        },
        {
          name: "Calf Raises",
          sets: [
            { weight: 135, reps: 15, rpe: 7 },
            { weight: 135, reps: 14, rpe: 8 },
            { weight: 135, reps: 13, rpe: 8 },
          ],
        },
      ],
    },
  ];

  // Generate 12 workouts spread across the last 30 days
  const offsets = [0, 2, 4, 6, 8, 11, 13, 16, 18, 21, 24, 27];
  return offsets.map((dayOffset, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const template = workoutTemplates[idx % workoutTemplates.length];
    const totalVolume = template.exercises.reduce(
      (vol, ex) =>
        vol + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
      0
    );
    const setsCompleted = template.exercises.reduce(
      (n, ex) => n + ex.sets.length,
      0
    );
    return {
      id: `wl-${idx}`,
      name: template.name,
      date: d.toISOString().split("T")[0],
      durationMinutes: 45 + Math.floor(Math.random() * 25),
      totalVolume,
      exerciseCount: template.exercises.length,
      setsCompleted,
      exercises: template.exercises,
    };
  });
}

const SAMPLE_WORKOUTS = generateSampleWorkouts();

/* ------------------------------------------------------------------ */
/* API -> WorkoutLog mapper                                            */
/* ------------------------------------------------------------------ */

function mapApiWorkout(raw: any): WorkoutLog {
  const exercises = (raw.exercises ?? []).map((ex: any) => ({
    name: ex.name ?? "",
    sets: (ex.sets ?? []).map((s: any) => ({
      weight: s.weight ?? 0,
      reps: s.reps ?? 0,
      rpe: s.rpe ?? null,
    })),
  }));
  const totalVolume = exercises.reduce(
    (vol: number, ex: any) =>
      vol + ex.sets.reduce((s: number, set: any) => s + set.weight * set.reps, 0),
    0
  );
  const setsCompleted = exercises.reduce(
    (n: number, ex: any) => n + ex.sets.length,
    0
  );
  return {
    id: raw.id,
    name: raw.name ?? raw.title ?? "Workout",
    date: raw.date ?? (raw.createdAt ? raw.createdAt.split("T")[0] : ""),
    durationMinutes: raw.durationMinutes ?? raw.duration ?? 0,
    totalVolume: raw.totalVolume ?? totalVolume,
    exerciseCount: exercises.length,
    setsCompleted: raw.setsCompleted ?? setsCompleted,
    exercises,
  };
}

/* ------------------------------------------------------------------ */
/* Calendar helpers                                                    */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonthYear(year: number, month: number) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[month]} ${year}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function WorkoutHistoryScreen() {
  const query = trpc.clientPortal.workouts.list.useQuery(
    { limit: 50 },
    DEFAULT_QUERY_OPTIONS,
  );

  const workouts: WorkoutLog[] = query.data
    ? (query.data as any[]).map(mapApiWorkout)
    : SAMPLE_WORKOUTS;

  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(5); // June (0-indexed)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(
    null
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  /* Build a set of dates that have workouts */
  const workoutDates = useMemo(() => {
    const dates = new Set<string>();
    workouts.forEach((w) => dates.add(w.date));
    return dates;
  }, [workouts]);

  /* Stats */
  const today = new Date(2026, 5, 16);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setDate(today.getDate() - 30);

  const workoutsThisWeek = workouts.filter(
    (w) => new Date(w.date) >= oneWeekAgo
  ).length;
  const workoutsThisMonth = workouts.filter(
    (w) => new Date(w.date) >= oneMonthAgo
  ).length;

  // Calculate streak
  const computeStreak = () => {
    let streak = 0;
    const sorted = [...workouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (sorted.length === 0) return 0;

    let checkDate = new Date(today);
    // Allow gap of up to 2 days between workouts for streak
    for (let i = 0; i < sorted.length; i++) {
      const wDate = new Date(sorted[i].date);
      const dayDiff = Math.floor(
        (checkDate.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayDiff <= 3) {
        streak++;
        checkDate = wDate;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = computeStreak();

  /* Calendar rendering */
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfWeek(calendarYear, calendarMonth);

  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatVolume = (vol: number) =>
    vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol.toString();

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Workout History" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Calendar size={18} color={Colors.info} />
            <Text style={styles.statValue}>{workoutsThisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Dumbbell size={18} color={Colors.success} />
            <Text style={styles.statValue}>{workoutsThisMonth}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={18} color={Colors.gold} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {query.isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          {/* Month navigation */}
          <View style={styles.calendarHeader}>
            <Pressable onPress={goToPrevMonth} style={styles.monthArrow}>
              <ChevronLeft size={20} color={Colors.silver} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {formatMonthYear(calendarYear, calendarMonth)}
            </Text>
            <Pressable onPress={goToNextMonth} style={styles.monthArrow}>
              <ChevronRight size={20} color={Colors.silver} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {/* Empty cells for days before the first */}
            {Array.from({ length: firstDay }, (_, i) => (
              <View key={`empty-${i}`} style={styles.calendarCell} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarYear}-${String(
                calendarMonth + 1
              ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasWorkout = workoutDates.has(dateStr);
              const isToday =
                day === 16 &&
                calendarMonth === 5 &&
                calendarYear === 2026;

              return (
                <View key={day} style={styles.calendarCell}>
                  <View
                    style={[
                      styles.dayCircle,
                      hasWorkout && styles.dayCircleWorkout,
                      isToday && styles.dayCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        hasWorkout && styles.dayTextWorkout,
                        isToday && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {hasWorkout && <View style={styles.workoutDot} />}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Workout list */}
        <Card style={styles.listCard}>
          <Text style={styles.listTitle}>PAST WORKOUTS</Text>
          {workouts.map((workout) => (
            <Pressable
              key={workout.id}
              onPress={() =>
                setSelectedWorkout(
                  selectedWorkout?.id === workout.id ? null : workout
                )
              }
              style={[
                styles.workoutRow,
                selectedWorkout?.id === workout.id && styles.workoutRowSelected,
              ]}
            >
              <View style={styles.workoutInfo}>
                <View style={styles.workoutNameRow}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Badge
                    label={workout.name.includes("Push")
                      ? "Push"
                      : workout.name.includes("Pull")
                        ? "Pull"
                        : "Legs"}
                    variant={
                      workout.name.includes("Push")
                        ? "info"
                        : workout.name.includes("Pull")
                          ? "warning"
                          : "success"
                    }
                  />
                </View>
                <Text style={styles.workoutDate}>
                  {formatDate(workout.date)}
                </Text>
                <View style={styles.workoutMeta}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={Colors.silver} />
                    <Text style={styles.metaText}>
                      {workout.durationMinutes} min
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Dumbbell size={12} color={Colors.silver} />
                    <Text style={styles.metaText}>
                      {formatVolume(workout.totalVolume)} lbs
                    </Text>
                  </View>
                  <Text style={styles.metaText}>
                    {workout.exerciseCount} exercises
                  </Text>
                </View>
              </View>

              {/* Expanded detail */}
              {selectedWorkout?.id === workout.id && (
                <View style={styles.detailContainer}>
                  {workout.exercises.map((ex, exIdx) => (
                    <View key={exIdx} style={styles.detailExercise}>
                      <Text style={styles.detailExerciseName}>{ex.name}</Text>
                      <View style={styles.detailSetsHeader}>
                        <Text style={styles.detailHeaderText}>SET</Text>
                        <Text style={styles.detailHeaderText}>WEIGHT</Text>
                        <Text style={styles.detailHeaderText}>REPS</Text>
                        <Text style={styles.detailHeaderText}>RPE</Text>
                      </View>
                      {ex.sets.map((set, setIdx) => (
                        <View key={setIdx} style={styles.detailSetRow}>
                          <Text style={styles.detailSetText}>
                            {setIdx + 1}
                          </Text>
                          <Text style={styles.detailSetText}>
                            {set.weight} lbs
                          </Text>
                          <Text style={styles.detailSetText}>{set.reps}</Text>
                          <Text style={styles.detailSetText}>
                            {set.rpe ?? "-"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
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

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Loading */
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },

  /* Calendar */
  calendarCard: {
    gap: Spacing.sm,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrow: {
    padding: Spacing.sm,
  },
  monthTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    width: 40,
    textAlign: "center",
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 4,
    gap: 2,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleWorkout: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
  },
  dayCircleToday: {
    backgroundColor: Colors.gold,
  },
  dayText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontWeight: "500",
  },
  dayTextWorkout: {
    color: Colors.gold,
    fontWeight: "700",
  },
  dayTextToday: {
    color: Colors.dark,
    fontWeight: "700",
  },
  workoutDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },

  /* Workout list */
  listCard: {
    gap: Spacing.sm,
  },
  listTitle: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 1,
  },
  workoutRow: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  workoutRowSelected: {
    backgroundColor: Colors.navyLight,
    borderBottomWidth: 0,
    borderRadius: Radii.md,
  },
  workoutInfo: {
    gap: 4,
  },
  workoutNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workoutName: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
  },
  workoutDate: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  workoutMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Expanded detail */
  detailContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  detailExercise: {
    gap: Spacing.xs,
  },
  detailExerciseName: {
    fontSize: FontSizes.sm,
    fontWeight: "700",
    color: Colors.goldLight,
  },
  detailSetsHeader: {
    flexDirection: "row",
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  detailSetRow: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  detailSetText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    textAlign: "center",
  },
});
