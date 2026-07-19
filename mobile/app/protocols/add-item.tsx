/**
 * Add Protocol Item screen.
 *
 * Unified form for adding supplements, medications, and peptides
 * to the client's protocol. All three categories are added from
 * this single screen via a segmented category selector.
 *
 * - Supplements & medications → clientPortal.protocol.addItem
 * - Peptides → clientPortal.protocol.addItem AND
 *   clientPortal.peptides.createCycle (so cycles show on the
 *   peptides screen with dose logging)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Pill, Syringe, Tablets } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ItemCategory = "supplement" | "medication" | "peptide";

const CATEGORIES: { id: ItemCategory; label: string; icon: React.ReactNode }[] = [
  { id: "supplement", label: "Supplement", icon: <Pill size={16} color={Colors.gold} /> },
  { id: "medication", label: "Medication", icon: <Tablets size={16} color="#4A90D9" /> },
  { id: "peptide", label: "Peptide", icon: <Syringe size={16} color="#A78BFA" /> },
];

const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Bedtime"];

const FREQUENCY_OPTIONS = ["Daily", "Twice daily", "Every other day", "Weekly", "As needed"];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AddProtocolItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const utils = trpc.useUtils();

  const initialCategory: ItemCategory =
    params.category === "medication" || params.category === "peptide"
      ? params.category
      : "supplement";

  const [category, setCategory] = useState<ItemCategory>(initialCategory);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const addItemMutation = trpc.clientPortal.protocol.addItem.useMutation();
  const createCycleMutation = trpc.clientPortal.peptides.createCycle.useMutation();

  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "Item";

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Name Required", `Please enter the ${categoryLabel.toLowerCase()} name.`);
      return;
    }

    setSaving(true);
    try {
      // Add to the client's protocol (shows in daily checklist)
      await addItemMutation.mutateAsync({
        name: trimmedName,
        category,
        dosage: dosage.trim() || undefined,
        unit: unit.trim() || undefined,
        frequency: frequency || undefined,
        timeOfDay: timeOfDay || undefined,
        notes: notes.trim() || undefined,
      });

      // Peptides also get a cycle so the peptides screen can track doses
      if (category === "peptide") {
        await createCycleMutation.mutateAsync({
          name: `${trimmedName} Cycle`,
          peptideName: trimmedName,
          dosage: dosage.trim() || undefined,
          unit: unit.trim() || undefined,
          frequency: frequency || undefined,
          startDate: new Date().toISOString().split("T")[0],
          status: "active",
          notes: notes.trim() || undefined,
        });
      }

      // Refresh protocol data everywhere
      utils.clientPortal.protocol.getActive.invalidate();
      utils.clientPortal.supplements.getActiveProtocol.invalidate();
      utils.clientPortal.peptides.getCycles.invalidate();

      Alert.alert("Added", `${trimmedName} has been added to your protocol.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ?? `Could not add ${categoryLabel.toLowerCase()}. Please try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Category selector ─────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>What are you adding?</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    category === cat.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  {cat.icon}
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat.id && styles.categoryTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* ── Details ───────────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{categoryLabel} Details</Text>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={
                category === "supplement"
                  ? "e.g., Magnesium Glycinate"
                  : category === "medication"
                    ? "e.g., Metformin"
                    : "e.g., BPC-157"
              }
              placeholderTextColor={Colors.silver}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Dosage</Text>
                <TextInput
                  style={styles.input}
                  value={dosage}
                  onChangeText={setDosage}
                  keyboardType="numeric"
                  placeholder="e.g., 400"
                  placeholderTextColor={Colors.silver}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder={category === "peptide" ? "mcg" : "mg"}
                  placeholderTextColor={Colors.silver}
                />
              </View>
            </View>
          </Card>

          {/* ── Schedule ──────────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.chipWrap}>
              {FREQUENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, frequency === option && styles.chipActive]}
                  onPress={() => setFrequency(option)}
                >
                  <Text
                    style={[styles.chipText, frequency === option && styles.chipTextActive]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Time of Day</Text>
            <View style={styles.chipWrap}>
              {TIME_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, timeOfDay === option && styles.chipActive]}
                  onPress={() => setTimeOfDay(option)}
                >
                  <Text
                    style={[styles.chipText, timeOfDay === option && styles.chipTextActive]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Why you're taking it, source, etc."
              placeholderTextColor={Colors.silver}
            />
          </Card>

          {/* ── Info note ─────────────────────────────────────────── */}
          <Text style={styles.infoText}>
            Self-logged items are visible to your coach and appear in your daily
            protocol checklist.
          </Text>

          {/* ── Save ──────────────────────────────────────────────── */}
          <Button
            title={`Add ${categoryLabel}`}
            variant="primary"
            size="lg"
            loading={saving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },

  /* Category selector */
  categoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  categoryOption: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navyLight,
  },
  categoryOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(201, 169, 78, 0.12)",
  },
  categoryText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: Colors.gold,
  },

  /* Fields */
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },

  /* Chips */
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navyLight,
  },
  chipActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(201, 169, 78, 0.12)",
  },
  chipText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  chipTextActive: {
    color: Colors.gold,
  },

  /* Info */
  infoText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  /* Save */
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
