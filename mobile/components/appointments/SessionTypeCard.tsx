/**
 * SessionTypeCard — selectable card for appointment type with icon,
 * duration, price and description.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface SessionType {
  id: string;
  name: string;
  duration: string;
  price: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

interface SessionTypeCardProps {
  sessionType: SessionType;
  selected: boolean;
  onSelect: () => void;
}

export function SessionTypeCard({
  sessionType,
  selected,
  onSelect,
}: SessionTypeCardProps) {
  const Icon = sessionType.icon;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconCircle,
            selected && styles.iconCircleSelected,
          ]}
        >
          <Icon size={20} color={selected ? Colors.gold : Colors.silver} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{sessionType.name}</Text>
          <Text style={styles.description}>{sessionType.description}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.duration}>{sessionType.duration}</Text>
        <Text style={styles.priceDot}> · </Text>
        <Text style={styles.price}>{sessionType.price}</Text>
      </View>

      {/* Selection check */}
      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedCheck}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.08)",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  iconCircleSelected: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 2,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 56, // align with text (40 icon + 16 margin)
  },
  duration: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontWeight: "500",
  },
  priceDot: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  price: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    fontWeight: "600",
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheck: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark,
  },
});
