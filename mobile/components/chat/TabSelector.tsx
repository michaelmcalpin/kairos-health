/**
 * TabSelector -- pill-style toggle between "AI Assistant" and "Coach Chat".
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Sparkles, UserCircle } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type ChatTab = "ai" | "coach";

interface TabSelectorProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
}

export function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pillTrack}>
        {/* AI Tab */}
        <Pressable
          style={[
            styles.pill,
            activeTab === "ai" && styles.pillActive,
          ]}
          onPress={() => onTabChange("ai")}
        >
          <Sparkles
            size={16}
            color={activeTab === "ai" ? Colors.dark : Colors.silver}
          />
          <Text
            style={[
              styles.pillText,
              activeTab === "ai" && styles.pillTextActive,
            ]}
          >
            AI Assistant
          </Text>
        </Pressable>

        {/* Coach Tab */}
        <Pressable
          style={[
            styles.pill,
            activeTab === "coach" && styles.pillActiveCoach,
          ]}
          onPress={() => onTabChange("coach")}
        >
          <UserCircle
            size={16}
            color={activeTab === "coach" ? Colors.dark : Colors.silver}
          />
          <Text
            style={[
              styles.pillText,
              activeTab === "coach" && styles.pillTextActive,
            ]}
          >
            Coach Chat
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark,
  },
  pillTrack: {
    flexDirection: "row",
    backgroundColor: Colors.navy,
    borderRadius: Radii.full,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.full,
  },
  pillActive: {
    backgroundColor: Colors.gold,
  },
  pillActiveCoach: {
    backgroundColor: "#10B981",
  },
  pillText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
  },
  pillTextActive: {
    color: Colors.dark,
  },
});
