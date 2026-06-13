/**
 * EmptyState — placeholder for screens with no data yet.
 * Shows an icon, title, message, and optional action button.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Heart,
  ClipboardList,
  MessageCircle,
  Activity,
  FileText,
  Search,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "./Button";

const iconMap: Record<string, React.ComponentType<any>> = {
  heart: Heart,
  clipboard: ClipboardList,
  message: MessageCircle,
  activity: Activity,
  document: FileText,
  search: Search,
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "activity",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const IconComponent = iconMap[icon] ?? Activity;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconComponent size={40} color={Colors.gold} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && (
        <Button
          title={actionLabel}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});
