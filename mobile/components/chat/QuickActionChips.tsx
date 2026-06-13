/**
 * QuickActionChips -- horizontal scrollable row of quick-action suggestion chips.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  FlaskConical,
  Pill,
  Stethoscope,
  CalendarCheck,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  message: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Review Labs",
    icon: <FlaskConical size={14} color={Colors.gold} />,
    message: "Can you review my latest lab results and highlight anything outside optimal range?",
  },
  {
    label: "Supplement Info",
    icon: <Pill size={14} color={Colors.gold} />,
    message: "Tell me about my current supplement protocol and any interactions I should know about.",
  },
  {
    label: "Ask About Symptoms",
    icon: <Stethoscope size={14} color={Colors.gold} />,
    message: "I have some symptoms I'd like to discuss. Can you help me understand what might be going on?",
  },
  {
    label: "Today's Protocol",
    icon: <CalendarCheck size={14} color={Colors.gold} />,
    message: "What does my protocol look like for today? Any tasks or supplements I need to take?",
  },
];

interface QuickActionChipsProps {
  onSelect: (message: string) => void;
}

export function QuickActionChips({ onSelect }: QuickActionChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
    >
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          style={({ pressed }) => [
            styles.chip,
            pressed && styles.chipPressed,
          ]}
          onPress={() => onSelect(action.message)}
        >
          {action.icon}
          <Text style={styles.chipText}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 44,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipPressed: {
    backgroundColor: "rgba(200, 169, 81, 0.12)",
    borderColor: Colors.gold,
  },
  chipText: {
    fontSize: FontSizes.xs,
    color: Colors.silverLight,
    fontWeight: "500",
  },
});
