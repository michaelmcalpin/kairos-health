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
  Users,
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
  Database,
  Cloud,
  Camera,
  CreditCard,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii, APP_VERSION } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS, SAMPLE_DATA } from "@/lib/api";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SummitGlyph } from "@/components/brand";
import { useConnectedDevices } from "@/hooks/useDevices";

/* ------------------------------------------------------------------ */
/* Fallback sample data                                                */
/* ------------------------------------------------------------------ */

const FALLBACK_USER = SAMPLE_DATA.userProfile;

/* FALLBACK_DEVICES removed — devices now come from useConnectedDevices hook */

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user: authUser } = useUser();

  /* -- tRPC query for profile data -- */
  const profileQuery = trpc.clientPortal.settings.getSettings.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- latest weight + computed health score (real data) -- */
  const latestMeasurementQuery = trpc.clientPortal.measurements.latest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const healthScoreQuery = trpc.clientPortal.dashboard.getHealthScore.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- Map API response → local shape -- */
  /* getSettings returns a NESTED shape: { user, clientProfile, contactInfo, ... } */
  const profileData = profileQuery.data as any;
  const apiUser = profileData?.user;
  const apiProfile = profileData?.clientProfile;

  // Derived display values
  const computeAge = (dob?: string | null): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };
  const formatHeight = (inches?: number | null): string | null => {
    if (!inches || inches <= 0) return null;
    return `${Math.floor(inches / 12)}'${Math.round(inches % 12)}"`;
  };
  const formatMemberSince = (createdAt?: string | Date | null): string | null => {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString([], { month: "long", year: "numeric" });
  };

  // Prefer API data → Clerk auth data → generic placeholders (never "Demo User")
  const firstName = apiUser?.firstName ?? authUser?.firstName ?? "";
  const lastName = apiUser?.lastName ?? authUser?.lastName ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const USER = {
    initials:
      ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?",
    name: fullName || "Set up your profile",
    email:
      apiUser?.email ??
      authUser?.emailAddresses?.[0]?.emailAddress ??
      "",
    memberSince: formatMemberSince(apiUser?.createdAt) ?? "—",
    age: computeAge(apiProfile?.dateOfBirth) ?? "—",
    height: formatHeight(apiProfile?.heightInches) ?? "—",
    weight: (latestMeasurementQuery.data as any)?.weightLbs
      ? `${(latestMeasurementQuery.data as any).weightLbs} lbs`
      : "—",
    bloodType: apiProfile?.bloodType ?? "—",
    healthScore: (healthScoreQuery.data as any)?.score ?? "—",
    tier: apiProfile?.tier ?? FALLBACK_USER.tier,
  };

  /* -- Connected devices from hook -- */
  const { devices: connectedDevices } = useConnectedDevices();

  /* -- pull to refresh -- */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await profileQuery.refetch();
    setRefreshing(false);
  }, [profileQuery]);

  /* -- tRPC mutation for persisting toggle changes -- */
  const toggleMutation = trpc.clientPortal.settings.updateFeatureToggle.useMutation();

  /* -- Derive initial toggle values from profile data -- */
  const toggles = profileData?.toggles as Record<string, boolean> | undefined;

  /* -- notification toggles -- */
  const [pushNotifs, setPushNotifs] = useState(toggles?.push_notifications ?? true);
  const [emailNotifs, setEmailNotifs] = useState(toggles?.email_notifications ?? true);
  const [appointmentReminders, setAppointmentReminders] = useState(toggles?.appointment_reminders ?? true);
  const [labAlerts, setLabAlerts] = useState(toggles?.lab_alerts ?? true);
  const [protocolReminders, setProtocolReminders] = useState(toggles?.protocol_reminders ?? false);

  /* -- health preferences -- */
  const [useMetric, setUseMetric] = useState(toggles?.metric_units ?? false);

  /* -- privacy & security -- */
  const [biometricLogin, setBiometricLogin] = useState(toggles?.biometric_login ?? true);
  const [dataSharing, setDataSharing] = useState(toggles?.data_sharing ?? false);

  /* -- Wrap toggle setters to also persist via mutation -- */
  const handleToggle = (key: string, setter: (v: boolean) => void) => (value: boolean) => {
    setter(value);
    toggleMutation.mutate({ key, value });
  };

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
            onValueChange={handleToggle("push_notifications", setPushNotifs)}
          />
          <SettingsRow
            type="toggle"
            icon={<Mail size={18} color={Colors.silver} />}
            label="Email Notifications"
            value={emailNotifs}
            onValueChange={handleToggle("email_notifications", setEmailNotifs)}
          />
          <SettingsRow
            type="toggle"
            icon={<Activity size={18} color={Colors.silver} />}
            label="Appointment Reminders"
            value={appointmentReminders}
            onValueChange={handleToggle("appointment_reminders", setAppointmentReminders)}
          />
          <SettingsRow
            type="toggle"
            icon={<Heart size={18} color={Colors.silver} />}
            label="Lab Results Alerts"
            value={labAlerts}
            onValueChange={handleToggle("lab_alerts", setLabAlerts)}
          />
          <SettingsRow
            type="toggle"
            icon={<FileText size={18} color={Colors.silver} />}
            label="Protocol Reminders"
            value={protocolReminders}
            onValueChange={handleToggle("protocol_reminders", setProtocolReminders)}
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
          {connectedDevices.length === 0 ? (
            <SettingsRow
              icon={<Watch size={18} color={Colors.silver} />}
              label="No devices connected"
              subtitle="Connect a device to sync your health data"
              onPress={() => router.push("/devices" as any)}
              last
            />
          ) : (
            connectedDevices.map((d, i) => (
              <SettingsRow
                key={d.id}
                type="badge"
                icon={
                  d.type === "wearable" ? (
                    <Watch size={18} color={Colors.silver} />
                  ) : d.type === "ring" ? (
                    <Activity size={18} color={Colors.silver} />
                  ) : (
                    <Heart size={18} color={Colors.silver} />
                  )
                }
                label={d.name}
                badgeLabel={d.syncStatus === "synced" ? "Connected" : d.syncStatus === "error" ? "Error" : "Syncing"}
                badgeColor={d.syncStatus === "synced" ? Colors.success : d.syncStatus === "error" ? Colors.danger : Colors.warning}
                onPress={() => router.push("/devices" as any)}
                last={i === connectedDevices.length - 1}
              />
            ))
          )}
          <View style={styles.connectDeviceWrap}>
            <Button
              title="Connect Device"
              variant="secondary"
              size="sm"
              icon={<Plus size={16} color={Colors.gold} />}
              onPress={() => router.push("/devices" as any)}
            />
          </View>
        </SettingsSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3b-ii. DATA SOURCES                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Data"
          icon={<Database size={16} color={Colors.gold} />}
        >
          <SettingsRow
            icon={<Database size={18} color={Colors.silver} />}
            label="Data Sources"
            subtitle="Manage integrations & health data"
            onPress={() => router.push("/settings/data-sources" as any)}
          />
          <SettingsRow
            icon={<Cloud size={18} color={Colors.silver} />}
            label="Sync Settings"
            subtitle="Frequency, historical data"
            onPress={() => router.push("/devices/apple-health")}
          />
          <SettingsRow
            icon={<Camera size={18} color={Colors.silver} />}
            label="Progress Photos"
            subtitle="Track your transformation"
            onPress={() => router.push("/progress-photos" as any)}
          />
          <SettingsRow
            icon={<Plus size={18} color={Colors.gold} />}
            label="Connect New Account"
            onPress={() => router.push("/devices/connect" as any)}
            last
          />
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
            onValueChange={handleToggle("metric_units", setUseMetric)}
          />
          <SettingsRow
            type="value"
            icon={<Globe size={18} color={Colors.silver} />}
            label="Timezone"
            value={(profileData as any)?.timezone ?? "Not set"}
            onPress={noop}
          />
          <SettingsRow
            type="value"
            icon={<Stethoscope size={18} color={Colors.silver} />}
            label="Primary Doctor"
            value={(profileData as any)?.primaryDoctor ?? "Not assigned"}
            onPress={noop}
          />
          <SettingsRow
            type="value"
            icon={<Dumbbell size={18} color={Colors.silver} />}
            label="Your Coach"
            value={(profileData as any)?.coachName ?? "Not assigned"}
            onPress={() => router.push("/coach")}
          />
          <SettingsRow
            icon={<Users size={18} color={Colors.silver} />}
            label="Care Team"
            subtitle="Manage coach access to your data"
            onPress={() => router.push("/settings/care-team" as any)}
          />
          <SettingsRow
            type="value"
            icon={<Phone size={18} color={Colors.silver} />}
            label="Emergency Contact"
            value={(profileData as any)?.emergencyContact ?? "Not set"}
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
            onValueChange={handleToggle("biometric_login", setBiometricLogin)}
          />
          <SettingsRow
            type="toggle"
            icon={<Eye size={18} color={Colors.silver} />}
            label="Data Sharing"
            subtitle="Anonymized data for research"
            value={dataSharing}
            onValueChange={handleToggle("data_sharing", setDataSharing)}
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
        {/* 3d-ii. BILLING & SUBSCRIPTION                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title="Billing"
          icon={<CreditCard size={16} color={Colors.gold} />}
        >
          <SettingsRow
            icon={<CreditCard size={18} color={Colors.silver} />}
            label="Billing & Subscription"
            subtitle="Plan details, payment history"
            onPress={() => router.push("/payments" as any)}
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
              { text: "Sign Out", style: "destructive", onPress: async () => {
                try {
                  await signOut();
                } catch (e) {
                  console.error("Sign out error:", e);
                }
              }},
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
