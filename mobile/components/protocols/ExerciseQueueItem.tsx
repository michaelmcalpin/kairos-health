/**
 * ExerciseQueueItem — collapsed card for upcoming/completed exercises in the queue.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, ChevronRight } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type ExerciseStatus = "completed" | "current" | "upcoming";

interface ExerciseQueueItemProps {
  name: string;
  sets: number;
  status: ExerciseStatus;
  completedSets?: number;
}

export function ExerciseQueueItem({
  name,
  sets,
  status,
  completedSets = 0,
}: ExerciseQueueItemProps) {
  return (
    <View
      style={[
        styles.container,
        status === "current" && styles.currentContainer,
        status === "completed" && styles.completedContainer,
      ]}
    >
      {/* Status icon */}
      <View
        style={[
          styles.statusIcon,
          status === "completed" && styles.statusCompleted,
          status === "current" && styles.statusCurrent,
          status === "upcoming" && styles.statusUpcoming,
        ]}
      >
        {status === "completed" ? (
          <Check size={14} color={Colors.success} />
        ) : status === "current" ? (
          <ChevronRight size={14} color={Colors.gold} />
        ) : (
          <Text style={styles.statusDot}>{"  "}</Text>
        )}
      </View>

      {/* Exercise info */}
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            status === "completed" && styles.nameCompleted,
            status === "current" && styles.nameCurrent,
          ]}
        >
          {name}
        </Text>
        <Text style={styles.detail}>
          {status === "completed"
            ? `${sets} sets completed`
            : status === "current"
              ? `${completedSets}/${sets} sets`
              : `${sets} sets`}
        </Text>
      </View>

      {/* Status label */}
      {status === "completed" && (
        <View style={styles.checkBadge}>
          <Check size={12} color={Colors.success} />
        </View>
      )}
      {status === "current" && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>IN PROGRESS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  currentContainer: {
    backgroundColor: "rgba(200, 169, 81, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(200, 169, 81, 0.2)",
  },
  completedContainer: {
    opacity: 0.7,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCompleted: {
    backgroundColor: Colors.successMuted,
  },
  statusCurrent: {
    backgroundColor: "rgba(200, 169, 81, 0.2)",
  },
  statusUpcoming: {
    backgroundColor: Colors.navyLight,
  },
  statusDot: {
    fontSize: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  nameCompleted: {
    textDecorationLine: "line-through",
    color: Colors.silver,
  },
  nameCurrent: {
    color: Colors.white,
    fontWeight: "700",
  },
  detail: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.successMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBadge: {
    backgroundColor: "rgba(200, 169, 81, 0.2)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
});
