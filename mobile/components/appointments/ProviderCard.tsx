/**
 * ProviderCard — selectable card showing provider info with avatar initials.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Star, Clock } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  nextAvailable: string;
  initials: string;
  avatarColor: string;
}

interface ProviderCardProps {
  provider: Provider;
  selected: boolean;
  onSelect: () => void;
}

export function ProviderCard({
  provider,
  selected,
  onSelect,
}: ProviderCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Avatar */}
      <View
        style={[styles.avatar, { backgroundColor: provider.avatarColor }]}
      >
        <Text style={styles.avatarText}>{provider.initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{provider.name}</Text>
        <Text style={styles.specialty}>{provider.specialty}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Star size={12} color={Colors.gold} />
            <Text style={styles.rating}>{provider.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={12} color={Colors.silver} />
            <Text style={styles.nextAvailable}>{provider.nextAvailable}</Text>
          </View>
        </View>
      </View>

      {/* Selection indicator */}
      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      >
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(200, 169, 81, 0.08)",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
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
  specialty: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.gold,
  },
  nextAvailable: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  radioSelected: {
    borderColor: Colors.gold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
  },
});
