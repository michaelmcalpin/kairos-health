/**
 * Notification Center — Main notifications list screen.
 *
 * Features:
 * - Header with unread count badge and "Mark All Read" action
 * - Filter tabs: All, Action Required, Info, Resolved
 * - FlatList of notification cards with priority indicators
 * - Swipe/long-press actions for mark-read and dismiss
 * - Empty state for filtered views with no results
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { FilterTabs } from "@/components/notifications/FilterTabs";
import { EmptyState } from "@/components/notifications/EmptyState";
import {
  SAMPLE_NOTIFICATIONS,
  FILTER_TABS,
  type Notification,
  type FilterTab,
} from "@/components/notifications/notification-data";

export default function NotificationCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] =
    useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // ── Derived ────────────────────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "action_required":
        return notifications.filter(
          (n) => n.priority === "urgent" || n.priority === "action"
        );
      case "info":
        return notifications.filter((n) => n.priority === "info");
      case "resolved":
        return notifications.filter((n) => n.priority === "resolved");
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      action_required: notifications.filter(
        (n) => n.priority === "urgent" || n.priority === "action"
      ).length,
      info: notifications.filter((n) => n.priority === "info").length,
      resolved: notifications.filter((n) => n.priority === "resolved").length,
    };
  }, [notifications]);

  const activeFilterLabel = useMemo(() => {
    return FILTER_TABS.find((t) => t.key === activeTab)?.label ?? "All";
  }, [activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handlePress = useCallback(
    (id: string) => {
      // Mark as read when tapped
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      router.push(`/notifications/${id}`);
    },
    [router]
  );

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ── Render ─────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard
        notification={item}
        onPress={handlePress}
        onMarkRead={handleMarkRead}
        onDismiss={handleDismiss}
      />
    ),
    [handlePress, handleMarkRead, handleDismiss]
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backChevron}>{"‹"}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} hitSlop={8}>
            <Text style={styles.markAllRead}>Mark All Read</Text>
          </Pressable>
        )}
      </View>

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <FilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
      />

      {/* ── Divider ─────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Notification list ───────────────────────────────────── */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          filteredNotifications.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState filterLabel={activeFilterLabel} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  backBtn: {
    marginRight: Spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  backChevron: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 28,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  unreadBadge: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  unreadBadgeText: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: "800",
  },
  markAllRead: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  listContentEmpty: {
    flex: 1,
  },
});
