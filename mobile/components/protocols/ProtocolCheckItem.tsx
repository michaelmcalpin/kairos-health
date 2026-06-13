/**
 * ProtocolCheckItem -- A single tappable protocol row with checkbox,
 * name, dosage, category badge, and optional notes indicator.
 *
 * Provides haptic feedback on toggle.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { FileText } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type ItemCategory =
  | "supplement"
  | "medication"
  | "peptide"
  | "exercise";

interface ProtocolCheckItemProps {
  title: string;
  dosage: string;
  form?: string;
  category: ItemCategory;
  completed: boolean;
  hasNotes?: boolean;
  onToggle: () => void;
}

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  supplement: "#22D3EE",
  medication: Colors.info,
  peptide: "#A78BFA",
  exercise: Colors.success,
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  supplement: "Supplement",
  medication: "Medication",
  peptide: "Peptide",
  exercise: "Exercise",
};

export function ProtocolCheckItem({
  title,
  dosage,
  form,
  category,
  completed,
  hasNotes = false,
  onToggle,
}: ProtocolCheckItemProps) {
  const accent = CATEGORY_COLORS[category];

  const handlePress = async () => {
    onToggle();
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on all platforms
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        completed && styles.containerCompleted,
        pressed && styles.pressed,
      ]}
    >
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          {
            borderColor: completed ? Colors.success : Colors.silver,
            backgroundColor: completed
              ? "rgba(34, 197, 94, 0.2)"
              : "transparent",
          },
        ]}
      >
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, completed && styles.titleCompleted]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.dosage}>
            {dosage}
            {form ? ` - ${form}` : ""}
          </Text>
        </View>
      </View>

      {/* Notes icon */}
      {hasNotes && (
        <View style={styles.notesIcon}>
          <FileText size={14} color={Colors.silver} />
        </View>
      )}

      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: `${accent}18` }]}>
        <View style={[styles.categoryDot, { backgroundColor: accent }]} />
        <Text style={[styles.categoryText, { color: accent }]}>
          {CATEGORY_LABELS[category]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  containerCompleted: {
    borderColor: "rgba(34, 197, 94, 0.2)",
    backgroundColor: "rgba(34, 197, 94, 0.03)",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  checkmark: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: "800",
    marginTop: -1,
  },
  content: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  titleCompleted: {
    color: Colors.silver,
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dosage: {
    color: Colors.silver,
    fontSize: 11,
  },
  notesIcon: {
    marginRight: Spacing.sm,
    padding: 4,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
