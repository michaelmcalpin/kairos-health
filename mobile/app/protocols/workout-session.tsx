/**
 * Workout Session — live workout execution screen.
 * Tracks sets, reps, weight, RPE with rest timers and exercise queue.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pause, Play, SkipForward, Flag } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ExerciseCard,
  ExerciseQueueItem,
  RestTimer,
  SetInput,
  WorkoutSummary,
} from "@/components/protocols";
import type { ExerciseStatus } from "@/components/protocols";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ExerciseSet {
  weight: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number | null;
  restSeconds: number;
  previousPerformance: string | null;
  loggedSets: ExerciseSet[];
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { workoutName: routeWorkoutName, exercises: routeExercises } = useLocalSearchParams<{
    workoutName?: string;
    exercises?: string;
  }>();

  // Use workout name from route params if provided, otherwise fall back to default
  const workoutName = routeWorkoutName || "Workout";

  /* ---- Parse exercises from route params ---- */
  const parsedExercises = React.useMemo<Exercise[] | null>(() => {
    if (!routeExercises) return null;
    try {
      const raw = JSON.parse(routeExercises) as any[];
      if (!Array.isArray(raw) || raw.length === 0) return null;
      return raw.map((ex: any, idx: number) => {
        const restStr = ex.rest ?? "60s";
        const restMatch = restStr.match?.(/(\d+)/);
        const restSeconds = restMatch ? parseInt(restMatch[1], 10) : 60;
        const weightStr = ex.weight ?? null;
        const weightMatch = weightStr?.match?.(/(\d+(?:\.\d+)?)/);
        const targetWeight = weightMatch ? parseFloat(weightMatch[1]) : null;
        return {
          id: ex.id ?? `exercise-${idx}`,
          name: ex.name ?? `Exercise ${idx + 1}`,
          muscleGroup: ex.muscleGroup ?? "",
          targetSets: ex.sets ?? 3,
          targetRepsMin: ex.repsMin ?? ex.reps ?? 8,
          targetRepsMax: ex.repsMax ?? ex.reps ?? 12,
          targetWeight,
          restSeconds,
          previousPerformance: ex.previousPerformance ?? null,
          loggedSets: [],
        };
      });
    } catch {
      return null;
    }
  }, [routeExercises]);

  /* ---- tRPC mutation ---- */
  const logWorkoutMutation = trpc.clientPortal.workouts.logWorkout.useMutation();

  /* -- Workout state -- */
  const [exercises, setExercises] = useState<Exercise[]>(
    (parsedExercises ?? []).map((e) => ({ ...e, loggedSets: [] }))
  );
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  /* -- Timer state -- */
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* -- Rest timer -- */
  const [isResting, setIsResting] = useState(false);

  /* -- Input state -- */
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [rpeInput, setRpeInput] = useState<number | null>(null);

  /* -- Workout timer -- */
  useEffect(() => {
    if (!isPaused && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isFinished]);

  /* -- Pre-populate weight input for current exercise -- */
  useEffect(() => {
    if (!isFinished) {
      const current = exercises[currentExerciseIdx];
      if (current?.targetWeight) {
        setWeightInput(current.targetWeight.toString());
      } else {
        setWeightInput("");
      }
      setRepsInput("");
      setRpeInput(null);
    }
  }, [currentExerciseIdx, isFinished]);

  /* -- Helpers -- */
  const currentExercise = exercises[currentExerciseIdx];
  const currentSetNumber = currentExercise
    ? currentExercise.loggedSets.length + 1
    : 1;

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  /* -- Complete a set -- */
  const handleCompleteSet = useCallback(() => {
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput, 10) || 0;

    if (reps === 0) {
      Alert.alert("Missing reps", "Please enter the number of reps completed.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setExercises((prev) => {
      const updated = [...prev];
      updated[currentExerciseIdx] = {
        ...updated[currentExerciseIdx],
        loggedSets: [
          ...updated[currentExerciseIdx].loggedSets,
          { weight, reps, rpe: rpeInput, completed: true },
        ],
      };
      return updated;
    });

    setRepsInput("");
    setRpeInput(null);

    // Check if all sets for this exercise are done
    const setsAfter = currentExercise.loggedSets.length + 1;
    if (setsAfter >= currentExercise.targetSets) {
      // Move to next exercise or finish
      if (currentExerciseIdx < exercises.length - 1) {
        setCurrentExerciseIdx((prev) => prev + 1);
        setIsResting(false);
      } else {
        // All exercises done
        setIsFinished(true);
      }
    } else {
      // Start rest timer
      setIsResting(true);
    }
  }, [
    weightInput,
    repsInput,
    rpeInput,
    currentExerciseIdx,
    currentExercise,
    exercises.length,
  ]);

  /* -- Rest complete -- */
  const handleRestComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsResting(false);
  }, []);

  /* -- Skip exercise -- */
  const handleSkipExercise = useCallback(() => {
    if (currentExerciseIdx < exercises.length - 1) {
      setCurrentExerciseIdx((prev) => prev + 1);
      setIsResting(false);
    } else {
      setIsFinished(true);
    }
  }, [currentExerciseIdx, exercises.length]);

  /* -- Finish workout -- */
  const handleFinishWorkout = useCallback(() => {
    Alert.alert(
      "Finish Workout?",
      "Are you sure you want to end this workout? Unfinished exercises will be skipped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          style: "destructive",
          onPress: () => setIsFinished(true),
        },
      ]
    );
  }, []);

  /* -- Compute summary stats -- */
  const computeSummary = () => {
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let exercisesCompleted = 0;

    exercises.forEach((ex) => {
      if (ex.loggedSets.length > 0) exercisesCompleted++;
      ex.loggedSets.forEach((set) => {
        totalVolume += set.weight * set.reps;
        totalSets++;
        totalReps += set.reps;
      });
    });

    return {
      totalVolume,
      totalSets,
      totalReps,
      exercisesCompleted,
      prsHit: totalVolume > 15000 ? 2 : totalVolume > 10000 ? 1 : 0,
    };
  };

  /* -- Determine exercise queue status -- */
  const getExerciseStatus = (idx: number): ExerciseStatus => {
    if (idx < currentExerciseIdx) return "completed";
    if (idx === currentExerciseIdx) return "current";
    return "upcoming";
  };

  /* ---------------------------------------------------------------- */
  /* Finished state                                                    */
  /* ---------------------------------------------------------------- */
  /* -- Submit workout to API on finish -- */
  useEffect(() => {
    if (isFinished) {
      const summary = computeSummary();
      const exerciseData = exercises
        .filter((ex) => ex.loggedSets.length > 0)
        .map((ex) => ({
          name: ex.name,
          sets: ex.loggedSets.length,
          reps: ex.loggedSets.reduce((sum, s) => sum + s.reps, 0),
          weightLbs: ex.loggedSets[0]?.weight ?? undefined,
          notes: ex.muscleGroup,
        }));

      logWorkoutMutation.mutate({
        type: workoutName,
        durationMinutes: Math.round(elapsedSeconds / 60),
        caloriesBurned: undefined,
        notes: `${summary.exercisesCompleted} exercises, ${summary.totalSets} sets, ${summary.totalVolume} lbs total volume`,
        exercises: exerciseData,
      });
    }
  }, [isFinished]);

  if (isFinished) {
    const summary = computeSummary();
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen
          options={{
            title: "Workout Complete",
            headerLeft: () => null,
            gestureEnabled: false,
          }}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <WorkoutSummary
            workoutName={workoutName}
            duration={formatTime(elapsedSeconds)}
            totalVolume={summary.totalVolume}
            totalSets={summary.totalSets}
            totalReps={summary.totalReps}
            prsHit={summary.prsHit}
            exerciseCount={summary.exercisesCompleted}
          />

          <Button
            title="Back to Workouts"
            variant="primary"
            size="lg"
            onPress={() => router.back()}
            style={styles.backButton}
          />

          <Button
            title="View Workout History"
            variant="secondary"
            size="md"
            onPress={() => {
              router.back();
              setTimeout(() => router.push("/protocols/workout-history"), 100);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------------------------------------------------------- */
  /* No exercises loaded                                               */
  /* ---------------------------------------------------------------- */
  if (exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: workoutName }} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.inputCard}>
            <Text style={[styles.inputCardTitle, { textAlign: "center" }]}>
              No Exercises Loaded
            </Text>
            <Text style={{ color: Colors.silver, fontSize: FontSizes.sm, textAlign: "center", lineHeight: 20 }}>
              This workout does not have exercises configured yet. Go back and start a workout from your active program, or ask your coach to add exercises.
            </Text>
            <Button
              title="Go Back"
              variant="primary"
              size="lg"
              onPress={() => router.back()}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Active workout                                                    */
  /* ---------------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: workoutName,
          headerRight: () => null,
          gestureEnabled: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Timer + Pause */}
        <View style={styles.timerBar}>
          <View style={styles.timerInfo}>
            <Text style={styles.timerLabel}>ELAPSED</Text>
            <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>
          </View>

          <Button
            title={isPaused ? "Resume" : "Pause"}
            variant="tertiary"
            size="sm"
            icon={
              isPaused ? (
                <Play size={16} color={Colors.silverLight} />
              ) : (
                <Pause size={16} color={Colors.silverLight} />
              )
            }
            onPress={() => setIsPaused((prev) => !prev)}
          />
        </View>

        {/* Current exercise card */}
        <ExerciseCard
          name={currentExercise.name}
          muscleGroup={currentExercise.muscleGroup}
          currentSet={currentSetNumber}
          totalSets={currentExercise.targetSets}
          targetReps={`${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}`}
          targetWeight={
            currentExercise.targetWeight
              ? `${currentExercise.targetWeight} lbs`
              : null
          }
          previousPerformance={currentExercise.previousPerformance}
        />

        {/* Rest timer */}
        {isResting && (
          <RestTimer
            duration={currentExercise.restSeconds}
            onComplete={handleRestComplete}
            onSkip={handleRestComplete}
          />
        )}

        {/* Input row */}
        {!isResting && (
          <Card style={styles.inputCard}>
            <Text style={styles.inputCardTitle}>Log Set {currentSetNumber}</Text>
            <SetInput
              weight={weightInput}
              reps={repsInput}
              rpe={rpeInput}
              onWeightChange={setWeightInput}
              onRepsChange={setRepsInput}
              onRPEChange={setRpeInput}
            />

            <Button
              title="Complete Set"
              variant="primary"
              size="lg"
              onPress={handleCompleteSet}
              style={styles.completeButton}
            />
          </Card>
        )}

        {/* Exercise queue */}
        <Card style={styles.queueCard}>
          <Text style={styles.queueTitle}>EXERCISES</Text>
          <View style={styles.queueList}>
            {exercises.map((ex, idx) => (
              <ExerciseQueueItem
                key={ex.id}
                name={ex.name}
                sets={ex.targetSets}
                status={getExerciseStatus(idx)}
                completedSets={ex.loggedSets.length}
              />
            ))}
          </View>
        </Card>

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
          <Button
            title="Skip Exercise"
            variant="tertiary"
            size="md"
            icon={<SkipForward size={16} color={Colors.silverLight} />}
            onPress={handleSkipExercise}
            style={styles.bottomButton}
          />
          <Button
            title="Finish Workout"
            variant="danger"
            size="md"
            icon={<Flag size={16} color={Colors.danger} />}
            onPress={handleFinishWorkout}
            style={styles.bottomButton}
          />
        </View>
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
    paddingBottom: Spacing.xxl + 40,
    gap: Spacing.md,
  },

  /* Timer bar */
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  timerInfo: {
    gap: 2,
  },
  timerLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
    fontVariant: ["tabular-nums"],
  },

  /* Input card */
  inputCard: {
    gap: Spacing.md,
  },
  inputCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.gold,
  },
  completeButton: {
    marginTop: Spacing.sm,
  },

  /* Queue */
  queueCard: {
    gap: Spacing.sm,
  },
  queueTitle: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 1,
  },
  queueList: {
    gap: 4,
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  bottomButton: {
    flex: 1,
  },

  /* Finish state */
  backButton: {
    marginTop: Spacing.md,
  },
});
