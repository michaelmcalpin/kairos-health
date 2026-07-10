/**
 * EmptyState -- placeholder for screens with no data yet.
 * Shows an icon, title, message, and optional action button.
 *
 * Accepts either a React node icon or a string key from the built-in map.
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
  Inbox,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Button } from "./Button";

const iconMap: Record<string, React.ComponentType<any>> = {
  heart: Heart,
  clipboard: ClipboardList,
  message: MessageCircle,
  activity: Activity,
  document: FileText,
  search: Search,
  inbox: Inbox,
};

interface EmptyStateProps {
  /** Pass a React element or a string key ("heart", "clipboard", etc.). */
  icon?: React.ReactNode | string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  let iconElement: React.ReactNode;

  if (typeof icon === "string") {
    const IconComponent = iconMap[icon] ?? Activity;
    iconElement = <IconComponent size={40} color={Colors.gold} strokeWidth={1.5} />;
  } else if (icon) {
    iconElement = icon;
  } else {
    iconElement = <Inbox size={48} color={Colors.silver} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{iconElement}</View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
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
