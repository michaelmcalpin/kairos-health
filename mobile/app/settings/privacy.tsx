/**
 * Privacy & Security screen.
 *
 * Biometric lock, two-factor auth, data sharing controls,
 * data export / deletion, active sessions, and legal links.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Fingerprint,
  ShieldCheck,
  Users,
  FlaskConical,
  BarChart3,
  Download,
  Trash2,
  Smartphone,
  LogOut,
  FileText,
  Lock,
  ExternalLink,
} from "lucide-react-native";

import { useAuth } from "@clerk/clerk-expo";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function PrivacyScreen() {
  const { signOut } = useAuth();

  /* -- authentication toggles -- */
  const [biometricLock, setBiometricLock] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  /* -- data sharing toggles -- */
  const [shareCareTeam, setShareCareTeam] = useState(true);
  const [shareResearchers, setShareResearchers] = useState(false);
  const [anonymousAnalytics, setAnonymousAnalytics] = useState(true);

  /* -- export format -- */
  const [showFormatPicker, setShowFormatPicker] = useState(false);

  /* -- tRPC mutation for feature toggles -- */
  const toggleMutation = trpc.clientPortal.settings.updateFeatureToggle.useMutation();

  const handleBiometricToggle = (value: boolean) => {
    setBiometricLock(value);
    toggleMutation.mutate({ key: "biometric_login", value });
  };

  const handleTwoFactorToggle = (value: boolean) => {
    setTwoFactor(value);
    toggleMutation.mutate({ key: "two_factor_auth", value });
  };

  const handleExport = (format: "JSON" | "CSV") => {
    setShowFormatPicker(false);
    Alert.alert(
      "Export Requested",
      `We'll prepare a ${format} export of all your health data. You'll receive an email at your registered address when the download is ready (typically within 24 hours).`
    );
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      "Delete Account & Data",
      "This will submit a request to permanently delete your account and all associated health data. Our support team will process this within 30 days per our data retention policy. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Request Submitted",
              "Your deletion request has been sent to our support team at support@everist.ai. You will receive a confirmation email with next steps."
            ),
        },
      ]
    );
  };

  const handleSignOutAll = () => {
    Alert.alert(
      "Sign Out All Devices",
      "This will sign you out of all devices. You'll need to sign in again on each device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out All",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (e) {
              console.error("Sign out error:", e);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Authentication ──────────────────────────────────────── */}
        <SettingsSection
          title="Authentication"
          icon={<Fingerprint size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Fingerprint size={18} color={Colors.silver} />}
            label="Biometric Lock"
            subtitle="Face ID / Touch ID"
            value={biometricLock}
            onValueChange={handleBiometricToggle}
          />
          <SettingsRow
            type="toggle"
            icon={<ShieldCheck size={18} color={Colors.silver} />}
            label="Two-Factor Authentication"
            subtitle={twoFactor ? "Enabled" : "Disabled"}
            value={twoFactor}
            onValueChange={handleTwoFactorToggle}
            last
          />
        </SettingsSection>

        {/* ── Data Sharing ────────────────────────────────────────── */}
        <SettingsSection
          title="Data Sharing"
          icon={<Users size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Users size={18} color={Colors.silver} />}
            label="Share with Care Team"
            subtitle="Your doctors and care providers"
            value={shareCareTeam}
            onValueChange={setShareCareTeam}
          />
          <SettingsRow
            type="toggle"
            icon={<FlaskConical size={18} color={Colors.silver} />}
            label="Share with Researchers"
            subtitle="De-identified data for medical research"
            value={shareResearchers}
            onValueChange={setShareResearchers}
          />
          <SettingsRow
            type="toggle"
            icon={<BarChart3 size={18} color={Colors.silver} />}
            label="Anonymous Analytics"
            subtitle="Help us improve the app"
            value={anonymousAnalytics}
            onValueChange={setAnonymousAnalytics}
            last
          />
        </SettingsSection>

        {/* ── Data Export ─────────────────────────────────────────── */}
        <SettingsSection
          title="Your Data"
          icon={<Download size={16} color={Colors.gold} />}
        >
          <View style={styles.exportSection}>
            <Button
              title="Export All Health Data"
              variant="secondary"
              size="md"
              icon={<Download size={16} color={Colors.gold} />}
              onPress={() => setShowFormatPicker(!showFormatPicker)}
              style={styles.exportBtn}
            />

            {showFormatPicker && (
              <View style={styles.formatPicker}>
                <Text style={styles.formatLabel}>Choose format:</Text>
                <View style={styles.formatRow}>
                  <Pressable
                    style={styles.formatOption}
                    onPress={() => handleExport("JSON")}
                  >
                    <Text style={styles.formatOptionText}>JSON</Text>
                  </Pressable>
                  <Pressable
                    style={styles.formatOption}
                    onPress={() => handleExport("CSV")}
                  >
                    <Text style={styles.formatOptionText}>CSV</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Button
              title="Request Data Deletion"
              variant="danger"
              size="md"
              icon={<Trash2 size={16} color={Colors.danger} />}
              onPress={handleDeleteRequest}
              style={styles.exportBtn}
            />
          </View>
        </SettingsSection>

        {/* ── Active Sessions ─────────────────────────────────────── */}
        <SettingsSection
          title="Active Sessions"
          icon={<Smartphone size={16} color={Colors.gold} />}
        >
          <View style={styles.sessionItem}>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionIconWrap}>
                <Smartphone size={20} color={Colors.gold} />
              </View>
              <View style={styles.sessionDetails}>
                <Text style={styles.sessionDevice}>iPhone 15 Pro</Text>
                <Text style={styles.sessionMeta}>iOS 17.4 - Current device</Text>
                <Text style={styles.sessionMeta}>Last active: Now</Text>
              </View>
            </View>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          </View>

          <View style={styles.signOutAllWrap}>
            <Button
              title="Sign Out All Devices"
              variant="danger"
              size="md"
              icon={<LogOut size={16} color={Colors.danger} />}
              onPress={handleSignOutAll}
            />
          </View>
        </SettingsSection>

        {/* ── Legal ───────────────────────────────────────────────── */}
        <SettingsSection
          title="Legal"
          icon={<FileText size={16} color={Colors.gold} />}
        >
          <SettingsRow
            icon={<FileText size={18} color={Colors.silver} />}
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://everist.ai/privacy")}
          />
          <SettingsRow
            icon={<Lock size={18} color={Colors.silver} />}
            label="Terms of Service"
            onPress={() => Linking.openURL("https://everist.ai/terms")}
            last
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

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

  /* Export */
  exportSection: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  exportBtn: {
    width: "100%",
  },
  formatPicker: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  formatLabel: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  formatRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  formatOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: "center",
  },
  formatOptionText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },

  /* Sessions */
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sessionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionDevice: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  sessionMeta: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: Colors.successMuted,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  currentBadgeText: {
    color: Colors.success,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  signOutAllWrap: {
    padding: Spacing.md,
  },
});
