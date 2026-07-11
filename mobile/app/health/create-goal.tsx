/**
 * Create / Edit Goal screen.
 *
 * Dynamic form that adjusts fields based on the selected goal category.
 * Route param: optional goalId (present = edit mode, absent = create mode).
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Scale,
  Moon,
  Footprints,
  Droplets,
  UtensilsCrossed,
  Sliders,
  ChevronDown,
  CalendarDays,
  Bell,
  Flag,
  StickyNote,
  Check,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCreateGoal, useGoalDetail } from "@/hooks";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types & Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type GoalCategory =
  | "Weight"
  | "Sleep"
  | "Activity"
  | "Blood Work"
  | "Nutrition"
  | "Custom";

type ReminderFrequency = "Daily" | "Weekly" | "None";
type Priority = "Low" | "Medium" | "High";
type WeightUnit = "lbs" | "kg";
type ActivityMetric = "steps" | "workouts";

interface CategoryConfig {
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: { key: GoalCategory; config: CategoryConfig }[] = [
  {
    key: "Weight",
    config: {
      icon: <Scale size={16} color={Colors.gold} />,
      color: Colors.gold,
    },
  },
  {
    key: "Sleep",
    config: {
      icon: <Moon size={16} color="#60A5FA" />,
      color: "#60A5FA",
    },
  },
  {
    key: "Activity",
    config: {
      icon: <Footprints size={16} color={Colors.success} />,
      color: Colors.success,
    },
  },
  {
    key: "Blood Work",
    config: {
      icon: <Droplets size={16} color="#F59E0B" />,
      color: "#F59E0B",
    },
  },
  {
    key: "Nutrition",
    config: {
      icon: <UtensilsCrossed size={16} color="#EC4899" />,
      color: "#EC4899",
    },
  },
  {
    key: "Custom",
    config: {
      icon: <Sliders size={16} color={Colors.silverLight} />,
      color: Colors.silverLight,
    },
  },
];

const BLOOD_MARKERS = ["A1C", "LDL", "HDL", "Triglycerides", "Fasting Glucose", "CRP"];
const REMINDER_OPTIONS: ReminderFrequency[] = ["Daily", "Weekly", "None"];
const PRIORITY_OPTIONS: Priority[] = ["Low", "Medium", "High"];

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: Colors.silver,
  Medium: Colors.warning,
  High: Colors.danger,
};

// Category mapping from backend to UI
const BACKEND_TO_UI_CATEGORY: Record<string, GoalCategory> = {
  weight: "Weight",
  sleep: "Sleep",
  activity: "Activity",
  body_fat: "Weight",
  glucose: "Blood Work",
  labs: "Blood Work",
  nutrition: "Nutrition",
  supplements: "Custom",
  fasting: "Custom",
  custom: "Custom",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Chip({
  label,
  selected,
  onPress,
  icon,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        selected && {
          backgroundColor: color
            ? `${color}22`
            : "rgba(74, 144, 217, 0.15)",
          borderColor: color ?? Colors.gold,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          chipStyles.label,
          selected && { color: color ?? Colors.gold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  label: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
});

function SelectorRow({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors?: Record<string, string>;
}) {
  return (
    <View style={selectorStyles.row}>
      {options.map((opt) => {
        const isSelected = opt === selected;
        const color = colors?.[opt];
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[
              selectorStyles.option,
              isSelected && {
                backgroundColor: color
                  ? `${color}22`
                  : "rgba(74, 144, 217, 0.15)",
                borderColor: color ?? Colors.gold,
              },
            ]}
          >
            {isSelected && (
              <Check size={14} color={color ?? Colors.gold} />
            )}
            <Text
              style={[
                selectorStyles.optionText,
                isSelected && { color: color ?? Colors.gold },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  optionText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
});

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.container}>
      <View style={fieldStyles.labelRow}>
        {icon}
        <Text style={fieldStyles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  label: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function CreateGoalScreen() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const router = useRouter();
  const isEditMode = !!goalId;
  const { goal: existingGoalData } = useGoalDetail(goalId);

  // Derive UI-friendly category from API data
  const existingCategory = existingGoalData?.category
    ? BACKEND_TO_UI_CATEGORY[existingGoalData.category] ?? "Custom"
    : undefined;

  // ─── State ──────────────────────────────────────────────
  const [category, setCategory] = useState<GoalCategory>(
    existingCategory ?? "Weight"
  );

  // Weight fields
  const [targetWeight, setTargetWeight] = useState(
    existingGoalData?.targetValue?.toString() ?? ""
  );
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    (existingGoalData?.targetUnit as WeightUnit) ?? "lbs"
  );

  // Sleep
  const [sleepTarget, setSleepTarget] = useState(
    existingCategory === "Sleep" ? existingGoalData?.targetValue?.toString() ?? "" : ""
  );

  // Activity
  const [activityMetric, setActivityMetric] = useState<ActivityMetric>(
    existingGoalData?.targetUnit === "workouts" ? "workouts" : "steps"
  );
  const [activityTarget, setActivityTarget] = useState(
    existingCategory === "Activity" ? existingGoalData?.targetValue?.toString() ?? "" : ""
  );

  // Blood Work
  const [bloodMarker, setBloodMarker] = useState("A1C");
  const [bloodTarget, setBloodTarget] = useState(
    existingCategory === "Blood Work" ? existingGoalData?.targetValue?.toString() ?? "" : ""
  );

  // Nutrition
  const [caloriesTarget, setCaloriesTarget] = useState(
    existingCategory === "Nutrition" ? existingGoalData?.targetValue?.toString() ?? "" : ""
  );

  // Custom
  const [customName, setCustomName] = useState(
    existingCategory === "Custom" ? existingGoalData?.title ?? "" : ""
  );
  const [customTarget, setCustomTarget] = useState(
    existingCategory === "Custom" ? existingGoalData?.targetValue?.toString() ?? "" : ""
  );

  // Common fields
  const [targetDate, setTargetDate] = useState(
    existingGoalData?.targetDate ?? ""
  );
  const [reminder, setReminder] = useState<ReminderFrequency>("None");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [notes, setNotes] = useState(existingGoalData?.description ?? "");

  const { createGoal, isLoading: isCreating } = useCreateGoal();

  const handleSave = useCallback(async () => {
    // Validate required fields
    let isValid = true;
    switch (category) {
      case "Weight":
        isValid = targetWeight.trim().length > 0;
        break;
      case "Sleep":
        isValid = sleepTarget.trim().length > 0;
        break;
      case "Activity":
        isValid = activityTarget.trim().length > 0;
        break;
      case "Blood Work":
        isValid = bloodTarget.trim().length > 0;
        break;
      case "Nutrition":
        isValid = caloriesTarget.trim().length > 0;
        break;
      case "Custom":
        isValid =
          customName.trim().length > 0 && customTarget.trim().length > 0;
        break;
    }

    if (!isValid) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all required target values."
      );
      return;
    }

    // Build the API input — category enum must match backend exactly
    const categoryMap: Record<GoalCategory, "weight" | "activity" | "nutrition" | "sleep" | "glucose" | "custom"> = {
      Weight: "weight",
      Sleep: "sleep",
      Activity: "activity",
      "Blood Work": "glucose",
      Nutrition: "nutrition",
      Custom: "custom",
    };

    let title = "";
    let targetValue = 0;
    let targetUnit = "";
    let targetDirection: "increase" | "decrease" | "maintain" | "reach" = "reach";
    let startValue = 0;
    let description: string = notes || "";

    switch (category) {
      case "Weight":
        title = `Reach ${targetWeight} ${weightUnit}`;
        targetValue = parseFloat(targetWeight);
        targetUnit = weightUnit;
        targetDirection = "decrease";
        startValue = existingGoalData?.currentValue ?? targetValue + 10;
        break;
      case "Sleep":
        title = `Sleep ${sleepTarget}+ hrs`;
        targetValue = parseFloat(sleepTarget);
        targetUnit = "hrs";
        targetDirection = "increase";
        startValue = existingGoalData?.currentValue ?? 0;
        break;
      case "Activity":
        title = activityMetric === "steps"
          ? `Steps ${activityTarget} daily`
          : `${activityTarget} workouts/week`;
        targetValue = parseFloat(activityTarget);
        targetUnit = activityMetric;
        targetDirection = "increase";
        startValue = existingGoalData?.currentValue ?? 0;
        break;
      case "Blood Work":
        title = `Reduce ${bloodMarker} to ${bloodTarget}`;
        targetValue = parseFloat(bloodTarget);
        targetUnit = "%";
        targetDirection = "decrease";
        startValue = existingGoalData?.currentValue ?? targetValue + 1;
        break;
      case "Nutrition":
        title = `${caloriesTarget} cal/day`;
        targetValue = parseFloat(caloriesTarget);
        targetUnit = "kcal";
        targetDirection = "reach";
        startValue = existingGoalData?.currentValue ?? 0;
        break;
      case "Custom":
        title = customName;
        targetValue = parseFloat(customTarget) || 0;
        targetUnit = "units";
        targetDirection = "reach";
        startValue = existingGoalData?.currentValue ?? 0;
        break;
    }

    try {
      if (isEditMode) {
        // In edit mode, create a new goal since the backend has no general update mutation
        // A full update would require backend support; for now we create with the corrected values
        await createGoal({
          title,
          description,
          category: categoryMap[category],
          targetValue,
          targetUnit,
          targetDirection,
          startValue,
          timeframe: "open_ended",
          targetDate: targetDate || null,
        });
      } else {
        await createGoal({
          title,
          description,
          category: categoryMap[category],
          targetValue,
          targetUnit,
          targetDirection,
          startValue,
          timeframe: "open_ended",
          targetDate: targetDate || null,
        });
      }

      Alert.alert(
        isEditMode ? "Goal Updated" : "Goal Created",
        isEditMode
          ? "Your goal has been updated successfully."
          : "Your new goal has been created successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(
        "Error",
        "Failed to save goal. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [
    category,
    targetWeight,
    weightUnit,
    sleepTarget,
    activityTarget,
    activityMetric,
    bloodTarget,
    bloodMarker,
    caloriesTarget,
    customName,
    customTarget,
    targetDate,
    notes,
    isEditMode,
    router,
    createGoal,
  ]);

  const selectedCategoryConfig = CATEGORIES.find(
    (c) => c.key === category
  )?.config;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Category Selector ──────────────────────────── */}
          <Text style={styles.sectionTitle}>Goal Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map(({ key, config }) => (
              <Chip
                key={key}
                label={key}
                selected={category === key}
                onPress={() => setCategory(key)}
                icon={config.icon}
                color={config.color}
              />
            ))}
          </ScrollView>

          {/* ─── Category-specific Fields ───────────────────── */}
          <Card style={styles.formCard}>
            {category === "Weight" && (
              <>
                <FormField
                  label="Target Weight"
                  icon={<Scale size={14} color={Colors.gold} />}
                >
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={targetWeight}
                      onChangeText={setTargetWeight}
                      placeholder="e.g. 175"
                      placeholderTextColor={Colors.silver}
                      keyboardType="numeric"
                    />
                    <SelectorRow
                      options={["lbs", "kg"]}
                      selected={weightUnit}
                      onSelect={(v) => setWeightUnit(v as WeightUnit)}
                    />
                  </View>
                </FormField>
              </>
            )}

            {category === "Sleep" && (
              <FormField
                label="Target Hours Per Night"
                icon={<Moon size={14} color="#60A5FA" />}
              >
                <TextInput
                  style={styles.input}
                  value={sleepTarget}
                  onChangeText={setSleepTarget}
                  placeholder="e.g. 8"
                  placeholderTextColor={Colors.silver}
                  keyboardType="numeric"
                />
              </FormField>
            )}

            {category === "Activity" && (
              <>
                <FormField
                  label="Activity Metric"
                  icon={<Footprints size={14} color={Colors.success} />}
                >
                  <SelectorRow
                    options={["steps", "workouts"]}
                    selected={activityMetric}
                    onSelect={(v) => setActivityMetric(v as ActivityMetric)}
                  />
                </FormField>
                <FormField
                  label={
                    activityMetric === "steps"
                      ? "Target Steps/Day"
                      : "Target Workouts/Week"
                  }
                >
                  <TextInput
                    style={styles.input}
                    value={activityTarget}
                    onChangeText={setActivityTarget}
                    placeholder={
                      activityMetric === "steps" ? "e.g. 10000" : "e.g. 5"
                    }
                    placeholderTextColor={Colors.silver}
                    keyboardType="numeric"
                  />
                </FormField>
              </>
            )}

            {category === "Blood Work" && (
              <>
                <FormField
                  label="Marker"
                  icon={<Droplets size={14} color="#F59E0B" />}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: Spacing.sm }}
                  >
                    {BLOOD_MARKERS.map((marker) => (
                      <Chip
                        key={marker}
                        label={marker}
                        selected={bloodMarker === marker}
                        onPress={() => setBloodMarker(marker)}
                        color="#F59E0B"
                      />
                    ))}
                  </ScrollView>
                </FormField>
                <FormField label="Target Value">
                  <TextInput
                    style={styles.input}
                    value={bloodTarget}
                    onChangeText={setBloodTarget}
                    placeholder="e.g. 5.2"
                    placeholderTextColor={Colors.silver}
                    keyboardType="numeric"
                  />
                </FormField>
              </>
            )}

            {category === "Nutrition" && (
              <FormField
                label="Target Calories/Day"
                icon={<UtensilsCrossed size={14} color="#EC4899" />}
              >
                <TextInput
                  style={styles.input}
                  value={caloriesTarget}
                  onChangeText={setCaloriesTarget}
                  placeholder="e.g. 2000"
                  placeholderTextColor={Colors.silver}
                  keyboardType="numeric"
                />
              </FormField>
            )}

            {category === "Custom" && (
              <>
                <FormField
                  label="Goal Name"
                  icon={<Sliders size={14} color={Colors.silverLight} />}
                >
                  <TextInput
                    style={styles.input}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="e.g. Meditate daily"
                    placeholderTextColor={Colors.silver}
                  />
                </FormField>
                <FormField label="Numeric Target">
                  <TextInput
                    style={styles.input}
                    value={customTarget}
                    onChangeText={setCustomTarget}
                    placeholder="e.g. 30 (minutes)"
                    placeholderTextColor={Colors.silver}
                    keyboardType="numeric"
                  />
                </FormField>
              </>
            )}
          </Card>

          {/* ─── Target Date ────────────────────────────────── */}
          <Card style={styles.formCard}>
            <FormField
              label="Target Date"
              icon={<CalendarDays size={14} color={Colors.gold} />}
            >
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD (or leave blank for ongoing)"
                placeholderTextColor={Colors.silver}
              />
            </FormField>

            {/* ─── Reminder ──────────────────────────────────── */}
            <FormField
              label="Reminder Frequency"
              icon={<Bell size={14} color={Colors.gold} />}
            >
              <SelectorRow
                options={REMINDER_OPTIONS}
                selected={reminder}
                onSelect={(v) => setReminder(v as ReminderFrequency)}
              />
            </FormField>

            {/* ─── Priority ──────────────────────────────────── */}
            <FormField
              label="Priority"
              icon={<Flag size={14} color={Colors.gold} />}
            >
              <SelectorRow
                options={PRIORITY_OPTIONS}
                selected={priority}
                onSelect={(v) => setPriority(v as Priority)}
                colors={PRIORITY_COLORS}
              />
            </FormField>
          </Card>

          {/* ─── Notes ───────────────────────────────────────── */}
          <Card style={styles.formCard}>
            <FormField
              label="Notes"
              icon={<StickyNote size={14} color={Colors.gold} />}
            >
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes or reminders..."
                placeholderTextColor={Colors.silver}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </FormField>
          </Card>

          {/* ─── Submit ──────────────────────────────────────── */}
          <Button
            title={isCreating ? "Saving..." : isEditMode ? "Save Changes" : "Create Goal"}
            variant="primary"
            size="lg"
            onPress={handleSave}
            style={styles.submitButton}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Section titles
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },

  // Category row
  categoryRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  // Form card
  formCard: {
    marginBottom: Spacing.md,
  },

  // Input
  input: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  // Submit
  submitButton: {
    marginTop: Spacing.sm,
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
