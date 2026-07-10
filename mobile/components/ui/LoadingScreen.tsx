/**
 * LoadingScreen -- full-screen loading indicator with optional message.
 * Used as the top-level loading state for screens that are fetching data.
 */

import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Colors, FontSizes, Spacing } from "@/lib/constants";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.gold} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark,
    padding: Spacing.xl,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
  },
});
