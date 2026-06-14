/**
 * FilterTabs — Horizontal scrollable filter tabs for the notification list.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import type { FilterTab } from "./notification-data";
import { FILTER_TABS } from "./notification-data";

interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
}

export function FilterTabs({ activeTab, onTabChange, counts }: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        const count = counts[key];

        return (
          <Pressable
            key={key}
            onPress={() => onTabChange(key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {label}
            </Text>
            {count > 0 && (
              <View
                style={[
                  styles.countBadge,
                  isActive && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive && styles.countTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  tabText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  tabTextActive: {
    color: Colors.dark,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: Radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  countBadgeActive: {
    backgroundColor: "rgba(10, 22, 40, 0.2)",
  },
  countText: {
    color: Colors.silver,
    fontSize: 11,
    fontWeight: "600",
  },
  countTextActive: {
    color: Colors.dark,
  },
});
