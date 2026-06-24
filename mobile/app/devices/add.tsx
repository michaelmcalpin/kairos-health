/**
 * Add Device (pairing) screen.
 *
 * Shows an animated scanning indicator, handles the pairing flow
 * from scanning -> found -> pairing -> success, and explains
 * required permissions.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bluetooth,
  CheckCircle,
  Info,
  Watch,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScanningIndicator } from "@/components/devices/ScanningIndicator";

/* ------------------------------------------------------------------ */
/* Pairing states                                                      */
/* ------------------------------------------------------------------ */

type PairingState = "scanning" | "found" | "pairing" | "success";

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AddDeviceScreen() {
  const router = useRouter();
  const [state, setState] = useState<PairingState>("scanning");

  /* Checkmark scale animation for success state */
  const checkScale = useRef(new Animated.Value(0)).current;

  /* Simulate device found after 3 seconds */
  useEffect(() => {
    if (state === "scanning") {
      const timer = setTimeout(() => setState("found"), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  /* Animate checkmark on success */
  useEffect(() => {
    if (state === "success") {
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [state, checkScale]);

  const handlePair = () => {
    setState("pairing");
    // Simulate pairing process
    setTimeout(() => setState("success"), 2000);
  };

  const handleDone = () => {
    router.back();
  };

  const handleRetry = () => {
    setState("scanning");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Status area                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.statusArea}>
          {state === "success" ? (
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <View style={styles.successCircle}>
                <CheckCircle size={48} color={Colors.success} />
              </View>
            </Animated.View>
          ) : (
            <ScanningIndicator active={state === "scanning" || state === "pairing"} />
          )}

          <Text style={styles.statusTitle}>
            {state === "scanning" && "Searching for devices..."}
            {state === "found" && "Device Found!"}
            {state === "pairing" && "Pairing..."}
            {state === "success" && "Connected!"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {state === "scanning" &&
              "Make sure your device is nearby and in pairing mode."}
            {state === "found" &&
              "A compatible device was detected. Tap Pair to connect."}
            {state === "pairing" &&
              "Establishing secure connection with your device..."}
            {state === "success" &&
              "Your device is now syncing data to Everist.ai."}
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Device found card                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(state === "found" || state === "pairing") && (
          <Card style={styles.deviceFoundCard}>
            <View style={styles.foundRow}>
              <View style={styles.foundIcon}>
                <Watch size={24} color={Colors.gold} />
              </View>
              <View style={styles.foundInfo}>
                <Text style={styles.foundName}>Apple Watch Ultra</Text>
                <Text style={styles.foundModel}>Series 2, 49mm</Text>
              </View>
              <Bluetooth size={18} color={Colors.info} />
            </View>

            <Button
              title={state === "pairing" ? "Pairing..." : "Pair Device"}
              variant="primary"
              onPress={handlePair}
              loading={state === "pairing"}
              disabled={state === "pairing"}
              style={styles.pairBtn}
            />
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Success actions                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {state === "success" && (
          <View style={styles.successActions}>
            <Button
              title="Done"
              variant="primary"
              size="lg"
              onPress={handleDone}
              style={styles.doneBtn}
            />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Instructions                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {state !== "success" && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Pairing Instructions</Text>

            <InstructionStep
              number="1"
              text="Ensure Bluetooth is enabled on your phone."
            />
            <InstructionStep
              number="2"
              text="Put your device in pairing mode (check device manual)."
            />
            <InstructionStep
              number="3"
              text="Keep the device within 10 feet of your phone."
            />
            <InstructionStep
              number="4"
              text="Tap 'Pair' when the device appears above."
              last
            />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Permissions info                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.permCard}>
          <View style={styles.permRow}>
            <Info size={16} color={Colors.info} />
            <Text style={styles.permText}>
              Everist.ai will request access to Bluetooth and Health data.
              These permissions are required to sync your device data securely.
              You can revoke access at any time in your phone's Settings.
            </Text>
          </View>
        </Card>

        {/* Retry button while scanning */}
        {state === "scanning" && (
          <Button
            title="Cancel"
            variant="tertiary"
            onPress={() => router.back()}
            style={styles.cancelBtn}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* InstructionStep helper                                              */
/* ------------------------------------------------------------------ */

function InstructionStep({
  number,
  text,
  last = false,
}: {
  number: string;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.stepRow, !last && styles.stepBorder]}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
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
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  statusArea: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  statusTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  statusSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.successMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceFoundCard: {
    marginBottom: Spacing.md,
  },
  foundRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  foundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  foundInfo: {
    flex: 1,
  },
  foundName: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  foundModel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  pairBtn: {
    marginTop: Spacing.xs,
  },
  successActions: {
    marginTop: Spacing.md,
  },
  doneBtn: {
    width: "100%",
  },
  instructions: {
    marginBottom: Spacing.md,
  },
  instructionsTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  stepBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  stepText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  permCard: {
    backgroundColor: Colors.infoMuted,
    borderColor: "rgba(74, 144, 217, 0.2)",
    marginBottom: Spacing.md,
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
  cancelBtn: {
    marginTop: Spacing.sm,
  },
});
