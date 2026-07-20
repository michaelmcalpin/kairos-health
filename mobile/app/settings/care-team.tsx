/**
 * Care Team screen.
 *
 * Lets the client manage which coaches can access their data.
 * Shows the primary coach (full access), coaches with granted access
 * (per-category None / View / Edit levels), and a form to find a coach
 * by email and grant new access.
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, UserPlus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type AccessLevel = "none" | "read" | "write";

interface AccessLevels {
  dietAccess: AccessLevel;
  exerciseAccess: AccessLevel;
  labsAccess: AccessLevel;
  healthDataAccess: AccessLevel;
}

const CATEGORIES: { key: keyof AccessLevels; label: string }[] = [
  { key: "dietAccess", label: "Diet" },
  { key: "exerciseAccess", label: "Exercise" },
  { key: "labsAccess", label: "Labs" },
  { key: "healthDataAccess", label: "Health Data" },
];

const DEFAULT_NEW_LEVELS: AccessLevels = {
  dietAccess: "read",
  exerciseAccess: "read",
  labsAccess: "read",
  healthDataAccess: "read",
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function CareTeamScreen() {
  const utils = trpc.useUtils();

  /* -- coach access list -- */
  const listQuery = trpc.clientPortal.coachAccess.list.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const listData = listQuery.data as any;
  const primary = listData?.primary ?? null;
  const granted: any[] = listData?.granted ?? [];

  /* -- optimistic overrides for granted-coach access levels -- */
  const [overrides, setOverrides] = useState<Record<string, Partial<AccessLevels>>>({});

  /* -- find coach form -- */
  const [emailInput, setEmailInput] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [newLevels, setNewLevels] = useState<AccessLevels>(DEFAULT_NEW_LEVELS);

  const findCoachQuery = trpc.clientPortal.coachAccess.findCoach.useQuery(
    { email: searchedEmail },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: searchedEmail.length > 0,
    } as any,
  );
  const foundCoach = findCoachQuery.data as any;

  /* -- mutations -- */
  const updateMutation = trpc.clientPortal.coachAccess.update.useMutation();
  const revokeMutation = trpc.clientPortal.coachAccess.revoke.useMutation();
  const grantMutation = trpc.clientPortal.coachAccess.grant.useMutation();

  /* -- handlers -- */
  const handleLevelChange = (
    grant: any,
    key: keyof AccessLevels,
    level: AccessLevel,
  ) => {
    const current: AccessLevels = {
      dietAccess: grant.dietAccess,
      exerciseAccess: grant.exerciseAccess,
      labsAccess: grant.labsAccess,
      healthDataAccess: grant.healthDataAccess,
      ...overrides[grant.grantId],
    };
    if (current[key] === level) return;

    // Optimistic local update so the toggle responds immediately
    setOverrides((prev) => ({
      ...prev,
      [grant.grantId]: { ...prev[grant.grantId], [key]: level },
    }));

    updateMutation.mutate(
      { grantId: grant.grantId, ...current, [key]: level },
      {
        onSuccess: () => {
          utils.clientPortal.coachAccess.list.invalidate();
        },
        onError: (error: any) => {
          // Revert the optimistic change
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[grant.grantId];
            return next;
          });
          Alert.alert(
            "Update Failed",
            error?.message ?? "Could not update access. Please try again.",
          );
        },
      },
    );
  };

  const handleRevoke = (grant: any) => {
    const coachName = [grant.firstName, grant.lastName].filter(Boolean).join(" ") || "this coach";
    Alert.alert(
      "Revoke Access",
      `${coachName} will no longer be able to see any of your data. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => {
            revokeMutation.mutate(
              { grantId: grant.grantId },
              {
                onSuccess: () => {
                  utils.clientPortal.coachAccess.list.invalidate();
                },
                onError: (error: any) => {
                  Alert.alert(
                    "Revoke Failed",
                    error?.message ?? "Could not revoke access. Please try again.",
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  const handleFindCoach = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      Alert.alert("Email Required", "Please enter the coach's email address.");
      return;
    }
    setNewLevels(DEFAULT_NEW_LEVELS);
    if (email === searchedEmail) {
      findCoachQuery.refetch();
    } else {
      setSearchedEmail(email);
    }
  };

  const handleGrant = () => {
    if (!foundCoach) return;
    grantMutation.mutate(
      {
        coachEmail: foundCoach.email,
        dietAccess: newLevels.dietAccess,
        exerciseAccess: newLevels.exerciseAccess,
        labsAccess: newLevels.labsAccess,
        healthDataAccess: newLevels.healthDataAccess,
      },
      {
        onSuccess: () => {
          const coachName =
            [foundCoach.firstName, foundCoach.lastName].filter(Boolean).join(" ") || "Coach";
          Alert.alert("Access Granted", `${coachName} can now see the categories you shared.`);
          setEmailInput("");
          setSearchedEmail("");
          setNewLevels(DEFAULT_NEW_LEVELS);
          utils.clientPortal.coachAccess.list.invalidate();
        },
        onError: (error: any) => {
          Alert.alert(
            "Grant Failed",
            error?.message ?? "Could not grant access. Please try again.",
          );
        },
      },
    );
  };

  const searchAttempted = searchedEmail.length > 0 && !findCoachQuery.isFetching;

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
          {/* ── Intro ─────────────────────────────────────────────── */}
          <Text style={styles.introText}>
            Control which coaches can see your data and what they can change.
          </Text>

          {listQuery.isLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Colors.gold} />
            </View>
          )}

          {/* ── Primary coach ─────────────────────────────────────── */}
          {primary && (
            <Card style={styles.section}>
              <View style={styles.coachHeader}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>
                    {((primary.firstName?.[0] ?? "") + (primary.lastName?.[0] ?? "")).toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>
                    {[primary.firstName, primary.lastName].filter(Boolean).join(" ")}
                  </Text>
                  <Text style={styles.coachEmail}>{primary.email}</Text>
                </View>
              </View>
              <View style={styles.primaryBadge}>
                <ShieldCheck size={14} color={Colors.dark} />
                <Text style={styles.primaryBadgeText}>Primary Coach — Full Access</Text>
              </View>
            </Card>
          )}

          {/* ── Granted coaches ───────────────────────────────────── */}
          {granted.map((grant) => {
            const levels: AccessLevels = {
              dietAccess: grant.dietAccess,
              exerciseAccess: grant.exerciseAccess,
              labsAccess: grant.labsAccess,
              healthDataAccess: grant.healthDataAccess,
              ...overrides[grant.grantId],
            };
            return (
              <Card key={grant.grantId} style={styles.section}>
                <View style={styles.coachHeader}>
                  <View style={styles.coachAvatar}>
                    <Text style={styles.coachAvatarText}>
                      {((grant.firstName?.[0] ?? "") + (grant.lastName?.[0] ?? "")).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.coachInfo}>
                    <Text style={styles.coachName}>
                      {[grant.firstName, grant.lastName].filter(Boolean).join(" ")}
                    </Text>
                    <Text style={styles.coachEmail}>{grant.email}</Text>
                  </View>
                </View>

                <View style={styles.categoryList}>
                  {CATEGORIES.map(({ key, label }) => (
                    <View key={key} style={styles.categoryRow}>
                      <Text style={styles.categoryLabel}>{label}</Text>
                      <LevelToggle
                        value={levels[key]}
                        onChange={(level) => handleLevelChange(grant, key, level)}
                      />
                    </View>
                  ))}
                </View>

                <Button
                  title="Revoke Access"
                  variant="danger"
                  size="sm"
                  loading={
                    revokeMutation.isPending &&
                    (revokeMutation.variables as any)?.grantId === grant.grantId
                  }
                  onPress={() => handleRevoke(grant)}
                  style={styles.revokeBtn}
                />
              </Card>
            );
          })}

          {!listQuery.isLoading && !primary && granted.length === 0 && (
            <Card style={styles.section}>
              <Text style={styles.emptyText}>
                No coaches have access to your data yet. Add a coach below to get started.
              </Text>
            </Card>
          )}

          {/* ── Add a Coach ───────────────────────────────────────── */}
          <Card style={styles.section}>
            <View style={styles.addHeader}>
              <UserPlus size={18} color={Colors.gold} />
              <Text style={styles.sectionTitle}>Add a Coach</Text>
            </View>

            <Text style={styles.fieldLabel}>Coach Email</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="coach@example.com"
              placeholderTextColor={Colors.silver}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              title="Find Coach"
              variant="secondary"
              size="sm"
              loading={findCoachQuery.isFetching}
              onPress={handleFindCoach}
              style={styles.findBtn}
            />

            {/* Search results */}
            {searchAttempted && !foundCoach && (
              <Text style={styles.notFoundText}>No coach found with that email.</Text>
            )}

            {searchAttempted && foundCoach && (
              <View style={styles.foundWrap}>
                <View style={styles.coachHeader}>
                  <View style={styles.coachAvatar}>
                    <Text style={styles.coachAvatarText}>
                      {((foundCoach.firstName?.[0] ?? "") + (foundCoach.lastName?.[0] ?? "")).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.coachInfo}>
                    <Text style={styles.coachName}>
                      {[foundCoach.firstName, foundCoach.lastName].filter(Boolean).join(" ")}
                    </Text>
                    <Text style={styles.coachEmail}>{foundCoach.email}</Text>
                  </View>
                </View>

                {!!foundCoach.bio && (
                  <Text style={styles.coachBio}>{foundCoach.bio}</Text>
                )}
                {Array.isArray(foundCoach.specialties) && foundCoach.specialties.length > 0 && (
                  <Text style={styles.coachSpecialties}>
                    {foundCoach.specialties.join(" · ")}
                  </Text>
                )}

                <View style={styles.categoryList}>
                  {CATEGORIES.map(({ key, label }) => (
                    <View key={key} style={styles.categoryRow}>
                      <Text style={styles.categoryLabel}>{label}</Text>
                      <LevelToggle
                        value={newLevels[key]}
                        onChange={(level) =>
                          setNewLevels((prev) => ({ ...prev, [key]: level }))
                        }
                      />
                    </View>
                  ))}
                </View>

                <Button
                  title="Grant Access"
                  variant="primary"
                  size="sm"
                  loading={grantMutation.isPending}
                  onPress={handleGrant}
                  style={styles.grantBtn}
                />
              </View>
            )}
          </Card>

          {/* ── Footer note ───────────────────────────────────────── */}
          <Text style={styles.footerNote}>
            Coaches only see the categories you share. You can change or revoke
            access anytime.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Access level toggle (None / View / Edit)                            */
/* ------------------------------------------------------------------ */

const LEVEL_OPTIONS: { label: string; value: AccessLevel }[] = [
  { label: "None", value: "none" },
  { label: "View", value: "read" },
  { label: "Edit", value: "write" },
];

function LevelToggle({
  value,
  onChange,
}: {
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
}) {
  return (
    <View style={toggleStyles.wrap}>
      {LEVEL_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[
            toggleStyles.btn,
            value === option.value && toggleStyles.btnActive,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              toggleStyles.text,
              value === option.value && toggleStyles.textActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
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

  introText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  loadingWrap: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },

  /* Sections */
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },

  /* Coach header */
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  coachAvatarText: {
    color: Colors.gold,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  coachEmail: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  /* Primary badge */
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
  },
  primaryBadgeText: {
    color: Colors.dark,
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },

  /* Category rows */
  categoryList: {
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  categoryLabel: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },

  /* Revoke */
  revokeBtn: {
    marginTop: Spacing.sm,
  },

  /* Empty state */
  emptyText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    textAlign: "center",
  },

  /* Add a coach */
  addHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
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
  findBtn: {
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
  },
  notFoundText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: Spacing.md,
  },
  foundWrap: {
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  coachBio: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  coachSpecialties: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  grantBtn: {
    marginTop: Spacing.sm,
  },

  /* Footer */
  footerNote: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
  },
});
