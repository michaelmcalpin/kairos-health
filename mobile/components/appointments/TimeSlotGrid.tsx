/**
 * TimeSlotGrid — grid of available time slots.
 * Available slots are interactive, unavailable are dimmed.
 * Selected slot highlighted with gold.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

const ALL_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];

// Simulate some unavailable slots based on day of week
function getUnavailableSlots(date: Date): Set<string> {
  const day = date.getDay();
  const unavailable = new Set<string>();

  // Different patterns per day for realism
  if (day === 1) {
    unavailable.add("9:00 AM");
    unavailable.add("10:30 AM");
    unavailable.add("2:00 PM");
  } else if (day === 2) {
    unavailable.add("9:30 AM");
    unavailable.add("1:00 PM");
    unavailable.add("3:30 PM");
  } else if (day === 3) {
    unavailable.add("10:00 AM");
    unavailable.add("11:00 AM");
    unavailable.add("2:30 PM");
  } else if (day === 4) {
    unavailable.add("9:00 AM");
    unavailable.add("1:30 PM");
    unavailable.add("4:00 PM");
  } else if (day === 5) {
    unavailable.add("10:30 AM");
    unavailable.add("3:00 PM");
  } else {
    // Weekend — more limited
    unavailable.add("9:00 AM");
    unavailable.add("9:30 AM");
    unavailable.add("1:00 PM");
    unavailable.add("1:30 PM");
    unavailable.add("3:30 PM");
    unavailable.add("4:00 PM");
  }

  return unavailable;
}

interface TimeSlotGridProps {
  selectedDate: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export function TimeSlotGrid({
  selectedDate,
  selectedTime,
  onSelectTime,
}: TimeSlotGridProps) {
  const unavailable = getUnavailableSlots(selectedDate);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Available Times</Text>
      <View style={styles.grid}>
        {ALL_SLOTS.map((slot) => {
          const isUnavailable = unavailable.has(slot);
          const isSelected = selectedTime === slot;

          return (
            <Pressable
              key={slot}
              onPress={() => !isUnavailable && onSelectTime(slot)}
              disabled={isUnavailable}
              style={[
                styles.slot,
                isSelected && styles.slotSelected,
                isUnavailable && styles.slotUnavailable,
              ]}
            >
              <Text
                style={[
                  styles.slotText,
                  isSelected && styles.slotTextSelected,
                  isUnavailable && styles.slotTextUnavailable,
                ]}
              >
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  slotUnavailable: {
    opacity: 0.35,
    backgroundColor: Colors.navyLight,
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
  slotTextUnavailable: {
    color: Colors.silver,
  },
});
