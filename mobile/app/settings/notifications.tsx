/**
 * Notification Preferences screen.
 *
 * Lets a client toggle Email Alerts, Push Notifications, Text (SMS) Alerts,
 * and the Weekly Digest. The delivery engine reads preferences keyed by
 * CATEGORY (health_alert, appointment, …), so the coarse UI toggles here are
 * mapped onto that category shape on save — mirroring the web settings page
 * (src/app/(client)/settings/page.tsx).
 *
 * SMS delivery is live server-side; this screen is the client opt-in.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  CalendarClock,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";

/* ------------------------------------------------------------------ */
/* Types & category defaults                                           */
/* ------------------------------------------------------------------ */

type ChannelPreferences = {
  in_app: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
};

/**
 * Categories eligible for SMS when the client opts in. SMS is reserved for
 * time-sensitive, coach-driven alerts (not billing/system/marketing).
 * Mirrors SMS_ELIGIBLE on the web settings page.
 */
const SMS_ELIGIBLE = [
  "health_alert",
  "appointment",
  "protocol_update",
  "coach_message",
  "lab_result",
] as const;

/**
 * Per-category default channel prefs, mirroring
 * DEFAULT_PREFERENCES.categories in src/lib/notifications/types.ts.
 * Used to derive per-category email/push defaults and to enumerate the full
 * category key set when the query does not return every category.
 */
const DEFAULT_CATEGORIES: Record<string, ChannelPreferences> = {
  health_alert: { in_app: true, email: true, push: true, sms: true },
  insight: { in_app: true, email: true, push: false, sms: false },
  weekly_report: { in_app: true, email: true, push: false, sms: false },
  coach_message: { in_app: true, email: true, push: true, sms: false },
  appointment: { in_app: true, email: true, push: true, sms: true },
  lab_result: { in_app: true, email: true, push: true, sms: false },
  supplement: { in_app: true, email: false, push: true, sms: false },
  fasting: { in_app: true, email: false, push: true, sms: false },
  streak: { in_app: true, email: false, push: true, sms: false },
  billing: { in_app: true, email: true, push: false, sms: false },
  system: { in_app: true, email: true, push: false, sms: false },
  onboarding: { in_app: true, email: true, push: false, sms: false },
  protocol_update: { in_app: true, email: true, push: true, sms: false },
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function NotificationPreferencesScreen() {
  const router = useRouter();

  /* -- same settings query used by edit-profile / profile -- */
  const settingsQuery = trpc.clientPortal.settings.getSettings.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const utils = trpc.useUtils();
  const updateNotificationsMutation =
    trpc.clientPortal.settings.updateNotificationPreferences.useMutation();

  /* -- coarse UI toggles (null-safe defaults) -- */
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [saving, setSaving] = useState(false);

  /* -- current mobile number on file (for the SMS requirement copy) -- */
  const phoneOnFile: string | null =
    (settingsQuery.data as any)?.contactInfo?.phone ?? null;

  /* -- Derive toggles from prefs.categories, mirroring the web page.
   *    Prefs are keyed by CATEGORY: health_alert covers email/push/SMS,
   *    weekly_report.email drives the weekly digest. -- */
  useEffect(() => {
    const categories = (settingsQuery.data as any)?.notificationPreferences
      ?.categories as
      | Partial<Record<string, ChannelPreferences>>
      | undefined;
    if (!categories) return;

    const alerts = categories.health_alert;
    const digest = categories.weekly_report;
    setEmailAlerts(alerts?.email ?? true);
    setPushNotifications(alerts?.push ?? true);
    setSmsAlerts(alerts?.sms ?? false);
    setWeeklyDigest(digest?.email ?? false);
  }, [settingsQuery.data]);

  /* -- Save: map the coarse toggles back onto the category shape. -- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const existingCats = ((settingsQuery.data as any)?.notificationPreferences
        ?.categories ?? {}) as Partial<Record<string, ChannelPreferences>>;

      // Union of the known default categories and whatever the query returned,
      // so nothing is dropped and missing categories self-heal to defaults.
      const allKeys = Array.from(
        new Set([
          ...Object.keys(DEFAULT_CATEGORIES),
          ...Object.keys(existingCats),
        ]),
      );

      const categories: Record<string, ChannelPreferences> = {};
      for (const cat of allKeys) {
        const def = {
          ...(DEFAULT_CATEGORIES[cat] ?? {
            in_app: true,
            email: true,
            push: true,
            sms: false,
          }),
          ...existingCats[cat],
        };
        categories[cat] = {
          in_app: true, // in-app delivery is always on
          email: def.email && emailAlerts,
          push: def.push && pushNotifications,
          // The SMS toggle turns texting ON for the eligible categories (their
          // category defaults ship OFF for consent reasons, so we must not AND
          // against them or SMS could never enable).
          sms: smsAlerts && (SMS_ELIGIBLE as readonly string[]).includes(cat),
        };
      }

      // "Weekly Digest" specifically governs the weekly_report category's email.
      if (categories.weekly_report) {
        categories.weekly_report.email = weeklyDigest;
      } else {
        categories.weekly_report = {
          in_app: true,
          email: weeklyDigest,
          push: false,
          sms: false,
        };
      }

      await updateNotificationsMutation.mutateAsync({ categories });
      await utils.clientPortal.settings.getSettings.invalidate();
      Alert.alert("Saved", "Your notification preferences have been updated.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ??
          "Failed to save notification preferences. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Delivery channels ─────────────────────────────────── */}
        <SettingsSection
          title="Notification Preferences"
          icon={<Bell size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Mail size={18} color={Colors.silver} />}
            label="Email Alerts"
            value={emailAlerts}
            onValueChange={setEmailAlerts}
          />
          <SettingsRow
            type="toggle"
            icon={<Smartphone size={18} color={Colors.silver} />}
            label="Push Notifications"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <SettingsRow
            type="toggle"
            icon={<MessageSquare size={18} color={Colors.silver} />}
            label="Text (SMS) Alerts"
            value={smsAlerts}
            onValueChange={setSmsAlerts}
          />

          {/* SMS consent + requirement copy */}
          <View style={styles.consentBlock}>
            <Text style={styles.consentText}>
              Get texts for time-sensitive alerts (appointments, coach &
              protocol updates). Requires a mobile number on file — set it in
              Edit Profile. By enabling, you consent to receive automated texts;
              message & data rates may apply. Reply STOP to opt out.
            </Text>
            {phoneOnFile ? (
              <Text style={styles.phoneOnFile}>
                Mobile number on file: {phoneOnFile}
              </Text>
            ) : (
              <Text style={styles.phoneMissing}>
                No mobile number on file yet.
              </Text>
            )}
            <Pressable
              onPress={() => router.push("/settings/edit-profile")}
              style={({ pressed }) => [pressed && styles.linkPressed]}
            >
              <Text style={styles.link}>Edit Profile →</Text>
            </Pressable>
          </View>

          <SettingsRow
            type="toggle"
            icon={<CalendarClock size={18} color={Colors.silver} />}
            label="Weekly Digest"
            value={weeklyDigest}
            onValueChange={setWeeklyDigest}
            last
          />
        </SettingsSection>

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
  consentBlock: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  consentText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
  phoneOnFile: {
    color: Colors.success,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  phoneMissing: {
    color: Colors.warning,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  link: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  linkPressed: {
    opacity: 0.7,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
