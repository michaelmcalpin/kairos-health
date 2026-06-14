/**
 * Edit Profile screen.
 *
 * Form for updating personal information, physical stats,
 * gender, and health goals. Pre-populated with sample data.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type HeightUnit = "ft-in" | "cm";
type WeightUnit = "lbs" | "kg";
type Gender = "Male" | "Female" | "Non-binary" | "Prefer not to say";

const GENDER_OPTIONS: Gender[] = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function EditProfileScreen() {
  /* -- form state -- */
  const [firstName, setFirstName] = useState("Michael");
  const [lastName, setLastName] = useState("McAlpin");
  const [email, setEmail] = useState("michael.mcalpin@gmail.com");
  const [phone, setPhone] = useState("+1 (555) 012-3456");
  const [dob, setDob] = useState("1988-03-15");

  /* -- height / weight -- */
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("ft-in");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("10");
  const [heightCm, setHeightCm] = useState("178");

  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [weightLbs, setWeightLbs] = useState("185");
  const [weightKg, setWeightKg] = useState("84");

  /* -- gender -- */
  const [gender, setGender] = useState<Gender>("Male");

  /* -- health goals -- */
  const [healthGoals, setHealthGoals] = useState(
    "Optimize cardiovascular health, improve sleep quality, maintain healthy body composition, and increase VO2 max."
  );

  const [saving, setSaving] = useState(false);

  /* -- handlers -- */
  const handleSave = async () => {
    setSaving(true);
    // Simulate network call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSaving(false);
    Alert.alert("Saved", "Your profile has been updated.");
  };

  const handleChangePhoto = () => {
    Alert.alert("Change Photo", "Choose a source", [
      { text: "Camera", onPress: () => {} },
      { text: "Photo Library", onPress: () => {} },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Profile Photo ─────────────────────────────────────── */}
          <View style={styles.photoSection}>
            <Pressable onPress={handleChangePhoto} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>MM</Text>
              </View>
              <View style={styles.cameraOverlay}>
                <Camera size={16} color={Colors.white} />
              </View>
            </Pressable>
            <Pressable onPress={handleChangePhoto}>
              <Text style={styles.changePhotoLabel}>Change Photo</Text>
            </Pressable>
          </View>

          {/* ── Personal Info ─────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor={Colors.silver}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor={Colors.silver}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.silver}
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={Colors.silver}
            />

            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.silver}
            />
          </Card>

          {/* ── Body Measurements ─────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Body Measurements</Text>

            {/* Height */}
            <View style={styles.measurementHeader}>
              <Text style={styles.fieldLabel}>Height</Text>
              <UnitToggle
                left="ft-in"
                right="cm"
                active={heightUnit}
                onToggle={(v) => setHeightUnit(v as HeightUnit)}
              />
            </View>
            {heightUnit === "ft-in" ? (
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <TextInput
                    style={styles.input}
                    value={heightFt}
                    onChangeText={setHeightFt}
                    keyboardType="numeric"
                    placeholder="ft"
                    placeholderTextColor={Colors.silver}
                  />
                  <Text style={styles.unitLabel}>ft</Text>
                </View>
                <View style={styles.halfField}>
                  <TextInput
                    style={styles.input}
                    value={heightIn}
                    onChangeText={setHeightIn}
                    keyboardType="numeric"
                    placeholder="in"
                    placeholderTextColor={Colors.silver}
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  placeholder="cm"
                  placeholderTextColor={Colors.silver}
                />
                <Text style={styles.unitLabel}>cm</Text>
              </View>
            )}

            {/* Weight */}
            <View style={[styles.measurementHeader, { marginTop: Spacing.md }]}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <UnitToggle
                left="lbs"
                right="kg"
                active={weightUnit}
                onToggle={(v) => setWeightUnit(v as WeightUnit)}
              />
            </View>
            <View>
              <TextInput
                style={styles.input}
                value={weightUnit === "lbs" ? weightLbs : weightKg}
                onChangeText={weightUnit === "lbs" ? setWeightLbs : setWeightKg}
                keyboardType="numeric"
                placeholderTextColor={Colors.silver}
              />
              <Text style={styles.unitLabel}>
                {weightUnit === "lbs" ? "lbs" : "kg"}
              </Text>
            </View>
          </Card>

          {/* ── Gender ────────────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.genderGrid}>
              {GENDER_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionActive,
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === option && styles.genderTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* ── Health Goals ──────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Health Goals</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={healthGoals}
              onChangeText={setHealthGoals}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Describe your health and wellness goals..."
              placeholderTextColor={Colors.silver}
            />
          </Card>

          {/* ── Save ──────────────────────────────────────────────── */}
          <Button
            title="Save Changes"
            variant="primary"
            size="lg"
            loading={saving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Unit toggle helper                                                  */
/* ------------------------------------------------------------------ */

function UnitToggle({
  left,
  right,
  active,
  onToggle,
}: {
  left: string;
  right: string;
  active: string;
  onToggle: (val: string) => void;
}) {
  return (
    <View style={toggleStyles.wrap}>
      <Pressable
        style={[
          toggleStyles.btn,
          active === left && toggleStyles.btnActive,
        ]}
        onPress={() => onToggle(left)}
      >
        <Text
          style={[
            toggleStyles.text,
            active === left && toggleStyles.textActive,
          ]}
        >
          {left}
        </Text>
      </Pressable>
      <Pressable
        style={[
          toggleStyles.btn,
          active === right && toggleStyles.btnActive,
        ]}
        onPress={() => onToggle(right)}
      >
        <Text
          style={[
            toggleStyles.text,
            active === right && toggleStyles.textActive,
          ]}
        >
          {right}
        </Text>
      </Pressable>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    padding: 2,
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: Radii.sm - 1,
  },
  btnActive: {
    backgroundColor: Colors.gold,
  },
  text: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  textActive: {
    color: Colors.dark,
  },
});

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },

  /* Photo */
  photoSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarText: {
    color: Colors.gold,
    fontSize: FontSizes.xxl,
    fontWeight: "700",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  changePhotoLabel: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },

  /* Sections */
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },

  /* Fields */
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  unitLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 4,
    textAlign: "right",
  },

  /* Measurement header */
  measurementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Gender */
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  genderOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navyLight,
  },
  genderOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(200, 169, 81, 0.15)",
  },
  genderText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  genderTextActive: {
    color: Colors.gold,
  },

  /* Save */
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
