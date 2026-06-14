/**
 * Notification Detail Screen — Full view of a single notification.
 *
 * Displays:
 * - Full notification content with priority and type badges
 * - Related data card (e.g., glucose reading, lab count)
 * - Action buttons based on notification type
 * - Dismiss button
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import {
  SAMPLE_NOTIFICATIONS,
  type NotificationPriority,
} from "@/components/notifications/notification-data";
import type { StatusVariant } from "@/lib/types";

const priorityLabels: Record<NotificationPriority, string> = {
  urgent: "Urgent",
  action: "Action Required",
  info: "Informational",
  resolved: "Resolved",
};

const priorityVariants: Record<NotificationPriority, StatusVariant> = {
  urgent: "danger",
  action: "warning",
  info: "info",
  resolved: "success",
};

const priorityBorderColors: Record<NotificationPriority, string> = {
  urgent: Colors.danger,
  action: Colors.warning,
  info: Colors.info,
  resolved: Colors.success,
};

const typeLabels: Record<string, string> = {
  glucose: "Glucose",
  sleep: "Sleep",
  labs: "Lab Results",
  coach: "Coach",
  appointment: "Appointment",
  protocol: "Protocol",
  heart: "Cardiovascular",
  supplement: "Supplements",
  exercise: "Exercise",
  report: "Report",
  biome: "Gut Biome",
  scan: "Body Scan",
  goal: "Goal",
  medication: "Medication",
};

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const notification = useMemo(
    () => SAMPLE_NOTIFICATIONS.find((n) => n.id === id),
    [id]
  );

  if (!notification || dismissed) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{"\u{1F50D}"}</Text>
          <Text style={styles.emptyTitle}>Notification not found</Text>
          <Text style={styles.emptyMessage}>
            This notification may have been dismissed or is no longer available.
          </Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const {
    type,
    priority,
    title,
    detail,
    timeAgo,
    timestamp,
    relatedData,
    actionLabel,
  } = notification;

  const handleAction = () => {
    // In a real app, this would navigate to the appropriate screen
    Alert.alert(
      actionLabel ?? "Action",
      `Navigating to ${actionLabel ?? "related screen"}...`
    );
  };

  const handleDismiss = () => {
    setDismissed(true);
    router.back();
  };

  const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Priority bar ─────────────────────────────────────────── */}
      <View
        style={[
          styles.priorityBar,
          { backgroundColor: priorityBorderColors[priority] },
        ]}
      />

      {/* ── Icon and badges ──────────────────────────────────────── */}
      <View style={styles.headerSection}>
        <NotificationIcon type={type} size={48} />
        <View style={styles.badgeRow}>
          <Badge
            label={priorityLabels[priority]}
            variant={priorityVariants[priority]}
          />
          <Badge label={typeLabels[type] ?? type} variant="default" />
        </View>
      </View>

      {/* ── Title ────────────────────────────────────────────────── */}
      <Text style={styles.title}>{title}</Text>

      {/* ── Timestamp ────────────────────────────────────────────── */}
      <View style={styles.timestampRow}>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
        <Text style={styles.timestampDot}>{"\u{2022}"}</Text>
        <Text style={styles.timestampFull}>{formattedDate}</Text>
      </View>

      {/* ── Detail ───────────────────────────────────────────────── */}
      <Card style={styles.detailCard}>
        <Text style={styles.detailText}>{detail}</Text>
      </Card>

      {/* ── Related data card ────────────────────────────────────── */}
      {relatedData && (
        <Card elevated style={styles.relatedCard}>
          <Text style={styles.relatedLabel}>{relatedData.label}</Text>
          <View style={styles.relatedValueRow}>
            <Text style={styles.relatedValue}>{relatedData.value}</Text>
            {relatedData.unit && (
              <Text style={styles.relatedUnit}>{relatedData.unit}</Text>
            )}
          </View>
          {relatedData.context && (
            <Text style={styles.relatedContext}>{relatedData.context}</Text>
          )}
        </Card>
      )}

      {/* ── Action buttons ───────────────────────────────────────── */}
      <View style={styles.actions}>
        {actionLabel && (
          <Button
            title={actionLabel}
            variant="primary"
            onPress={handleAction}
            style={styles.actionBtn}
          />
        )}
        <Button
          title="Dismiss"
          variant="tertiary"
          onPress={handleDismiss}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl * 2,
  },
  priorityBar: {
    height: 3,
    width: "100%",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    lineHeight: 28,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  timeAgo: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  timestampDot: {
    color: Colors.silver,
    fontSize: 8,
    opacity: 0.5,
  },
  timestampFull: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    opacity: 0.7,
    flex: 1,
  },
  detailCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 22,
  },
  relatedCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  relatedLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  relatedValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  relatedValue: {
    color: Colors.white,
    fontSize: FontSizes.title,
    fontWeight: "800",
  },
  relatedUnit: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  relatedContext: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    opacity: 0.7,
    textAlign: "center",
  },
  actions: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
});
