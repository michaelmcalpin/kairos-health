/**
 * Connect Account screen.
 *
 * Shows available health data integrations the user can connect.
 * Matches Bevel's "Connect Account" pattern: clean list of providers
 * with icons, each tapping through to the provider-specific auth flow.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Watch,
  Smartphone,
  ChevronRight,
  CheckCircle,
  Shield,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";
import { Card } from "@/components/ui/Card";

/* ------------------------------------------------------------------ */
/* Provider definitions                                                */
/* ------------------------------------------------------------------ */

interface Provider {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  connectionType: "oauth" | "native";
}

const PROVIDERS: Provider[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    subtitle: "Sync via HealthKit on this device",
    icon: <Heart size={22} color="#FF375F" fill="#FF375F" />,
    iconBg: "rgba(255, 55, 95, 0.12)",
    connectionType: "native",
  },
  {
    id: "oura",
    name: "Oura",
    subtitle: "Sleep, HRV, readiness, temperature",
    icon: <Moon size={22} color="#A78BFA" />,
    iconBg: "rgba(167, 139, 250, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    subtitle: "Activity, heart rate, sleep, stress",
    icon: <Activity size={22} color="#4A90D9" />,
    iconBg: "rgba(74, 144, 217, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "whoop",
    name: "WHOOP",
    subtitle: "Strain, recovery, sleep cycles",
    icon: <Zap size={22} color="#F97316" />,
    iconBg: "rgba(249, 115, 22, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "dexcom",
    name: "Dexcom",
    subtitle: "Continuous glucose monitoring",
    icon: <Activity size={22} color="#4A9D5B" />,
    iconBg: "rgba(74, 157, 91, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    subtitle: "Activity, sleep, heart rate",
    icon: <Watch size={22} color="#06B6D4" />,
    iconBg: "rgba(6, 182, 212, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "withings",
    name: "Withings",
    subtitle: "Weight, body composition, BP",
    icon: <Smartphone size={22} color="#D4A843" />,
    iconBg: "rgba(212, 168, 67, 0.12)",
    connectionType: "oauth",
  },
  {
    id: "strava",
    name: "Strava",
    subtitle: "Workouts, running, cycling",
    icon: <Activity size={22} color="#FC4C02" />,
    iconBg: "rgba(252, 76, 2, 0.12)",
    connectionType: "oauth",
  },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ConnectAccountScreen() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const connectMutation = trpc.clientPortal.devices.initiateConnect.useMutation();

  const handleConnect = (provider: Provider) => {
    if (connected.has(provider.id)) {
      // Already connected — go to management
      if (provider.id === "apple_health") {
        router.push("/devices/apple-health");
      }
      return;
    }

    if (provider.connectionType === "native") {
      // Apple Health — go to native setup screen
      router.push("/devices/apple-health");
      return;
    }

    // OAuth providers — initiate real connection
    setConnecting(provider.id);
    connectMutation.mutate(
      { provider: provider.id as any },
      {
        onSuccess: () => {
          setConnected((prev) => new Set(prev).add(provider.id));
          setConnecting(null);
          Alert.alert(
            "Connected!",
            `${provider.name} has been connected successfully. Your data will begin syncing shortly.`,
            [{ text: "OK" }],
          );
        },
        onError: () => {
          setConnecting(null);
          Alert.alert(
            "Connection Failed",
            `Could not connect to ${provider.name}. Please try again.`,
            [{ text: "OK" }],
          );
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>Connect Account</Text>
        <Text style={styles.pageSubtitle}>
          Link your health platforms to automatically sync your data with
          Everist.ai.
        </Text>

        {/* Provider list */}
        <View style={styles.providerList}>
          {PROVIDERS.map((provider) => {
            const isConnected = connected.has(provider.id);
            const isConnecting = connecting === provider.id;

            return (
              <Pressable
                key={provider.id}
                style={({ pressed }) => [
                  styles.providerRow,
                  isConnected && styles.providerRowConnected,
                  pressed && styles.providerRowPressed,
                ]}
                onPress={() => handleConnect(provider)}
                disabled={isConnecting}
              >
                <View
                  style={[
                    styles.providerIcon,
                    { backgroundColor: provider.iconBg },
                  ]}
                >
                  {provider.icon}
                </View>

                <View style={styles.providerText}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerSub}>{provider.subtitle}</Text>
                </View>

                {isConnecting ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : isConnected ? (
                  <CheckCircle size={20} color={Colors.success} />
                ) : (
                  <ChevronRight size={20} color={Colors.silver} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Privacy info */}
        <Card style={styles.privacyCard}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyIcon}>
              <Shield size={16} color={Colors.success} />
            </View>
            <Text style={styles.privacyText}>
              Your data is encrypted and only accessible to you and your care
              team. Connections can be removed at any time from Settings.
            </Text>
          </View>
        </Card>
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
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  providerList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerRowConnected: {
    borderColor: "rgba(74, 157, 91, 0.3)",
    backgroundColor: "rgba(74, 157, 91, 0.04)",
  },
  providerRowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  providerSub: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
  },
  privacyCard: {
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  privacyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 157, 91, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    lineHeight: 20,
  },
});
