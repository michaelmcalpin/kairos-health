/**
 * Profile / Settings tab.
 *
 * Full-featured settings screen with profile header, health overview,
 * notification toggles, connected devices, health preferences,
 * privacy & security, support links, and sign-out.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Watch,
  Smartphone,
  Activity,
  Heart,
  Mail,
  Lock,
  FileText,
  Trash2,
  Download,
  Globe,
  Ruler,
  UserPlus,
  Stethoscope,
  Phone,
  Crown,
  Fingerprint,
  Eye,
  MessageCircle,
  BookOpen,
  Info,
  Plus,
  Settings,
  Dumbbell,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii, APP_VERSION } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS, SAMPLE_DATA } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SummitGlyph } from "@/components/brand";

/* ------------------------------------------------------------------ */
/* Fallback sample data                                                */
/* ------------------------------------------------------------------ */

const FALLBACK_USER = SAMPLE_DATA.userProfile;

const FALLBACK_DEVICES = [
  { name: "Apple Health", connected: true, route: "/devices/apple-health" as const },
  { name: "Apple Watch", connected: true, route: null },
  { name: "Oura Ring", connected: true, route: null },
  { name: "Dexcom G7", connected: true, route: null },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  /* -- tRPC query for profile data -- */
  const profileQuery = trpc.clientPortal.profile.get.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- Map API response → local shape, falling back to sample data -- */
  const profileData = profileQuery.data;
  const USER = profileData
    ? {
        initials:
          ((profileData.firstName?.[0] ?? "") +
            (profileData.lastName?.[0] ?? "")).toUpperCase() ||
          FALLBACK_USER.initials,
        name:
          [profileData.firstName, profileData.lastName]
            .filter(Boolean)
            .join(" ") || FALLBACK_USER.name,
        email: profileData.email ?? FALLBACK_USER.email,
        memberSince: profileData.memberSince ?? FALLBACK_USER.memberSince,
        age: profileData.age ?? FALLBACK_USER.age,
        height: profileData.height ?? FALLBACK_USER.height,
        weight: profileData.weight ?? FALLBACK_USER.weight,
        bloodType: profileData.bloodType ?? FALLBACK_USER.bloodType,
        healthScore: profileData.healthScore ?? FALLBACK_USER.healthScore,
        tier: profileData.tier ?? FALLBACK_USER.tier,
      }
    : {
        ...FALLBACK_USER,
        // Enrich fallback with auth stub data when available
        initials:
          ((authUser?.firstName?.[0] ?? "") +
            (authUser?.lastName?.[0] ?? "")).toUpperCase() ||
          FALLBACK_USER.initials,
        name:
          [authUser?.firstName, authUser?.lastName]
            .filter(Boolean)
            .join(" ") || FALLBACK_USER.name,
        email:
          authUser?.emailAddresses?.[0]?.emailAddress ?? FALLBACK_USER.email,
      };

  const DEVICES = profileData?.devices ?? FALLBACK_DEVICES;

  /* -- pull to refresh -- */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await profileQuery.refetch();
    setRefreshing(false);
  }, [profileQuery]);

  /* -- notification toggles -- */
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [labAlerts, setLabAlerts] = useState(true);
  const [protocolReminders, setProtocolReminders] = useState(false);

  /* -- health preferences -- */
  const [useMetric, setUseMetric] = useState(false);

  /* -- privacy & security -- */
  const [biometricLogin, setBiometricLogin] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  /* -- helpers -- */
  const noop = () => {};
  const confirmAction = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "Cancel" }, { text: "OK" }]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 1. PROFILE HEADER                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{USER.initials}</Text>
          </View>

          {/* Name + email */}
          <Text style={styles.profileName}>{USER.name}</Text>
          <Text style={styles.profileEmail}>{USER.email}</Text>

          {/* Member since */}
          <Text style={styles.memberSince}>
            Member since {USER.memberSince}
          </Text>

          {/* Edit Profile */}
          <Button
            title="Edit Profile"
            variant="secondary"
            size="sm"
            onPress={() => router.push("/settings/edit-profile")}
            style={styles.editProfileBtn}
          />
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 2. HEALTH OVERVIEW                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={styles.healthLabel}>Health Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{USER.healthScore}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>
            <Badge label={USER.tier} variant="warning" />
          </View>

          {/* Stat grid */}
          <View style={styles.statsGrid}>
            <StatItem label="Age" value={String(USER.age)} />
            <StatItem label="Height" value={USER.height} />
            <StatItem label="Weight" value={USER.weight} />
            <StatItem label="Blood Type" value={USER.bloodType} />
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3a. NOTIFICATIONS                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Notifications"
          icon={<Bell size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Smartphone size={18} color={Colors.silver} />}
            label="Push Notifications"
            value={pushNotifs}
            onValueChange={setPushNotifs}
          />
          <SettingsRow
            type="toggle"
            icon={<Mail size={18} color={Colors.silver} />}
            label="Email Notifications"
            value={emailNotifs}
            onValueChange={setEmailNotifs}
          />
          <SettingsRow
            type="toggle"
            icon={<Activity size={18} color={Colors.silver} />}
            label="Appointment Reminders"
            value={appointmentReminders}
            onValueChange={setAppointmentReminders}
          />
          <SettingsRow
            type="toggle"
            icon={<Heart size={18} color={Colors.silver} />}
            label="Lab Results Alerts"
            value={labAlerts}
            onValueChange={setLabAlerts}
          />
          <SettingsRow
            type="toggle"
            icon={<FileText size={18} color={Colors.silver} />}
            label="Protocol Reminders"
            value={protocolReminders}
            onValueChange={setProtocolReminders}
            last
          />
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3b. CONNECTED DEVICES                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Connected Devices"
          icon={<Watch size={16} color={Colors.gold} />}
        >
          {DEVICES.map((d: any, i: any) => (
            <SettingsRow
              key={d.name}
              type="badge"
              icon={
                d.name === "Apple Health" ? (
                  <Heart size={18} color={Colors.silver} />
                ) : (
                  <Watch size={18} color={Colors.silver} />
                )
              }
              label={d.name}
              badgeLabel={d.connected ? "Connected" : "Disconnected"}
              badgeColor={d.connected ? Colors.success : Colors.silver}
              onPress={
                d.route
                  ? () => router.push(d.route as any)
                  : noop
              }
              last={i === DEVICES.length - 1}
            />
          ))}
          <View style={styles.connectDeviceWrap}>
            <Button
              title="Connect Device"
              variant="secondary"
              size="sm"
              icon={<Plus size={16} color={Colors.gold} />}
              onPress={noop}
            />
          </View>
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3c. HEALTH PREFERENCES                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Health Preferences"
          icon={<Settings size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Ruler size={18} color={Colors.silver} />}
            label="Metric Units"
            subtitle={useMetric ? "kg, cm" : "lbs, ft/in"}
            value={useMetric}
            onValueChange={setUseMetric}
          />
          <SettingsRow
            type="value"
            icon={<Globe size={18} color={Colors.silver} />}
            label="Timezone"
            value="Pacific (PT)"
            onPress={noop}
          />
          <SettingsRow
            type="value"
            icon={<Stethoscope size={18} color={Colors.silver} />}
            label="Primary Doctor"
            value="Dr. Sarah Chen"
            onPress={noop}
          />
          <SettingsRow
            type="value"
            icon={<Dumbbell size={18} color={Colors.silver} />}
            label="Your Coach"
            value="Walid Kherat"
            onPress={() => router.push("/coach")}
          />
          <SettingsRow
            type="value"
            icon={<Phone size={18} color={Colors.silver} />}
            label="Emergency Contact"
            value="Jane McAlpin"
            onPress={noop}
            last
          />
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3d. PRIVACY & SECURITY                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Privacy & Security"
          icon={<Shield size={16} color={Colors.gold} />}
        >
          <SettingsRow
            type="toggle"
            icon={<Fingerprint size={18} color={Colors.silver} />}
            label="Biometric Login"
            subtitle="Face ID / Touch ID"
            value={biometricLogin}
            onValueChange={setBiometricLogin}
          />
          <SettingsRow
            type="toggle"
            icon={<Eye size={18} color={Colors.silver} />}
            label="Data Sharing"
            subtitle="Anonymized data for research"
            value={dataSharing}
            onValueChange={setDataSharing}
          />
          <SettingsRow
            icon={<Shield size={18} color={Colors.silver} />}
            label="Privacy & Security Settings"
            subtitle="Data export, sessions, 2FA"
            onPress={() => router.push("/settings/privacy")}
          />
          <SettingsRow
            icon={<Trash2 size={18} color={Colors.danger} />}
            label="Delete Account"
            danger
            onPress={() =>
              confirmAction(
                "Delete Account",
                "This will permanently delete your account and all associated data. This action cannot be undone."
              )
            }
            last
          />
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3e. SUPPORT                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Support"
          icon={<HelpCircle size={16} color={Colors.gold} />}
        >
          <SettingsRow
            icon={<BookOpen size={18} color={Colors.silver} />}
            label="Help Center"
            onPress={() => router.push("/settings/help")}
          />
          <SettingsRow
            icon={<MessageCircle size={18} color={Colors.silver} />}
            label="Contact Support"
            onPress={() => router.push("/settings/help")}
          />
          <SettingsRow
            icon={<FileText size={18} color={Colors.silver} />}
            label="Terms of Service"
            onPress={() => router.push("/settings/about")}
          />
          <SettingsRow
            icon={<Lock size={18} color={Colors.silver} />}
            label="Privacy Policy"
            onPress={() => router.push("/settings/about")}
          />
          <SettingsRow
            type="value"
            icon={<Info size={18} color={Colors.silver} />}
            label="App Version"
            value="1.0.0"
            onPress={() => router.push("/settings/about")}
            last
          />
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 4. SIGN OUT                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && styles.signOutPressed,
          ]}
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive" },
            ])
          }
        >
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footerRow}>
          <SummitGlyph size={20} />
          <Text style={styles.versionText}>Everist.ai v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Stat item helper                                                    */
/* ------------------------------------------------------------------ */

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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

  /* -- Profile header -- */
  profileCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarText: {
    color: Colors.gold,
    fontSize: FontSizes.xxl,
    fontWeight: "700",
  },
  profileName: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },
  memberSince: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
  },
  editProfileBtn: {
    marginTop: Spacing.xs,
    minWidth: 140,
  },

  /* -- Health overview -- */
  healthCard: {
    marginBottom: Spacing.md,
  },
  healthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  healthLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  scoreValue: {
    color: Colors.gold,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
  },
  scoreMax: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "500",
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  statItem: {
    width: "50%",
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: 2,
  },
  statValue: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },

  /* -- Connect device button wrapper -- */
  connectDeviceWrap: {
    padding: Spacing.md,
    alignItems: "center",
  },

  /* -- Sign out -- */
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 16,
    marginTop: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutText: {
    color: Colors.danger,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },

  /* -- Footer -- */
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    gap: 8,
  },
  versionText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    opacity: 0.6,
  },
});
