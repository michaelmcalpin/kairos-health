/**
 * Health Goals step — multi-select grid of health optimization goals.
 *
 * Users pick the areas they want to focus on. At least one is required.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  Activity,
  Moon,
  Dumbbell,
  Heart,
  Leaf,
  Brain,
  Salad,
  Pill,
  Clock,
  Zap,
  Check,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

interface Props {
  selectedGoals: string[];
  onUpdate: (goals: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface GoalOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const GOALS: GoalOption[] = [
  { id: "glucose_optimization", label: "Glucose Optimization", icon: <Activity size={20} />, color: "#4A9D5B" },
  { id: "sleep_quality", label: "Sleep Quality", icon: <Moon size={20} />, color: "#6366F1" },
  { id: "body_composition", label: "Body Composition", icon: <Dumbbell size={20} />, color: "#F59E0B" },
  { id: "cardiovascular", label: "Heart Health", icon: <Heart size={20} />, color: "#C65D5D" },
  { id: "longevity_markers", label: "Longevity Biomarkers", icon: <Leaf size={20} />, color: "#4A9D5B" },
  { id: "stress_management", label: "Stress Management", icon: <Brain size={20} />, color: "#A78BFA" },
  { id: "nutrition_optimization", label: "Nutrition", icon: <Salad size={20} />, color: "#F97316" },
  { id: "supplement_protocol", label: "Supplements", icon: <Pill size={20} />, color: "#06B6D4" },
  { id: "fasting_protocol", label: "Fasting", icon: <Clock size={20} />, color: "#D4A843" },
  { id: "athletic_performance", label: "Athletic Performance", icon: <Zap size={20} />, color: "#4A90D9" },
];

export function HealthGoalsStep({
  selectedGoals,
  onUpdate,
  onContinue,
  onBack,
}: Props) {
  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      onUpdate(selectedGoals.filter((g) => g !== id));
    } else {
      onUpdate([...selectedGoals, id]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>What are your health goals?</Text>
        <Text style={styles.subtitle}>
          Select the areas you'd like to focus on. We'll tailor your
          experience and insights accordingly.
        </Text>
      </View>

      {/* Goals grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map((goal) => {
          const active = selectedGoals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              style={({ pressed }) => [
                styles.goalCard,
                active && styles.goalCardActive,
                pressed && styles.goalCardPressed,
              ]}
              onPress={() => toggleGoal(goal.id)}
            >
              <View
                style={[
                  styles.goalIcon,
                  {
                    backgroundColor: active
                      ? `${goal.color}20`
                      : "rgba(192, 197, 206, 0.08)",
                  },
                ]}
              >
                {React.cloneElement(goal.icon as React.ReactElement<any>, {
                  color: active ? goal.color : Colors.silver,
                })}
              </View>
              <Text
                style={[styles.goalLabel, active && { color: Colors.white }]}
                numberOfLines={2}
              >
                {goal.label}
              </Text>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: goal.color }]}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selection count */}
      <Text style={styles.selectionCount}>
        {selectedGoals.length} selected
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Button
          title="Continue"
          variant="primary"
          onPress={onContinue}
          disabled={selectedGoals.length === 0}
          style={styles.continueBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  goalCard: {
    width: "48%",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  goalCardActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.06)",
  },
  goalCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 18,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCount: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
    textAlign: "center",
    fontWeight: "600",
    marginVertical: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    fontWeight: "500",
  },
  continueBtn: {
    minWidth: 140,
  },
});
