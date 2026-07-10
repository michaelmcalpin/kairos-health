/**
 * Peptide Protocols screen — active cycles, peptide list with dosing details,
 * cycle calendar, dose logging, and effects notes.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const ACTIVE_CYCLE = {
  name: "Healing & Recovery Stack",
  startDate: "May 26, 2026",
  endDate: "Jun 24, 2026",
  currentDay: 18,
  totalDays: 30,
  status: "active" as const,
};

interface Peptide {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  timing: string;
  cycleDay: number;
  cycleDays: number;
  purpose: string;
  color: string;
  todayDosed: boolean;
}

const PEPTIDES: Peptide[] = [
  {
    name: "BPC-157",
    dosage: "250mcg",
    route: "Sublingual",
    frequency: "Daily",
    timing: "AM",
    cycleDay: 18,
    cycleDays: 30,
    purpose: "Tissue repair, gut healing, tendon recovery",
    color: Colors.success,
    todayDosed: true,
  },
  {
    name: "Thymosin Alpha-1",
    dosage: "1.5mg",
    route: "Subcutaneous",
    frequency: "2x/week (Mon, Thu)",
    timing: "AM",
    cycleDay: 18,
    cycleDays: 30,
    purpose: "Immune modulation, T-cell activation",
    color: Colors.info,
    todayDosed: false,
  },
  {
    name: "GHK-Cu",
    dosage: "200mcg",
    route: "Topical",
    frequency: "Daily",
    timing: "PM",
    cycleDay: 18,
    cycleDays: 30,
    purpose: "Skin repair, collagen synthesis, anti-aging",
    color: Colors.gold,
    todayDosed: false,
  },
];

// Cycle calendar: which days have doses for which peptide
interface CalendarDay {
  day: number;
  bpc: boolean;
  ta1: boolean;
  ghk: boolean;
  isPast: boolean;
  isToday: boolean;
}

function generateCalendarDays(currentDay: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let d = 1; d <= 30; d++) {
    const ta1Days = [1, 4, 8, 11, 15, 18, 22, 25, 29]; // Mon/Thu pattern
    days.push({
      day: d,
      bpc: true,
      ta1: ta1Days.includes(d),
      ghk: true,
      isPast: d < currentDay,
      isToday: d === currentDay,
    });
  }
  return days;
}

const CALENDAR_DAYS = generateCalendarDays(ACTIVE_CYCLE.currentDay);

const NOTES = [
  { date: "Jun 12", text: "Noticed improved tendon flexibility in right shoulder after 2 weeks of BPC-157." },
  { date: "Jun 10", text: "Mild redness at TA-1 injection site, resolved within 30 min." },
  { date: "Jun 8", text: "Skin texture around application area visibly smoother with GHK-Cu." },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PeptidesScreen() {
  const [notes, setNotes] = useState("");
  const cycleProgress = ACTIVE_CYCLE.currentDay / ACTIVE_CYCLE.totalDays;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Peptides" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Cycle */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Active Cycle</Text>
            <Badge label="Active" variant="success" />
          </View>

          <Text style={styles.cycleName}>{ACTIVE_CYCLE.name}</Text>
          <Text style={styles.cycleDates}>
            {ACTIVE_CYCLE.startDate} - {ACTIVE_CYCLE.endDate}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${cycleProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            Day {ACTIVE_CYCLE.currentDay} of {ACTIVE_CYCLE.totalDays}
          </Text>
        </Card>

        {/* Peptides List */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Peptides</Text>

          {PEPTIDES.map((peptide, idx) => (
            <View
              key={peptide.name}
              style={[
                styles.peptideRow,
                idx < PEPTIDES.length - 1 && styles.peptideBorder,
              ]}
            >
              <View style={styles.peptideHeader}>
                <View style={styles.peptideNameRow}>
                  <View
                    style={[
                      styles.peptideDot,
                      { backgroundColor: peptide.color },
                    ]}
                  />
                  <Text style={styles.peptideName}>{peptide.name}</Text>
                </View>
                {peptide.todayDosed ? (
                  <Badge label="Dosed" variant="success" />
                ) : (
                  <Badge label="Pending" variant="warning" />
                )}
              </View>

              <View style={styles.peptideDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dosage</Text>
                  <Text style={styles.detailValue}>{peptide.dosage}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Route</Text>
                  <Text style={styles.detailValue}>{peptide.route}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Frequency</Text>
                  <Text style={styles.detailValue}>{peptide.frequency}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timing</Text>
                  <Text style={styles.detailValue}>{peptide.timing}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cycle</Text>
                  <Text style={styles.detailValue}>
                    Day {peptide.cycleDay} of {peptide.cycleDays}
                  </Text>
                </View>
              </View>

              <Text style={styles.peptidePurpose}>{peptide.purpose}</Text>
            </View>
          ))}
        </Card>

        {/* Cycle Calendar */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle Calendar</Text>

          {/* Legend */}
          <View style={styles.calLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.success }]}
              />
              <Text style={styles.legendText}>BPC-157</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.info }]}
              />
              <Text style={styles.legendText}>TA-1</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.gold }]}
              />
              <Text style={styles.legendText}>GHK-Cu</Text>
            </View>
          </View>

          {/* Calendar grid */}
          <View style={styles.calGrid}>
            {CALENDAR_DAYS.map((day) => (
              <View
                key={day.day}
                style={[
                  styles.calDay,
                  day.isToday && styles.calDayToday,
                  day.isPast && styles.calDayPast,
                ]}
              >
                <Text
                  style={[
                    styles.calDayNum,
                    day.isToday && styles.calDayNumToday,
                  ]}
                >
                  {day.day}
                </Text>
                <View style={styles.calDots}>
                  {day.bpc && (
                    <View
                      style={[
                        styles.calDot,
                        { backgroundColor: Colors.success },
                      ]}
                    />
                  )}
                  {day.ta1 && (
                    <View
                      style={[
                        styles.calDot,
                        { backgroundColor: Colors.info },
                      ]}
                    />
                  )}
                  {day.ghk && (
                    <View
                      style={[
                        styles.calDot,
                        { backgroundColor: Colors.gold },
                      ]}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Log Dose */}
        <Button
          title="Log Dose"
          variant="primary"
          size="lg"
          style={styles.logDoseButton}
          onPress={() => {
            const pending = PEPTIDES.filter((p) => !p.todayDosed);
            if (pending.length === 0) {
              Alert.alert("All Dosed", "All peptides have been logged for today.");
            } else {
              Alert.alert(
                "Log Dose",
                `Mark ${pending[0].name} (${pending[0].dosage}) as dosed?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Log Dose", onPress: () => Alert.alert("Logged", `${pending[0].name} dose logged successfully.`) },
                ]
              );
            }
          }}
        />

        {/* Notes / Effects */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes & Effects</Text>

          {/* Existing notes */}
          {NOTES.map((note, idx) => (
            <View
              key={idx}
              style={[
                styles.noteRow,
                idx < NOTES.length - 1 && styles.noteBorder,
              ]}
            >
              <Text style={styles.noteDate}>{note.date}</Text>
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))}

          {/* Add note */}
          <View style={styles.addNote}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note about effects..."
              placeholderTextColor={Colors.silver}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <Button
              title="Save Note"
              variant="secondary"
              size="sm"
              disabled={notes.length === 0}
              onPress={() => {
                Alert.alert("Note Saved", "Your note has been saved successfully.");
                setNotes("");
              }}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  /* Sections */
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Active cycle */
  cycleName: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  cycleDates: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Peptide rows */
  peptideRow: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  peptideBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  peptideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  peptideNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  peptideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  peptideName: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  peptideDetails: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  peptidePurpose: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontStyle: "italic",
  },

  /* Calendar */
  calLegend: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  calDay: {
    width: 40,
    height: 44,
    borderRadius: Radii.sm,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  calDayToday: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  calDayPast: {
    opacity: 0.5,
  },
  calDayNum: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  calDayNumToday: {
    color: Colors.gold,
    fontWeight: "700",
  },
  calDots: {
    flexDirection: "row",
    gap: 2,
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  /* Log dose button */
  logDoseButton: {
    marginTop: Spacing.xs,
  },

  /* Notes */
  noteRow: {
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  noteBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  noteDate: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    fontWeight: "600",
  },
  noteText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    lineHeight: 20,
  },
  addNote: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  noteInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.sm,
    color: Colors.white,
    fontSize: FontSizes.sm,
    minHeight: 60,
    textAlignVertical: "top",
  },
});
