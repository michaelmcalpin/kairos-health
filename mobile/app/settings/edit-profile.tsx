/**
 * Edit Profile screen.
 *
 * Form for updating personal information, physical stats,
 * gender, and health goals. Pre-populated with sample data.
 */

import React, { useState, useEffect } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "lucide-react-native";

import { useAuth } from "@clerk/clerk-expo";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { API_URL } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { showImagePickerOptions } from "@/lib/image-picker";

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
  const { getToken } = useAuth();

  /* -- tRPC query for current profile -- */
  const profileQuery = trpc.clientPortal.settings.getSettings.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- latest body measurement (weight lives here, not on the profile) -- */
  const latestMeasurementQuery = trpc.clientPortal.measurements.latest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- form state (initialized empty, populated from query via useEffect) -- */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");

  /* -- height / weight -- */
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("ft-in");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");

  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [weightLbs, setWeightLbs] = useState("");
  const [weightKg, setWeightKg] = useState("");

  /* -- gender -- */
  const [gender, setGender] = useState<Gender>("Male");

  /* -- health goals -- */
  const [healthGoals, setHealthGoals] = useState("");

  /* -- profile photo -- */
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  /* -- Populate form state from profile query -- */
  /* Backend returns a NESTED shape: { user, clientProfile, contactInfo, notificationPreferences } */
  useEffect(() => {
    const data = profileQuery.data as any;
    if (!data) return;

    // User (Clerk-managed identity)
    setFirstName(data.user?.firstName ?? "");
    setLastName(data.user?.lastName ?? "");
    setEmail(data.user?.email ?? "");
    if (data.user?.avatarUrl) setPhotoUri(data.user.avatarUrl);

    // Contact info
    setPhone(data.contactInfo?.phone ?? "");

    // Client profile
    setDob(data.clientProfile?.dateOfBirth ?? "");
    if (data.clientProfile?.gender) setGender(data.clientProfile.gender);

    // Height is stored as total inches — convert to ft/in for display
    const totalInches = data.clientProfile?.heightInches;
    if (totalInches && totalInches > 0) {
      setHeightFt(String(Math.floor(totalInches / 12)));
      setHeightIn(String(Math.round(totalInches % 12)));
      setHeightCm(String(Math.round(totalInches * 2.54)));
    }

    // Goals is a string[] — join for the multiline text field
    if (Array.isArray(data.clientProfile?.goals) && data.clientProfile.goals.length > 0) {
      setHealthGoals(data.clientProfile.goals.join("\n"));
    }
  }, [profileQuery.data]);

  /* -- Populate weight from latest body measurement -- */
  useEffect(() => {
    const m = latestMeasurementQuery.data as any;
    if (m?.weightLbs) {
      setWeightLbs(String(m.weightLbs));
      setWeightKg(String(Math.round(m.weightLbs * 0.4536 * 10) / 10));
    }
  }, [latestMeasurementQuery.data]);

  // Profile mutations
  const updateProfileMutation = trpc.clientPortal.settings.updateProfile.useMutation();
  const updateClientProfileMutation = trpc.clientPortal.settings.updateClientProfile.useMutation();
  const updateContactInfoMutation = trpc.clientPortal.settings.updateContactInfo.useMutation();
  const createMeasurementMutation = trpc.clientPortal.measurements.create.useMutation();
  const utils = trpc.useUtils();

  /* -- handlers -- */
  const handleSave = async () => {
    setSaving(true);
    try {
      // Height: convert to total inches (backend stores heightInches)
      let heightInches: number | undefined;
      if (heightUnit === "ft-in" && (heightFt || heightIn)) {
        heightInches = Number(heightFt || 0) * 12 + Number(heightIn || 0);
      } else if (heightUnit === "cm" && heightCm) {
        heightInches = Math.round((Number(heightCm) / 2.54) * 10) / 10;
      }

      // Goals: backend stores string[] — split the multiline field
      const goals = healthGoals
        .split("\n")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);

      const mutations: Promise<unknown>[] = [
        updateProfileMutation.mutateAsync({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
        updateClientProfileMutation.mutateAsync({
          dateOfBirth: dob || undefined,
          gender: gender || undefined,
          heightInches,
          goals: goals.length > 0 ? goals : undefined,
        }),
      ];

      if (phone) {
        mutations.push(updateContactInfoMutation.mutateAsync({ phone }));
      }

      // Weight lives in body measurements, not the profile
      const weightVal =
        weightUnit === "lbs"
          ? Number(weightLbs)
          : Math.round(Number(weightKg) / 0.4536 * 10) / 10;
      const previousWeight = (latestMeasurementQuery.data as any)?.weightLbs;
      if (weightVal > 0 && weightVal !== previousWeight) {
        mutations.push(
          createMeasurementMutation.mutateAsync({
            weightLbs: weightVal,
            source: "manual",
          }),
        );
      }

      await Promise.all(mutations);
      utils.clientPortal.settings.getSettings.invalidate();
      utils.clientPortal.measurements.latest.invalidate();
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    const image = await showImagePickerOptions();
    if (!image) return;

    // Optimistic local preview
    setPhotoUri(image.uri);

    try {
      // Upload to the backend blob storage
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", {
        uri: image.uri,
        name: image.fileName ?? "avatar.jpg",
        type: image.type ?? "image/jpeg",
      } as any);
      formData.append("category", "photo");

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      const result = await res.json();
      const avatarUrl = result?.url ?? result?.blob?.url;
      if (avatarUrl) {
        await updateProfileMutation.mutateAsync({ avatarUrl });
        utils.clientPortal.settings.getSettings.invalidate();
      }
    } catch (error: any) {
      Alert.alert(
        "Upload Failed",
        error?.message ?? "Could not upload your photo. Please try again.",
      );
    }
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
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?"}
                  </Text>
                )}
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
              style={[styles.input, { opacity: 0.6 }]}
              value={email}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.silver}
            />
            <Text style={styles.unitLabel}>Managed by your login provider</Text>

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
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
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
    backgroundColor: "rgba(74, 144, 217, 0.15)",
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
