/**
 * TimeSlotGrid — grid of available time slots supplied by the backend
 * (clientPortal.scheduling.getAvailableSlots). Shows a loading spinner
 * while slots are fetched and an honest empty message when the coach
 * has no availability for the selected date.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface TimeSlot {
  /** Raw start time in the coach's local time — "HH:MM" (used for booking). */
  value: string;
  /** Display label, e.g. "9:00 AM" (already converted to client-local time when possible). */
  label: string;
}

interface TimeSlotGridProps {
  slots: TimeSlot[];
  loading?: boolean;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export function TimeSlotGrid({
  slots,
  loading = false,
  selectedTime,
  onSelectTime,
}: TimeSlotGridProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Available Times</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      ) : slots.length === 0 ? (
        <Text style={styles.emptyText}>
          No available times on this date. Try another day.
        </Text>
      ) : (
        <View style={styles.grid}>
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.value;

            return (
              <Pressable
                key={slot.value}
                onPress={() => onSelectTime(slot.value)}
                style={[
                  styles.slot,
                  isSelected && styles.slotSelected,
                ]}
              >
                <Text
                  style={[
                    styles.slotText,
                    isSelected && styles.slotTextSelected,
                  ]}
                >
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  heading: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingWrap: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    paddingVertical: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  slot: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  slotText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
    color: Colors.white,
  },
  slotTextSelected: {
    color: Colors.dark,
    fontWeight: "700",
  },
});
