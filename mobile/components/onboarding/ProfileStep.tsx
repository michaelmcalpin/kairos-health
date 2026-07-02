/**
 * Profile step — collects basic user information.
 *
 * Fields: first name, last name, date of birth, gender, height.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { User, Calendar, ChevronDown } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export interface ProfileData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  heightFeet: string;
  heightInches: string;
}

interface Props {
  data: ProfileData;
  onUpdate: (data: ProfileData) => void;
  onContinue: () => void;
  onBack: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function ProfileStep({ data, onUpdate, onContinue, onBack }: Props) {
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const isValid =
    data.firstName.trim().length > 0 && data.lastName.trim().length > 0;

  const selectedGenderLabel =
    GENDER_OPTIONS.find((g) => g.value === data.gender)?.label ?? "Select";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <User size={28} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself so we can personalize your experience.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name row */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={Colors.silver}
                value={data.firstName}
                onChangeText={(t) => onUpdate({ ...data, firstName: t })}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={Colors.silver}
                value={data.lastName}
                onChangeText={(t) => onUpdate({ ...data, lastName: t })}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.inputRow}>
              <Calendar size={18} color={Colors.silver} />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={Colors.silver}
                value={data.dateOfBirth}
                onChangeText={(t) => onUpdate({ ...data, dateOfBirth: t })}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setShowGenderPicker(!showGenderPicker)}
            >
              <Text
                style={[
                  styles.selectorText,
                  !data.gender && styles.selectorPlaceholder,
                ]}
              >
                {data.gender ? selectedGenderLabel : "Select gender"}
              </Text>
              <ChevronDown
                size={18}
                color={Colors.silver}
                style={
                  showGenderPicker
                    ? { transform: [{ rotate: "180deg" }] }
                    : undefined
                }
              />
            </Pressable>

            {showGenderPicker && (
              <View style={styles.pickerOptions}>
                {GENDER_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.pickerOption,
                      data.gender === opt.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      onUpdate({ ...data, gender: opt.value });
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        data.gender === opt.value &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Height */}
          <View style={styles.field}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <TextInput
                  style={styles.input}
                  placeholder="Feet"
                  placeholderTextColor={Colors.silver}
                  value={data.heightFeet}
                  onChangeText={(t) => onUpdate({ ...data, heightFeet: t })}
                  keyboardType="number-pad"
                  maxLength={1}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.halfField}>
                <TextInput
                  style={styles.input}
                  placeholder="Inches"
                  placeholderTextColor={Colors.silver}
                  value={data.heightInches}
                  onChangeText={(t) => onUpdate({ ...data, heightInches: t })}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Button
            title="Continue"
            variant="primary"
            onPress={onContinue}
            disabled={!isValid}
            style={styles.continueBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  field: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing.md,
  },
  inputWithIcon: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingLeft: Spacing.sm,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  selectorPlaceholder: {
    color: Colors.silver,
  },
  pickerOptions: {
    marginTop: Spacing.xs,
    borderRadius: Radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.navy,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerOptionActive: {
    backgroundColor: "rgba(74, 144, 217, 0.1)",
  },
  pickerOptionText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
  },
  pickerOptionTextActive: {
    color: Colors.gold,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  backText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    fontWeight: "500",
  },
  continueBtn: {
    minWidth: 140,
  },
});
