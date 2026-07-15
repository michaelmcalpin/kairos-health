/**
 * Meals & Nutrition screen — daily macros, meal log, and water tracker.
 *
 * Wired to tRPC API:
 *   - clientPortal.meals.getByDate  (fetch meals for a given date)
 *   - clientPortal.meals.add        (log a new meal)
 *   - clientPortal.meals.delete     (remove a meal)
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MealDisplay {
  id?: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
}

interface MacroSummary {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Sample data — used as fallback when backend is unreachable          */
/* ------------------------------------------------------------------ */

const SAMPLE_MACROS: MacroSummary[] = [
  { label: "Calories", current: 2150, target: 2400, unit: "kcal", color: Colors.gold },
  { label: "Protein", current: 165, target: 180, unit: "g", color: Colors.info },
  { label: "Carbs", current: 220, target: 240, unit: "g", color: Colors.success },
  { label: "Fat", current: 72, target: 80, unit: "g", color: Colors.warning },
];

const SAMPLE_MEALS: MealDisplay[] = [
  {
    name: "Breakfast",
    time: "7:30 AM",
    calories: 620,
    protein: 42,
    carbs: 58,
    fat: 24,
    items: "Eggs, oats, blueberries, almond butter",
    mealType: "breakfast",
  },
  {
    name: "Lunch",
    time: "12:15 PM",
    calories: 780,
    protein: 55,
    carbs: 82,
    fat: 26,
    items: "Grilled chicken, brown rice, broccoli, olive oil",
    mealType: "lunch",
  },
  {
    name: "Snack",
    time: "3:45 PM",
    calories: 350,
    protein: 30,
    carbs: 38,
    fat: 10,
    items: "Greek yogurt, granola, honey",
    mealType: "snack",
  },
];

/* Water state is managed via useState inside the component */

/* Macro targets (used when calculating from raw API meals) */
const MACRO_TARGETS = { calories: 2400, protein: 180, carbs: 240, fat: 80 };

/* ------------------------------------------------------------------ */
/* API → UI mappers                                                    */
/* ------------------------------------------------------------------ */

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function mapApiMeal(raw: any): MealDisplay {
  const mealType = (raw.mealType ?? "snack").toLowerCase();
  return {
    id: raw.id ?? raw._id ?? undefined,
    name: MEAL_TYPE_LABELS[mealType] ?? mealType.charAt(0).toUpperCase() + mealType.slice(1),
    time: raw.time ?? raw.loggedAt ?? "",
    calories: raw.calories ?? 0,
    protein: raw.proteinG ?? raw.protein ?? 0,
    carbs: raw.carbsG ?? raw.carbs ?? 0,
    fat: raw.fatG ?? raw.fat ?? 0,
    items: raw.description ?? raw.items ?? "",
    mealType: mealType as MealDisplay["mealType"],
  };
}

/** Aggregate meals into macro summary rings. */
function buildMacros(meals: MealDisplay[]): MacroSummary[] {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return [
    { label: "Calories", current: totals.calories, target: MACRO_TARGETS.calories, unit: "kcal", color: Colors.gold },
    { label: "Protein", current: totals.protein, target: MACRO_TARGETS.protein, unit: "g", color: Colors.info },
    { label: "Carbs", current: totals.carbs, target: MACRO_TARGETS.carbs, unit: "g", color: Colors.success },
    { label: "Fat", current: totals.fat, target: MACRO_TARGETS.fat, unit: "g", color: Colors.warning },
  ];
}

/* ------------------------------------------------------------------ */
/* Progress Ring                                                       */
/* ------------------------------------------------------------------ */

