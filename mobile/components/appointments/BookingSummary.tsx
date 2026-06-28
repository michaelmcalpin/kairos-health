/**
 * BookingSummary — confirmation card showing all booking details.
 */

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import {
  User,
  Calendar,
  Clock,
  DollarSign,
  Video,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface BookingSummaryProps {
  providerName: string;
  sessionName: string;
  date: string;
  time: string;
  duration: string;
  price: string;
  method: "Video Call" | "In-Person";
  notes: string;
  onNotesChange: (text: string) => void;
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Icon size={16} color={Colors.silver} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

export function BookingSummary({
  providerName,
  sessionName,
  date,
  time,
  duration,
  price,
  method,
  notes,
  onNotesChange,
}: BookingSummaryProps) {
  return (
    <View>
      {/* Summary Card */}
      <Card elevated style={styles.card}>
        <Text style={styles.cardTitle}>Booking Summary</Text>

        <View style={styles.divider} />

        <SummaryRow icon={User} label="Provider" value={providerName} />
        <SummaryRow icon={FileText} label="Session" value={sessionName} />
        <SummaryRow icon={Calendar} label="Date" value={date} />
        <SummaryRow icon={Clock} label="Time" value={`${time} (${duration})`} />
        <SummaryRow
          icon={DollarSign}
          label="Cost"
          value={price}
          valueColor={Colors.gold}
        />
        <SummaryRow
          icon={method === "Video Call" ? Video : MapPin}
          label="Method"
          value={method}
          valueColor={
            method === "Video Call" ? Colors.info : Colors.success
          }
        />
      </Card>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>Notes for Provider (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any relevant details or questions..."
          placeholderTextColor="rgba(148, 163, 184, 0.5)"
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Cancellation policy */}
      <View style={styles.policy}>
        <AlertCircle size={14} color={Colors.silver} />
        <Text style={styles.policyText}>
          Free cancellation up to 24 hours before your appointment.
          Late cancellations may incur a fee.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  rowLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  rowValue: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
    textAlign: "right",
    flexShrink: 0,
    maxWidth: "55%",
  },
  notesSection: {
    marginBottom: Spacing.md,
  },
  notesLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.white,
    fontSize: FontSizes.sm,
    minHeight: 100,
    lineHeight: 22,
  },
  policy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  policyText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    flex: 1,
    lineHeight: 18,
  },
});
