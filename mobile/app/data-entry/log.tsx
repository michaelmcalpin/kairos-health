/**
 * Generic log entry form screen.
 *
 * Renders a dynamic form based on the `type` route parameter.
 * Supports Blood Pressure, Weight, Glucose, Sleep, Temperature,
 * and Symptoms/Notes entry types.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Heart,
  Scale,
  Droplets,
  Moon,
  Thermometer,
  FileText,
  Clock,
  Calendar,
  Check,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/data-entry/FormField";
import { SegmentedControl } from "@/components/data-entry/SegmentedControl";

/* ------------------------------------------------------------------ */
/* Recent entries sample data                                          */
/* ------------------------------------------------------------------ */

interface RecentEntry {
  id: string;
  value: string;
  date: string;
  time: string;
}

const RECENT_ENTRIES: Record<string, RecentEntry[]> = {
  "blood-pressure": [
    { id: "1", value: "118/76 mmHg, Pulse 68", date: "Today", time: "8:30 AM" },
    { id: "2", value: "122/80 mmHg, Pulse 72", date: "Yesterday", time: "9:15 AM" },
    { id: "3", value: "120/78 mmHg, Pulse 70", date: "Jun 10", time: "8:45 AM" },
  ],
  weight: [
    { id: "1", value: "185.2 lbs", date: "Today", time: "7:00 AM" },
    { id: "2", value: "185.8 lbs", date: "Yesterday", time: "7:15 AM" },
    { id: "3", value: "186.0 lbs", date: "Jun 10", time: "6:55 AM" },
  ],
  glucose: [
    { id: "1", value: "95 mg/dL (Fasting)", date: "Today", time: "6:30 AM" },
    { id: "2", value: "142 mg/dL (After Meal)", date: "Yesterday", time: "1:00 PM" },
    { id: "3", value: "88 mg/dL (Fasting)", date: "Jun 10", time: "6:45 AM" },
  ],
  sleep: [
    { id: "1", value: "11:00 PM - 6:30 AM (Good)", date: "Last night", time: "7.5 hrs" },
    { id: "2", value: "11:30 PM - 7:00 AM (Fair)", date: "Jun 11", time: "7.5 hrs" },
    { id: "3", value: "10:45 PM - 6:15 AM (Good)", date: "Jun 10", time: "7.5 hrs" },
  ],
  temperature: [
    { id: "1", value: "98.4 F", date: "Jun 10", time: "8:00 AM" },
    { id: "2", value: "98.6 F", date: "Jun 7", time: "7:30 AM" },
  ],
  symptoms: [
    { id: "1", value: "Mild headache, took ibuprofen", date: "Yesterday", time: "3:00 PM" },
    { id: "2", value: "Slight fatigue after workout", date: "Jun 10", time: "6:00 PM" },
  ],
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function LogEntryScreen() {
  const { type = "blood-pressure", title = "Log Entry" } = useLocalSearchParams<{
    type: string;
    title: string;
  }>();
  const router = useRouter();

  /* -- tRPC mutations -- */
  const glucoseMutation = trpc.clientPortal.glucose.create.useMutation();
  const bpMutation = trpc.clientPortal.bloodPressure.add.useMutation();
  const weightMutation = trpc.clientPortal.measurements.create.useMutation();
  const checkinMutation = trpc.clientPortal.checkin.submit.useMutation();

  /* -- Blood Pressure state -- */
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [arm, setArm] = useState("Left");
  const [position, setPosition] = useState("Sitting");

  /* -- Weight state -- */
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightNotes, setWeightNotes] = useState("");

  /* -- Glucose state -- */
  const [glucoseValue, setGlucoseValue] = useState("");
  const [mealContext, setMealContext] = useState("Fasting");
  const [glucoseNotes, setGlucoseNotes] = useState("");

  /* -- Sleep state -- */
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepQuality, setSleepQuality] = useState("Good");

  /* -- Temperature state -- */
  const [temperature, setTemperature] = useState("");
  const [tempUnit, setTempUnit] = useState("F");

  /* -- Symptoms state -- */
  const [symptoms, setSymptoms] = useState("");

  /* -- Date / Time state (shared) -- */
  const now = new Date();
  const [date, setDate] = useState(
    now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  );
  const [time, setTime] = useState(
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );

  const recentEntries = RECENT_ENTRIES[type] ?? [];

  const handleSave = async () => {
    try {
      if (type === "glucose") {
        await glucoseMutation.mutateAsync({
          valueMgdl: Number(glucoseValue),
          timingContext: mealContext,
          notes: glucoseNotes || undefined,
          source: "manual",
        });
      } else if (type === "blood-pressure") {
        await bpMutation.mutateAsync({
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          pulse: pulse ? Number(pulse) : undefined,
          position: position.toLowerCase(),
          arm: arm.toLowerCase(),
          source: "manual",
        });
      } else if (type === "weight") {
        await weightMutation.mutateAsync({
          weightLbs: weightUnit === "lbs" ? Number(weight) : Number(weight) * 2.20462,
          notes: weightNotes || undefined,
          source: "manual",
        });
      } else {
        // catch-all: sleep, temperature, symptoms, etc.
        await checkinMutation.mutateAsync({
          weight: type === "weight" ? Number(weight) : undefined,
          sleepHours: type === "sleep" && bedtime && wakeTime ? undefined : undefined,
          notes: type === "symptoms" ? symptoms : type === "temperature" ? `Temperature: ${temperature}°${tempUnit}` : undefined,
        });
      }

      Alert.alert(
        "Entry Saved",
        "Your health data has been logged successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to save entry. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: title as string }} />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════════════════════════════════════════════ */}
          {/* Form card                                              */}
          {/* ═══════════════════════════════════════════════════════ */}
          <Card style={styles.formCard}>
            {/* -- Dynamic form based on type -- */}
            {type === "blood-pressure" && (
              <>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <FormField
                      label="Systolic (top)"
                      value={systolic}
                      onChangeText={setSystolic}
                      placeholder="120"
                      unit="mmHg"
                      numeric
                    />
                  </View>
                  <View style={styles.halfField}>
                    <FormField
                      label="Diastolic (bottom)"
                      value={diastolic}
                      onChangeText={setDiastolic}
                      placeholder="80"
                      unit="mmHg"
                      numeric
                    />
                  </View>
                </View>
                <FormField
                  label="Pulse"
                  value={pulse}
                  onChangeText={setPulse}
                  placeholder="72"
                  unit="bpm"
                  numeric
                />
                <SegmentedControl
                  label="Arm"
                  options={["Left", "Right"]}
                  selected={arm}
                  onSelect={setArm}
                />
                <SegmentedControl
                  label="Position"
                  options={["Sitting", "Standing", "Lying"]}
                  selected={position}
                  onSelect={setPosition}
                />
              </>
            )}

            {type === "weight" && (
              <>
                <FormField
                  label="Weight"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="185"
                  unit={weightUnit}
                  numeric
                />
                <SegmentedControl
                  label="Unit"
                  options={["lbs", "kg"]}
                  selected={weightUnit}
                  onSelect={setWeightUnit}
                />
                <FormField
                  label="Notes"
                  value={weightNotes}
                  onChangeText={setWeightNotes}
                  placeholder="Any notes about this measurement..."
                  multiline
                />
              </>
            )}

            {type === "glucose" && (
              <>
                <FormField
                  label="Blood Glucose"
                  value={glucoseValue}
                  onChangeText={setGlucoseValue}
                  placeholder="95"
                  unit="mg/dL"
                  numeric
                />
                <SegmentedControl
                  label="Meal Context"
                  options={["Fasting", "Before Meal", "After Meal"]}
                  selected={mealContext}
                  onSelect={setMealContext}
                />
                <FormField
                  label="Notes"
                  value={glucoseNotes}
                  onChangeText={setGlucoseNotes}
                  placeholder="Any notes about this reading..."
                  multiline
                />
              </>
            )}

            {type === "sleep" && (
              <>
                <FormField
                  label="Bedtime"
                  value={bedtime}
                  onChangeText={setBedtime}
                  placeholder="11:00 PM"
                  description="When you went to bed"
                />
                <FormField
                  label="Wake Time"
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="7:00 AM"
                  description="When you woke up"
                />
                <SegmentedControl
                  label="Sleep Quality"
                  options={["Poor", "Fair", "Good", "Excellent"]}
                  selected={sleepQuality}
                  onSelect={setSleepQuality}
                />
              </>
            )}

            {type === "temperature" && (
              <>
                <FormField
                  label="Temperature"
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="98.6"
                  unit={"°" + tempUnit}
                  numeric
                />
                <SegmentedControl
                  label="Unit"
                  options={["F", "C"]}
                  selected={tempUnit}
                  onSelect={setTempUnit}
                />
              </>
            )}

            {type === "symptoms" && (
              <FormField
                label="Symptoms & Notes"
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder="Describe your symptoms or any health notes..."
                multiline
              />
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* Date & Time pickers                                */}
            {/* ═══════════════════════════════════════════════════ */}
            <View style={styles.dateTimeRow}>
              <Pressable
                style={styles.dateTimeBtn}
                onPress={() => Alert.alert("Date Picker", "Date picker coming soon.")}
              >
                <Calendar size={16} color={Colors.gold} />
                <Text style={styles.dateTimeText}>{date}</Text>
              </Pressable>
              <Pressable
                style={styles.dateTimeBtn}
                onPress={() => Alert.alert("Time Picker", "Time picker coming soon.")}
              >
                <Clock size={16} color={Colors.gold} />
                <Text style={styles.dateTimeText}>{time}</Text>
              </Pressable>
            </View>
          </Card>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Save button                                            */}
          {/* ═══════════════════════════════════════════════════════ */}
          <Button
            title="Save Entry"
            variant="primary"
            size="lg"
            onPress={handleSave}
            style={styles.saveBtn}
            icon={<Check size={18} color={Colors.dark} />}
          />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Recent entries                                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {recentEntries.length > 0 && (
            <>
              <Text style={styles.recentTitle}>Recent Entries</Text>
              {recentEntries.map((entry, i) => (
                <Card
                  key={entry.id}
                  style={[
                    styles.recentCard,
                    i === recentEntries.length - 1 && { marginBottom: 0 },
                  ]}
                >
                  <View style={styles.recentRow}>
                    <View style={styles.recentLeft}>
                      <Text style={styles.recentValue}>{entry.value}</Text>
                      <Text style={styles.recentDate}>
                        {entry.date} &middot; {entry.time}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },
  formCard: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dateTimeText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  saveBtn: {
    marginBottom: Spacing.lg,
  },
  recentTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  recentCard: {
    marginBottom: Spacing.sm,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentLeft: {
    flex: 1,
  },
  recentValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  recentDate: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 3,
  },
});
