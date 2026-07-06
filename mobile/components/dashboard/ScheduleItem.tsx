/**
 * ScheduleItem — Single row for Today's Schedule section.
 *
 * Displays a colored left border, time, appointment type, and coach name.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type AppointmentType =
  | "consultation"
  | "workout"
  | "lab_review"
  | "nutrition"
  | "check_in";

interface ScheduleItemProps {
  time: string;
  title: string;
  type: AppointmentType;
  coachName?: string;
  duration?: string;
}

const typeStyles: Record<
  AppointmentType,
  { borderColor: string; label: string }
> = {
  consultation: { borderColor: Colors.gold, label: "Consultation" },
  workout: { borderColor: Colors.success, label: "Workout" },
  lab_review: { borderColor: Colors.info, label: "Lab Review" },
  nutrition: { borderColor: "#F97316", label: "Nutrition" },
  check_in: { borderColor: "#A78BFA", label: "Check-in" },
};

export function ScheduleItem({
  time,
  title,
  type,
  coachName,
  duration,
}: ScheduleItemProps) {
  const typeStyle = typeStyles[type];

  return (
    <View
      style={[
        styles.container,
        { borderLeftColor: typeStyle.borderColor },
      ]}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{time}</Text>
        {duration && <Text style={styles.duration}>{duration}</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[styles.typeBadge, { color: typeStyle.borderColor }]}
          >
            {typeStyle.label}
          </Text>
          {coachName && (
            <Text style={styles.coach}>with {coachName}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  timeContainer: {
    width: 56,
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  time: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  duration: {
    color: Colors.silver,
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coach: {
    color: Colors.silver,
    fontSize: 11,
  },
});
