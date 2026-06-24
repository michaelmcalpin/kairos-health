/**
 * NotificationCard — A single notification row with priority border,
 * icon, title, message preview, timestamp, and unread indicator.
 *
 * Supports swipeable actions for mark-read and dismiss.
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { NotificationIcon } from "./NotificationIcon";
import type { Notification, NotificationPriority } from "./notification-data";

interface NotificationCardProps {
  notification: Notification;
  onPress: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const priorityBorderColors: Record<NotificationPriority, string> = {
  urgent: Colors.danger,
  action: Colors.warning,
  info: Colors.info,
  resolved: Colors.success,
};

const priorityBgColors: Record<NotificationPriority, string> = {
  urgent: "rgba(198, 93, 93, 0.04)",
  action: "rgba(212, 168, 67, 0.04)",
  info: "rgba(74, 144, 217, 0.04)",
  resolved: "rgba(74, 157, 91, 0.04)",
};

export function NotificationCard({
  notification,
  onPress,
  onMarkRead,
  onDismiss,
}: NotificationCardProps) {
  const { id, type, priority, title, message, timeAgo, read } = notification;

  return (
    <Pressable
      onPress={() => onPress(id)}
      onLongPress={() => {
        if (!read && onMarkRead) onMarkRead(id);
        else if (read && onDismiss) onDismiss(id);
      }}
      style={({ pressed }) => [
        styles.container,
        {
          borderLeftColor: priorityBorderColors[priority],
          backgroundColor: pressed
            ? Colors.navyLight
            : read
            ? Colors.navy
            : priorityBgColors[priority],
        },
      ]}
    >
      {/* Priority border + icon */}
      <View style={styles.iconColumn}>
        <NotificationIcon type={type} size={36} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !read && styles.titleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.timestamp}>{timeAgo}</Text>
          {!read && onMarkRead && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onMarkRead(id);
              }}
              hitSlop={8}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Mark read</Text>
            </Pressable>
          )}
          {onDismiss && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onDismiss(id);
              }}
              hitSlop={8}
              style={styles.actionButton}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>{"›"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
  iconColumn: {
    marginTop: 2,
    marginRight: Spacing.sm + 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  title: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
    flex: 1,
  },
  titleUnread: {
    color: Colors.white,
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  message: {
    color: Colors.silver,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timestamp: {
    color: Colors.silver,
    fontSize: 11,
    opacity: 0.7,
  },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  actionButtonText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "600",
  },
  dismissButtonText: {
    color: Colors.silver,
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  chevron: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "300",
    marginLeft: Spacing.xs,
    marginTop: 2,
    opacity: 0.5,
  },
});
