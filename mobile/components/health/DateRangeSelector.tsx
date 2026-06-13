/**
 * DateRangeSelector -- Horizontal pill-button row for time-range filtering.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type DateRange = "today" | "week" | "month" | "year";

interface DateRangeSelectorProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
}

const OPTIONS: { key: DateRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export function DateRangeSelector({ selected, onChange }: DateRangeSelectorProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map(({ key, label }) => {
        const isActive = selected === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  pillText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  pillTextActive: {
    color: Colors.dark,
  },
});