function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={Colors.navyLight}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Fill */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MealsScreen() {
  const router = useRouter();

  /* ---- tRPC queries ---- */
  const today = new Date().toISOString().split("T")[0];
  const mealsQuery = trpc.clientPortal.meals.getByDate.useQuery(
    { date: today },
    DEFAULT_QUERY_OPTIONS,
  );
  const addMealMutation = trpc.clientPortal.meals.add.useMutation({
    onSuccess: () => {
      mealsQuery.refetch();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not add meal.");
    },
  });
  const deleteMealMutation = trpc.clientPortal.meals.delete.useMutation({
    onSuccess: () => {
      mealsQuery.refetch();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not delete meal.");
    },
  });

  /* ---- Derive display data (API with sample fallback) ---- */
  const meals: MealDisplay[] = mealsQuery.data
    ? ((mealsQuery.data as any).meals ?? [mealsQuery.data].flat()).map(mapApiMeal)
    : SAMPLE_MEALS;

  const macros: MacroSummary[] = mealsQuery.data
    ? buildMacros(meals)
    : SAMPLE_MACROS;

  /* ---- Water intake (local session state) ---- */
  const [waterCount, setWaterCount] = useState(0);
  const waterTarget = 8;

  /* ---- Pull-to-refresh ---- */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await mealsQuery.refetch();
    setRefreshing(false);
  }, [mealsQuery]);

  /* ---- Handlers ---- */
  const handleLogMeal = () => {
    Alert.alert("Log Meal", "Choose a meal type:", [
      ...( ["breakfast", "lunch", "dinner", "snack"] as const ).map((mealType) => ({
        text: MEAL_TYPE_LABELS[mealType],
        onPress: () => {
          Alert.prompt
            ? Alert.prompt(
                `Log ${MEAL_TYPE_LABELS[mealType]}`,
                "Describe what you ate:",
                (description: string) => {
                  if (description) {
                    addMealMutation.mutate({
                      date: today,
                      mealType,
                      description,
                    });
                  }
                },
              )
            : addMealMutation.mutate({
                date: today,
                mealType,
                description: `${MEAL_TYPE_LABELS[mealType]} logged`,
              });
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeleteMeal = (meal: MealDisplay) => {
    if (!meal.id) {
      Alert.alert("Info", "Sample meals cannot be deleted.");
      return;
    }
    Alert.alert("Delete Meal", `Remove ${meal.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMealMutation.mutate({ id: meal.id! }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Meals & Nutrition" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
        }
      >
        {/* Daily Macro Summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Macros</Text>

          <View style={styles.macroGrid}>
            {macros.map((macro) => {
              const progress = macro.target > 0 ? macro.current / macro.target : 0;
              return (
                <View key={macro.label} style={styles.macroItem}>
                  <View style={styles.ringWrapper}>
                    <ProgressRing
                      progress={progress}
                      size={64}
                      strokeWidth={5}
                      color={macro.color}
                    />
                    <View style={styles.ringLabel}>
                      <Text style={[styles.ringValue, { color: macro.color }]}>
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <Text style={styles.macroValues}>
                    {macro.current}/{macro.target}
                    {macro.unit !== "kcal" ? macro.unit : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Meals Logged Today */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Meals Logged Today</Text>

          {meals.length === 0 && (
            <Text style={styles.emptyText}>No meals logged yet today.</Text>
          )}

          {meals.map((meal, idx) => (
            <View
              key={meal.id ?? idx}
              style={[
                styles.mealRow,
                idx < meals.length - 1 && styles.mealBorder,
              ]}
            >
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>
              <Text style={styles.mealItems}>{meal.items}</Text>
              <View style={styles.mealMacros}>
                <Text style={styles.mealMacroText}>{meal.calories} kcal</Text>
                <View style={styles.macroDot} />
                <Text style={styles.mealMacroText}>P {meal.protein}g</Text>
                <View style={styles.macroDot} />
                <Text style={styles.mealMacroText}>C {meal.carbs}g</Text>
                <View style={styles.macroDot} />
                <Text style={styles.mealMacroText}>F {meal.fat}g</Text>
              </View>
              {meal.id && (
                <Button
                  title="Delete"
                  variant="danger"
                  size="sm"
                  onPress={() => handleDeleteMeal(meal)}
                />
              )}
            </View>
          ))}
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Log Meal"
            variant="primary"
            style={styles.flex1}
            loading={addMealMutation.isPending}
            onPress={handleLogMeal}
          />
          <Button title="Scan Barcode" variant="secondary" style={styles.flex1} onPress={() => Alert.alert("Scan Barcode", "Barcode scanning will be available in a future update.")} />
        </View>

        {/* Shopping List Navigation */}
        <Button
          title="Shopping List"
          variant="tertiary"
          onPress={() => router.push("/protocols/shopping-list")}
        />

        {/* Water Intake */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Water Intake</Text>
            <Text style={styles.waterCount}>
              {waterCount}/{waterTarget} glasses
            </Text>
          </View>

          <View style={styles.waterRow}>
            {Array.from({ length: waterTarget }).map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => setWaterCount(idx < waterCount ? idx : idx + 1)}
                style={[
                  styles.waterGlass,
                  idx < waterCount
                    ? styles.waterFilled
                    : styles.waterEmpty,
                ]}
              >
                <Text style={styles.waterIcon}>
                  {idx < waterCount ? "⬤" : "○"}
                </Text>
              </Pressable>
            ))}
          </View>
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

  /* Macro grid */
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  macroItem: {
    alignItems: "center",
    gap: 4,
  },
  ringWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },
  macroLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.white,
  },
  macroValues: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Meals */
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  mealRow: {
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  mealBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  mealTime: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  mealItems: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  mealMacros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  mealMacroText: {
    fontSize: FontSizes.xs,
    color: Colors.silverLight,
    fontWeight: "500",
  },
  macroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.silver,
    opacity: 0.5,
  },

  /* Buttons */
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },

  /* Water */
  waterCount: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  waterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  waterGlass: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  waterFilled: {
    backgroundColor: "rgba(74, 144, 217, 0.2)",
  },
  waterEmpty: {
    backgroundColor: Colors.navyLight,
  },
  waterIcon: {
    fontSize: 14,
    color: Colors.info,
  },
});
