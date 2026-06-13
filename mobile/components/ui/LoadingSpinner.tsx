/**
 * LoadingSpinner — gold-accented loading indicator.
 */

import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";

interface LoadingSpinnerProps {
  /** Optional message displayed below the spinner */
  message?: string;
  /** Spinner size */
  size?: "small" | "large";
  /** Fill the entire parent container */
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message,
  size = "large",
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={Colors.gold} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  message: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
