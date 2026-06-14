/**
 * EntryTypeCard -- a tappable card representing a manual data entry type.
 * Shows icon, label, and last entry timestamp.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface EntryType {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  lastEntry: string;
}

interface EntryTypeCardProps {
  entry: EntryType;
  onPress?: () => void;
}

export function EntryTypeCard({ entry, onPress }: EntryTypeCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: entry.iconColor + "20" }]}>
        {entry.icon}
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{entry.label}</Text>
        <Text style={styles.lastEntry}>Last entry: {entry.lastEntry}</Text>
      </View>
      <ChevronRight size={18} color={Colors.silver} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  lastEntry: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 3,
  },
});
