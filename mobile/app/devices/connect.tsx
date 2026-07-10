/**
 * Connect Account screen.
 *
 * Shows available health data integrations the user can connect.
 * Uses the `DEVICE_PROVIDERS` registry from `lib/device-integrations`
 * and `trpc.clientPortal.devices.initiateConnect` for OAuth-based providers.
 * Apple Health uses native HealthKit permissions via the apple-health screen.
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
  Linking,
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
  Droplets,
  Brain,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import {
  DEVICE_PROVIDERS,
  type DeviceProvider,
} from "@/lib/device-integrations";

/* ------------------------------------------------------------------ */
/* Icon mapping for device providers                                   */
/* ------------------------------------------------------------------ */

/** Map provider icon identifiers to lucide-react-native components. */
const PROVIDER_ICON_MAP: Record<string, { icon: React.ReactNode; bg: string }> = {
  apple_health: {
    icon: <Heart size={22} color="#FF375F" fill="#FF375F" />,
    bg: "rgba(255, 55, 95, 0.12)",
  },
  oura: {
    icon: <Moon size={22} color="#A78BFA" />,
    bg: "rgba(167, 139, 250, 0.12)",
  },
  garmin: {
    icon: <Activity size={22} color="#4A90D9" />,
    bg: "rgba(74, 144, 217, 0.12)",
  },
  whoop: {
    icon: <Zap size={22} color="#F97316" />,
    bg: "rgba(249, 115, 22, 0.12)",
  },
  dexcom: {
    icon: <Droplets size={22} color="#4A9D5B" />,
    bg: "rgba(74, 157, 91, 0.12)",
  },
  fitbit: {
    icon: <Watch size={22} color="#06B6D4" />,
    bg: "rgba(6, 182, 212, 0.12)",
  },
  withings: {
    icon: <Smartphone size={22} color="#D4A843" />,
    bg: "rgba(212, 168, 67, 0.12)",
  },
  hume: {
    icon: <Brain size={22} color="#8B5CF6" />,
    bg: "rgba(139, 92, 246, 0.12)",
  },
};

const DEFAULT_ICON = {
  icon: <Activity size={22} color={Colors.silver} />,
  bg: "rgba(192, 197, 206, 0.12)",
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ConnectAccountScreen() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const connectMutation = trpc.clientPortal.devices.initiateConnect.useMutation();

  // Filter to only supported providers, and exclude providers that
  // cannot be connected via the backend (e.g. hume is external)
  const providers = DEVICE_PROVIDERS.filter(
    (p) => p.supported && p.connectionType !== "external",
  );

  const handleConnect = async (providerId: DeviceProvider, providerName: string, connectionType: string) => {
    if (connected.has(providerId)) {
      // Already connected — go to management screen if applicable
      if (providerId === "apple_health") {
        router.push("/devices/apple-health");
      }
      return;
    }

    if (connectionType === "native") {
      // Apple Health — go to native HealthKit setup screen
      router.push("/devices/apple-health");
      return;
    }

    if (connectionType === "oauth") {
      // OAuth providers — call backend to get authorization URL
      setConnecting(providerId);
      try {
        connectMutation.mutate(
          { provider: providerId as any },
          {
            onSuccess: async (data: any) => {
              const authUrl = data?.authUrl || data?.url;
              if (authUrl) {
                try {
                  await Linking.openURL(authUrl);
                } catch {
                  Alert.alert(
                    "Connection",
                    `Please visit this URL to connect ${providerName}: ${authUrl}`,
                  );
                }
              }
              setConnected((prev) => new Set(prev).add(providerId));
              setConnecting(null);
            },
            onError: (error: any) => {
              setConnecting(null);
              Alert.alert(
                "Connection Failed",
                error.message || `Could not connect to ${providerName}. Please try again.`,
                [{ text: "OK" }],
              );
            },
          },
        );
      } catch {
        setConnecting(null);
        Alert.alert(
          "Connection Failed",
          `Could not connect to ${providerName}. Please try again.`,
          [{ text: "OK" }],
        );
      }
      return;
    }

    // External providers (e.g., Hume AI) — should not appear in the
    // filtered list, but handle gracefully just in case
    Alert.alert(
      "External Integration",
      `${providerName} integration requires setup through the Everist dashboard. Contact your coach for access.`,
      [{ text: "OK" }],
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

        {/* Provider list — driven by DEVICE_PROVIDERS registry */}
        <View style={styles.providerList}>
          {providers.map((provider) => {
            const isConnected = connected.has(provider.id);
            const isConnecting = connecting === provider.id;
            const iconInfo = PROVIDER_ICON_MAP[provider.id] ?? DEFAULT_ICON;

            return (
              <Pressable
                key={provider.id}
                style={({ pressed }) => [
                  styles.providerRow,
                  isConnected && styles.providerRowConnected,
                  pressed && styles.providerRowPressed,
                ]}
                onPress={() =>
                  handleConnect(provider.id, provider.name, provider.connectionType)
                }
                disabled={isConnecting}
              >
                <View
                  style={[
                    styles.providerIcon,
                    { backgroundColor: iconInfo.bg },
                  ]}
                >
                  {iconInfo.icon}
                </View>

                <View style={styles.providerText}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerSub}>{provider.description}</Text>
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
