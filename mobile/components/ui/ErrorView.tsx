/**
 * ErrorView -- displays an error state with an icon, title, message,
 * and an optional retry button. Used inside screens that fail to load.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Colors, FontSizes, Spacing } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AlertTriangle size={32} color={Colors.warning} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.warningMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    minWidth: 140,
  },
});
