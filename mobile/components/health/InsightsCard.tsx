/**
 * InsightsCard -- AI-generated health insight with gold accent border.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Sparkles } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface InsightsCardProps {
  insight: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function InsightsCard({
  insight,
  actionLabel = "See Full Analysis",
  onAction,
}: InsightsCardProps) {
  return (
    <View style={styles.outerBorder}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBubble}>
            <Sparkles size={14} color={Colors.gold} />
          </View>
          <Text style={styles.headerText}>AI Insight</Text>
        </View>

        <Text style={styles.insightText}>{insight}</Text>

        {actionLabel && (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBorder: {
    borderRadius: Radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    overflow: "hidden",
  },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderLeftWidth: 0,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200, 169, 81, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  insightText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actionButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
});
