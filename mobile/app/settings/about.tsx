/**
 * About screen.
 *
 * App branding, version info, legal links, social links,
 * rate the app, and copyright notice.
 */

import React from "react";
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
  FileText,
  Lock,
  ShieldCheck,
  BookOpen,
  Star,
  Twitter,
  Instagram,
  ExternalLink,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AboutScreen() {
  const handleRateApp = () => {
    Alert.alert(
      "Rate Everist.ai",
      "Enjoying the app? We'd love your feedback on the App Store!",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Rate Us",
          onPress: () =>
            Linking.openURL("https://apps.apple.com/app/everist-ai"),
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
        {/* ── Logo / Branding ─────────────────────────────────────── */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.appName}>Everist.ai</Text>
          <Text style={styles.tagline}>
            Precision Health, Elevated
          </Text>
        </View>

        {/* ── Version Info ────────────────────────────────────────── */}
        <Card style={styles.versionCard}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
          <View style={styles.versionDivider} />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Build Number</Text>
            <Text style={styles.versionValue}>1</Text>
          </View>
          <View style={styles.versionDivider} />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Platform</Text>
            <Text style={styles.versionValue}>iOS / Android</Text>
          </View>
        </Card>

        {/* ── Legal ───────────────────────────────────────────────── */}
        <SettingsSection
          title="Legal"
          icon={<FileText size={16} color={Colors.gold} />}
        >
          <SettingsRow
            icon={<FileText size={18} color={Colors.silver} />}
            label="Terms of Service"
            onPress={() => Linking.openURL("https://everist.ai/terms")}
          />
          <SettingsRow
            icon={<Lock size={18} color={Colors.silver} />}
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://everist.ai/privacy")}
          />
          <SettingsRow
            icon={<ShieldCheck size={18} color={Colors.silver} />}
            label="HIPAA Notice"
            onPress={() => Linking.openURL("https://everist.ai/hipaa")}
          />
          <SettingsRow
            icon={<BookOpen size={18} color={Colors.silver} />}
            label="Open Source Licenses"
            onPress={() =>
              Alert.alert(
                "Open Source Licenses",
                "This app uses several open source libraries. Full license details are available in the app bundle."
              )
            }
            last
          />
        </SettingsSection>

        {/* ── Rate the App ────────────────────────────────────────── */}
        <Button
          title="Rate the App"
          variant="primary"
          size="lg"
          icon={<Star size={18} color={Colors.dark} />}
          onPress={handleRateApp}
          style={styles.rateBtn}
        />

        {/* ── Social Links ────────────────────────────────────────── */}
        <Text style={styles.socialTitle}>Follow Us</Text>
        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialBtn}
            onPress={() =>
              Linking.openURL("https://twitter.com/everist_ai")
            }
          >
            <Twitter size={20} color={Colors.silver} />
            <Text style={styles.socialLabel}>Twitter</Text>
          </Pressable>

          <Pressable
            style={styles.socialBtn}
            onPress={() =>
              Linking.openURL("https://instagram.com/everist.ai")
            }
          >
            <Instagram size={20} color={Colors.silver} />
            <Text style={styles.socialLabel}>Instagram</Text>
          </Pressable>
        </View>

        {/* ── Copyright ───────────────────────────────────────────── */}
        <Text style={styles.copyright}>
          {"©"} {new Date().getFullYear()} Everist.ai Inc. All rights reserved.
        </Text>
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

  /* Logo */
  logoSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
    marginBottom: Spacing.md,
  },
  logoText: {
    color: Colors.gold,
    fontSize: 36,
    fontWeight: "800",
  },
  appName: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 4,
    fontStyle: "italic",
  },

  /* Version card */
  versionCard: {
    marginBottom: Spacing.md,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  versionLabel: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
  },
  versionValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  versionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  /* Rate */
  rateBtn: {
    marginBottom: Spacing.lg,
  },

  /* Social */
  socialTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  socialLabel: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },

  /* Copyright */
  copyright: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    textAlign: "center",
    opacity: 0.6,
  },
});
