/**
 * ProtocolItem — Single protocol task row with a completion checkbox.
 *
 * Used in the Active Protocols section.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type ProtocolCategory =
  | "supplement"
  | "medication"
  | "exercise"
  | "nutrition"
  | "peptide";

interface ProtocolItemProps {
  title: string;
  dosage?: string;
  time?: string;
  category: ProtocolCategory;
  completed?: boolean;
  onToggle?: (completed: boolean) => void;
}

const categoryColors: Record<ProtocolCategory, string> = {
  supplement: "#22D3EE",
  medication: Colors.info,
  exercise: Colors.success,
  nutrition: "#F97316",
  peptide: "#A78BFA",
};

export function ProtocolItem({
  title,
  dosage,
  time,
  category,
  completed: initialCompleted = false,
  onToggle,
}: ProtocolItemProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const accentColor = categoryColors[category];

  const handleToggle = async () => {
    const next = !completed;
    setCompleted(next);
    onToggle?.(next);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on all platforms
    }
  };

  return (
    <Pressable onPress={handleToggle} style={styles.container}>
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          {
            borderColor: completed ? accentColor : Colors.silver,
            backgroundColor: completed ? accentColor : "transparent",
          },
        ]}
      >
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            completed && styles.completedText,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.metaRow}>
          {dosage ? (
            <Text style={styles.dosage}>{dosage}</Text>
          ) : null}
          {time ? (
            <Text style={styles.time}>{time}</Text>
          ) : null}
        </View>
      </View>

      {/* Category dot */}
      <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  checkmark: {
    color: Colors.dark,
    fontSize: 13,
    fontWeight: "800",
    marginTop: -1,
  },
  content: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  completedText: {
    color: Colors.silver,
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dosage: {
    color: Colors.silver,
    fontSize: 11,
  },
  time: {
    color: Colors.silver,
    fontSize: 11,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
});
