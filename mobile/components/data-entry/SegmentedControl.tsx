/**
 * SegmentedControl -- a horizontal pill selector for choosing between
 * a small number of options (e.g. left/right arm, sitting/standing).
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface SegmentedControlProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export function SegmentedControl({
  label,
  options,
  selected,
  onSelect,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const isActive = opt === selected;
          return (
            <Pressable
              key={opt}
              style={[styles.segment, isActive && styles.activeSegment]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.segmentText, isActive && styles.activeText]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radii.sm,
  },
  activeSegment: {
    backgroundColor: Colors.gold,
  },
  segmentText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  activeText: {
    color: Colors.dark,
  },
});
