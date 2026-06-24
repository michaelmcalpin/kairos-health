/**
 * AddDeviceCard -- shows a supported device platform with a "Connect" button.
 * Used in the "Add Device" grid on the Connected Devices screen.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  Watch,
  Smartphone,
  Activity,
  Heart,
  Moon,
  Bluetooth,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface SupportedDevice {
  id: string;
  name: string;
  iconType: "health" | "fitness" | "garmin" | "fitbit" | "whoop" | "sleep";
  iconColor: string;
}

interface AddDeviceCardProps {
  device: SupportedDevice;
  onConnect?: () => void;
}

const iconMap = {
  health: Heart,
  fitness: Activity,
  garmin: Watch,
  fitbit: Smartphone,
  whoop: Activity,
  sleep: Moon,
};

export function AddDeviceCard({ device, onConnect }: AddDeviceCardProps) {
  const IconComponent = iconMap[device.iconType] ?? Bluetooth;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onConnect}
    >
      <View style={[styles.iconCircle, { backgroundColor: device.iconColor + "20" }]}>
        <IconComponent size={24} color={device.iconColor} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {device.name}
      </Text>
      <View style={styles.connectBtn}>
        <Text style={styles.connectText}>Connect</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  connectBtn: {
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radii.full,
  },
  connectText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
});
