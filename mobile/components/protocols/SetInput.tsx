/**
 * SetInput — weight, reps, and RPE input row for logging a set.
 */

import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface SetInputProps {
  weight: string;
  reps: string;
  rpe: number | null;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onRPEChange: (value: number) => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getRPEColor(rpe: number): string {
  if (rpe <= 3) return Colors.success;
  if (rpe <= 5) return "#22D3EE"; // cyan
  if (rpe <= 7) return Colors.warning;
  if (rpe <= 9) return "#F97316"; // orange
  return Colors.danger;
}

export function SetInput({
  weight,
  reps,
  rpe,
  onWeightChange,
  onRepsChange,
  onRPEChange,
}: SetInputProps) {
  return (
    <View style={styles.container}>
      {/* Weight + Reps row */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>WEIGHT (lbs)</Text>
          <TextInput
            style={styles.textInput}
            value={weight}
            onChangeText={onWeightChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.silver}
            selectionColor={Colors.gold}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>REPS</Text>
          <TextInput
            style={styles.textInput}
            value={reps}
            onChangeText={onRepsChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.silver}
            selectionColor={Colors.gold}
          />
        </View>
      </View>

      {/* RPE Selector */}
      <View style={styles.rpeContainer}>
        <Text style={styles.inputLabel}>RPE (Rate of Perceived Exertion)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rpeRow}
        >
          {RPE_VALUES.map((value) => {
            const isSelected = rpe === value;
            const color = getRPEColor(value);
            return (
              <Pressable
                key={value}
                onPress={() => onRPEChange(value)}
                style={[
                  styles.rpeChip,
                  isSelected && { backgroundColor: color, borderColor: color },
                ]}
              >
                <Text
                  style={[
                    styles.rpeText,
                    isSelected && { color: Colors.dark, fontWeight: "700" },
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-end",
  },
  inputGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    alignSelf: "center",
  },
  rpeContainer: {
    gap: Spacing.sm,
  },
  rpeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rpeChip: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rpeText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.silver,
  },
});
