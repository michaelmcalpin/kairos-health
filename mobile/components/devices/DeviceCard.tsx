/**
 * DeviceCard -- displays a connected device with status, sync info,
 * and action buttons. Used on the Connected Devices screen.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  Watch,
  Smartphone,
  Activity,
  Heart,
  Droplets,
  Scale,
  Bluetooth,
  RefreshCw,
  X,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { StatusVariant } from "@/lib/types";

export interface ConnectedDevice {
  id: string;
  name: string;
  model: string;
  status: "connected" | "disconnected" | "syncing";
  syncMode: string;
  lastSync: string;
  dataTypes: string[];
  iconType: "watch" | "ring" | "cgm" | "scale" | "bp" | "phone";
  iconColor: string;
}

interface DeviceCardProps {
  device: ConnectedDevice;
  onSync?: () => void;
  onDisconnect?: () => void;
}

const iconMap = {
  watch: Watch,
  ring: Activity,
  cgm: Droplets,
  scale: Scale,
  bp: Heart,
  phone: Smartphone,
};

const statusBadgeMap: Record<
  ConnectedDevice["status"],
  { label: string; variant: StatusVariant }
> = {
  connected: { label: "Connected", variant: "success" },
  disconnected: { label: "Disconnected", variant: "danger" },
  syncing: { label: "Syncing", variant: "info" },
};

export function DeviceCard({ device, onSync, onDisconnect }: DeviceCardProps) {
  const IconComponent = iconMap[device.iconType] ?? Bluetooth;
  const badge = statusBadgeMap[device.status];

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        {/* Device icon */}
        <View style={[styles.iconCircle, { backgroundColor: device.iconColor + "20" }]}>
          <IconComponent size={22} color={device.iconColor} />
        </View>

        {/* Name + model */}
        <View style={styles.info}>
          <Text style={styles.name}>{device.name}</Text>
          <Text style={styles.model}>{device.model}</Text>
        </View>

        {/* Status badge */}
        <Badge label={badge.label} variant={badge.variant} />
      </View>

      {/* Sync info */}
      <View style={styles.syncRow}>
        <Text style={styles.syncLabel}>
          {device.syncMode} &middot; Last sync: {device.lastSync}
        </Text>
      </View>

      {/* Data types */}
      <View style={styles.dataTypesRow}>
        {device.dataTypes.map((dt) => (
          <View key={dt} style={styles.dataChip}>
            <Text style={styles.dataChipText}>{dt}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.syncBtn, pressed && styles.pressed]}
          onPress={onSync}
        >
          <RefreshCw size={14} color={Colors.gold} />
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.disconnectBtn, pressed && styles.pressed]}
          onPress={onDisconnect}
        >
          <X size={14} color={Colors.danger} />
          <Text style={styles.disconnectBtnText}>Disconnect</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  model: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  syncRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  syncLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  dataTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    gap: 6,
  },
  dataChip: {
    backgroundColor: Colors.navyLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  dataChipText: {
    color: Colors.silverLight,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
  },
  syncBtn: {
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  syncBtnText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  disconnectBtn: {
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  disconnectBtnText: {
    color: Colors.danger,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
