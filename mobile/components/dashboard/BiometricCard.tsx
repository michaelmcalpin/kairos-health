/**
 * BiometricCard — Compact biometric reading tile for the 2x3 grid.
 *
 * Shows an icon, label, current value, unit, status badge, and a mini sparkline.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Sparkline } from "./Sparkline";

type BiometricStatus = "optimal" | "normal" | "elevated" | "high" | "low";

interface BiometricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: BiometricStatus;
  sparkData?: number[];
  sparkColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
}

const statusStyles: Record<BiometricStatus, { bg: string; text: string; label: string }> = {
  optimal: { bg: Colors.successMuted, text: Colors.success, label: "Optimal" },
  normal: { bg: Colors.successMuted, text: Colors.success, label: "Normal" },
  elevated: { bg: Colors.warningMuted, text: Colors.warning, label: "Elevated" },
  high: { bg: Colors.dangerMuted, text: Colors.danger, label: "High" },
  low: { bg: Colors.infoMuted, text: Colors.info, label: "Low" },
};

export function BiometricCard({
  icon,
  label,
  value,
  unit,
  status,
  sparkData,
  sparkColor,
  iconBgColor = "rgba(200, 169, 81, 0.15)",
  onPress,
}: BiometricCardProps) {
  const statusStyle = status ? statusStyles[status] : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            color={sparkColor || Colors.gold}
            width={48}
            height={18}
          />
        )}
      </View>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {statusStyle.label}
          </Text>
        </View>
      )}
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
    padding: Spacing.sm + 2,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  value: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "800",
  },
  unit: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginTop: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
