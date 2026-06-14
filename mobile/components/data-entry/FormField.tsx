/**
 * FormField -- a labeled text input styled for the dark theme.
 * Supports numeric and text modes, optional unit suffix,
 * and optional description text.
 */

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  unit?: string;
  description?: string;
  numeric?: boolean;
  multiline?: boolean;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  description,
  numeric = false,
  multiline = false,
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.multiline,
            unit ? styles.inputWithUnit : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.silver + "80"}
          keyboardType={numeric ? "numeric" : "default"}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          selectionColor={Colors.gold}
        />
        {unit ? (
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
        ) : null}
      </View>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  inputWithUnit: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  unitBadge: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unitText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  description: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
});
