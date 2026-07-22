/**
 * Add Device screen.
 *
 * Direct Bluetooth pairing is not implemented yet, so this screen says
 * so honestly (no simulated scanning / fake devices) and points users
 * to the integrations that actually work today: linked accounts
 * (/devices/connect) and Apple Health sync (/devices/apple-health).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bluetooth, Cloud, Heart, Info } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AddDeviceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* ─── Coming soon header ─────────────────────────────── */}
        <View style={styles.statusArea}>
          <View style={styles.iconCircle}>
            <Bluetooth size={40} color={Colors.gold} strokeWidth={1.5} />
          </View>
          <Text style={styles.statusTitle}>Bluetooth pairing coming soon</Text>
          <Text style={styles.statusSubtitle}>
            Direct Bluetooth device pairing isn't available in the app yet.
            In the meantime, you can sync your health data through a linked
            account or Apple Health.
          </Text>
        </View>

        {/* ─── Available options ──────────────────────────────── */}
        <Card style={styles.optionCard}>
          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Cloud size={22} color={Colors.gold} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Connect an Account</Text>
              <Text style={styles.optionText}>
                Link Oura, Hume, and other supported services to sync data
                automatically.
              </Text>
            </View>
          </View>
          <Button
            title="Connect an Account"
            variant="primary"
            onPress={() => router.push("/devices/connect" as any)}
            style={styles.optionBtn}
          />
        </Card>

        <Card style={styles.optionCard}>
          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Heart size={22} color={Colors.gold} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Apple Health</Text>
              <Text style={styles.optionText}>
                Sync steps, sleep, heart rate, and workouts from Apple Health
                — including data from paired watches and devices.
              </Text>
            </View>
          </View>
          <Button
            title="Set Up Apple Health"
            variant="secondary"
            onPress={() => router.push("/devices/apple-health" as any)}
            style={styles.optionBtn}
          />
        </Card>

        {/* ─── Info note ──────────────────────────────────────── */}
        <Card style={styles.permCard}>
          <View style={styles.permRow}>
            <Info size={16} color={Colors.info} />
            <Text style={styles.permText}>
              Most wearables (Apple Watch, Oura Ring, Withings devices) already
              sync through Apple Health or their linked accounts — no direct
              Bluetooth pairing needed.
            </Text>
          </View>
        </Card>
      </View>
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
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  statusArea: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  statusTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  statusSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  optionCard: {
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  optionBtn: {
    marginTop: Spacing.xs,
  },
  permCard: {
    backgroundColor: Colors.infoMuted,
    borderColor: "rgba(74, 144, 217, 0.2)",
  },
  permRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  permText: {
    flex: 1,
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
});
