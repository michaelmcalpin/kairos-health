/**
 * Meals & Nutrition screen — daily macros, meal log, and water tracker.
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
import Svg, { Circle } from "react-native-svg";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const MACROS = [
  { label: "Calories", current: 2150, target: 2400, unit: "kcal", color: Colors.gold },
  { label: "Protein", current: 165, target: 180, unit: "g", color: Colors.info },
  { label: "Carbs", current: 220, target: 240, unit: "g", color: Colors.success },
  { label: "Fat", current: 72, target: 80, unit: "g", color: Colors.warning },
];

const MEALS = [
  {
    name: "Breakfast",
    time: "7:30 AM",
    calories: 620,
    protein: 42,
    carbs: 58,
    fat: 24,
    items: "Eggs, oats, blueberries, almond butter",
  },
  {
    name: "Lunch",
    time: "12:15 PM",
    calories: 780,
    protein: 55,
    carbs: 82,
    fat: 26,
    items: "Grilled chicken, brown rice, broccoli, olive oil",
  },
  {
    name: "Snack",
    time: "3:45 PM",
    calories: 350,
    protein: 30,
    carbs: 38,
    fat: 10,
    items: "Greek yogurt, granola, honey",
  },
];

const WATER = { current: 6, target: 8 };

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
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Meals & Nutrition" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Macro Summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Macros</Text>

          <View style={styles.macroGrid}>
            {MACROS.map((macro) => {
              const progress = macro.current / macro.target;
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

          {MEALS.map((meal, idx) => (
            <View
              key={idx}
              style={[
                styles.mealRow,
                idx < MEALS.length - 1 && styles.mealBorder,
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
            </View>
          ))}
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button title="Log Meal" variant="primary" style={styles.flex1} />
          <Button title="Scan Barcode" variant="secondary" style={styles.flex1} />
        </View>

        {/* Water Intake */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Water Intake</Text>
            <Text style={styles.waterCount}>
              {WATER.current}/{WATER.target} glasses
            </Text>
          </View>

          <View style={styles.waterRow}>
            {Array.from({ length: WATER.target }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.waterGlass,
                  idx < WATER.current
                    ? styles.waterFilled
                    : styles.waterEmpty,
                ]}
              >
                <Text style={styles.waterIcon}>
                  {idx < WATER.current ? "⬤" : "○"}
                </Text>
              </View>
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
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  waterEmpty: {
    backgroundColor: Colors.navyLight,
  },
  waterIcon: {
    fontSize: 14,
    color: Colors.info,
  },
});
