/**
 * Tab navigator for the Everist.ai mobile app.
 *
 * Five tabs matching the web app's main navigation:
 *   Home (Dashboard) | Health (Biometrics) | Protocols | Chat | Profile
 *
 * Styled with the Summit Glyph dark theme.
 */

import React from "react";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import {
  House,
  Heart,
  ClipboardList,
  MessageCircle,
  User,
} from "lucide-react-native";

import { Colors } from "@/lib/constants";
import { SummitGlyph } from "@/components/brand";

const ICON_SIZE = 24;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        /* ---- Header ---- */
        headerStyle: { backgroundColor: Colors.dark },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        headerShadowVisible: false,

        /* ---- Tab bar ---- */
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.silver,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* -------------------------------------------------- Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: () => <SummitGlyph size={28} showText />,
          tabBarIcon: ({ color, focused }) => (
            <House
              size={ICON_SIZE}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* -------------------------------------------------- Health */}
      <Tabs.Screen
        name="health"
        options={{
          title: "Health",
          headerTitle: "Biometrics",
          tabBarIcon: ({ color, focused }) => (
            <Heart
              size={ICON_SIZE}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* -------------------------------------------------- Protocols */}
      <Tabs.Screen
        name="protocols"
        options={{
          title: "Protocols",
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList
              size={ICON_SIZE}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* -------------------------------------------------- Chat */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerTitle: "AI Health Assistant",
          tabBarIcon: ({ color, focused }) => (
            <MessageCircle
              size={ICON_SIZE}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* -------------------------------------------------- Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <User
              size={ICON_SIZE}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navy,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: Platform.OS === "ios" ? 0 : 8,
  },
  tabBarItem: {
    paddingTop: 4,
  },
});
