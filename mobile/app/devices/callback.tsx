/**
 * OAuth Callback Handler screen.
 *
 * This screen handles the deep link redirect after a user completes
 * OAuth authorization in the browser. The backend redirects to
 * everist://devices/callback?provider=oura&status=connected
 *
 * It shows a success/error state and navigates back to devices.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CheckCircle, XCircle } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/api";

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ provider?: string; status?: string; error?: string }>();
  const [stage, setStage] = useState<"loading" | "success" | "error">("loading");

  const provider = params.provider ?? "unknown";
  const status = params.status;
  const errorMsg = params.error;

  // Invalidate the devices query so the list refreshes
  const utils = trpc.useUtils();

  useEffect(() => {
    if (status === "connected") {
      // Refetch device connections so the UI updates
      utils.clientPortal.devices.list.invalidate();
      utils.clientPortal.devices.getConnection.invalidate();
      setStage("success");
    } else if (errorMsg || status === "error") {
      setStage("error");
    } else {
      // Unknown state — treat as success if we got here
      utils.clientPortal.devices.list.invalidate();
      setStage("success");
    }
  }, [status, errorMsg]);

  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, " ");

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {stage === "loading" && (
          <>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.title}>Connecting {providerLabel}...</Text>
          </>
        )}

        {stage === "success" && (
          <>
            <View style={styles.iconWrap}>
              <CheckCircle size={56} color="#22C55E" />
            </View>
            <Text style={styles.title}>{providerLabel} Connected</Text>
            <Text style={styles.subtitle}>
              Your {providerLabel} account is now linked. Health data will sync automatically.
            </Text>
            <Button
              title="Back to Devices"
              variant="primary"
              onPress={() => router.replace("/devices")}
              style={styles.button}
            />
          </>
        )}

        {stage === "error" && (
          <>
            <View style={styles.iconWrap}>
              <XCircle size={56} color="#EF4444" />
            </View>
            <Text style={styles.title}>Connection Failed</Text>
            <Text style={styles.subtitle}>
              {errorMsg
                ? decodeURIComponent(errorMsg)
                : `Could not connect ${providerLabel}. Please try again.`}
            </Text>
            <Button
              title="Try Again"
              variant="primary"
              onPress={() => router.replace("/devices/connect")}
              style={styles.button}
            />
            <Button
              title="Back to Devices"
              variant="secondary"
              onPress={() => router.replace("/devices")}
              style={[styles.button, { marginTop: Spacing.sm }]}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  iconWrap: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  button: {
    width: "100%",
    maxWidth: 280,
  },
});
