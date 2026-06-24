/**
 * AnalysisChips -- horizontal scrollable row of analysis-type selector chips.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface ChipOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnalysisChipsProps {
  options: ChipOption[];
  selected: string;
  onSelect: (id: string) => void;
}

export function AnalysisChips({ options, selected, onSelect }: AnalysisChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
    >
      {options.map((option) => {
        const isActive = option.id === selected;
        return (
          <Pressable
            key={option.id}
            style={[
              styles.chip,
              isActive && styles.chipActive,
            ]}
            onPress={() => onSelect(option.id)}
          >
            {option.icon}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 48,
  },
  scrollContent: {
    gap: 8,
    alignItems: "center",
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    borderColor: Colors.gold,
  },
  chipText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontWeight: "500",
  },
  chipTextActive: {
    color: Colors.gold,
    fontWeight: "600",
  },
});
