/**
 * MilestoneItem -- checkpoint row for goal milestones.
 * Shows a status icon (completed, upcoming, locked) with label and date.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, Clock, Lock } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export type MilestoneStatus = "completed" | "upcoming" | "locked";

interface MilestoneItemProps {
  label: string;
  status: MilestoneStatus;
  date?: string;
  /** Show connector line to next item */
  showConnector?: boolean;
}

const statusConfig: Record<
  MilestoneStatus,
  { bg: string; iconColor: string; textColor: string }
> = {
  completed: {
    bg: Colors.successMuted,
    iconColor: Colors.success,
    textColor: Colors.white,
  },
  upcoming: {
    bg: Colors.warningMuted,
    iconColor: Colors.warning,
    textColor: Colors.silverLight,
  },
  locked: {
    bg: Colors.navyLight,
    iconColor: Colors.silver,
    textColor: Colors.silver,
  },
};

function StatusIcon({ status }: { status: MilestoneStatus }) {
  const size = 16;
  switch (status) {
    case "completed":
      return <Check size={size} color={statusConfig.completed.iconColor} />;
    case "upcoming":
      return <Clock size={size} color={statusConfig.upcoming.iconColor} />;
    case "locked":
      return <Lock size={size} color={statusConfig.locked.iconColor} />;
  }
}

export function MilestoneItem({
  label,
  status,
  date,
  showConnector = false,
}: MilestoneItemProps) {
  const config = statusConfig[status];

  return (
    <View style={styles.row}>
      {/* Icon column */}
      <View style={styles.iconColumn}>
        <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
          <StatusIcon status={status} />
        </View>
        {showConnector && <View style={styles.connector} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.label, { color: config.textColor }]}>
          {label}
        </Text>
        {date && <Text style={styles.date}>{date}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconColumn: {
    alignItems: "center",
    width: 36,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.sm,
    paddingTop: 6,
    paddingBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  date: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
    marginTop: 2,
  },
});
