/**
 * KPICard — Top-level metric card used in the horizontally scrollable KPI row.
 *
 * Shows an icon, label, primary value, unit, optional trend indicator, and sparkline.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Sparkline } from "./Sparkline";

export type TrendDirection = "up" | "down" | "flat";

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: TrendDirection;
  trendValue?: string;
  iconBgColor?: string;
  sparkData?: number[];
  sparkColor?: string;
  onPress?: () => void;
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  const color =
    direction === "up"
      ? Colors.success
      : direction === "down"
        ? Colors.danger
        : Colors.silver;
  const symbol = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  return <Text style={[styles.trendArrow, { color }]}>{symbol}</Text>;
}

export function KPICard({
  icon,
  label,
  value,
  unit,
  subtitle,
  trend,
  trendValue,
  iconBgColor = "rgba(200, 169, 81, 0.15)",
  sparkData,
  sparkColor,
  onPress,
}: KPICardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      {/* Header row: icon + sparkline */}
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            color={sparkColor || Colors.gold}
            width={56}
            height={20}
          />
        )}
      </View>

      {/* Label */}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      {/* Value row */}
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        {trend && <TrendArrow direction={trend} />}
      </View>

      {/* Subtitle / trend detail */}
      {(subtitle || trendValue) && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {trendValue ? `${trendValue} ` : ""}
          {subtitle ?? ""}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    width: 155,
    marginRight: Spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "800",
  },
  unit: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  trendArrow: {
    fontSize: FontSizes.sm,
    fontWeight: "700",
    marginLeft: 2,
  },
  subtitle: {
    color: Colors.silver,
    fontSize: 10,
    marginTop: 2,
  },
});
