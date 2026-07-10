/**
 * Fasting Tracker screen — current fast status, countdown timer, fasting zones,
 * weekly log, and history stats.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
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

const CURRENT_FAST = {
  protocol: "Intermittent Fast 16:8",
  active: true,
  startTime: "8:00 PM",
  elapsed: { hours: 14, minutes: 32 },
  goal: 16, // hours
  remaining: { hours: 1, minutes: 28 },
};

interface FastingZone {
  name: string;
  startHour: number;
  color: string;
}

const FASTING_ZONES: FastingZone[] = [
  { name: "Fed", startHour: 0, color: Colors.silver },
  { name: "Early Fast", startHour: 4, color: Colors.info },
  { name: "Fat Burning", startHour: 8, color: Colors.warning },
  { name: "Ketosis", startHour: 12, color: Colors.gold },
  { name: "Deep Ketosis", startHour: 18, color: Colors.success },
];

function getCurrentZoneIndex(elapsedHours: number): number {
  let idx = 0;
  for (let i = FASTING_ZONES.length - 1; i >= 0; i--) {
    if (elapsedHours >= FASTING_ZONES[i].startHour) {
      idx = i;
      break;
    }
  }
  return idx;
}

interface WeeklyLogEntry {
  day: string;
  date: string;
  duration: string;
  goal: number;
  actual: number;
  completed: boolean;
}

const WEEKLY_LOG: WeeklyLogEntry[] = [
  { day: "Mon", date: "Jun 7", duration: "16h 12m", goal: 16, actual: 16.2, completed: true },
  { day: "Tue", date: "Jun 8", duration: "16h 45m", goal: 16, actual: 16.75, completed: true },
  { day: "Wed", date: "Jun 9", duration: "18h 03m", goal: 16, actual: 18.05, completed: true },
  { day: "Thu", date: "Jun 10", duration: "15h 20m", goal: 16, actual: 15.33, completed: false },
  { day: "Fri", date: "Jun 11", duration: "16h 08m", goal: 16, actual: 16.13, completed: true },
  { day: "Sat", date: "Jun 12", duration: "17h 30m", goal: 16, actual: 17.5, completed: true },
  { day: "Sun", date: "Jun 13", duration: "In progress", goal: 16, actual: 14.53, completed: false },
];

const FAST_STATS = {
  avgDuration: "15.8h",
  longest: "22h",
  streak: 12,
};

/* ------------------------------------------------------------------ */
/* Circular Countdown Timer                                            */
/* ------------------------------------------------------------------ */

function CircularTimer({
  elapsed,
  goal,
  remaining,
}: {
  elapsed: { hours: number; minutes: number };
  goal: number;
  remaining: { hours: number; minutes: number };
}) {
  const totalElapsedMin = elapsed.hours * 60 + elapsed.minutes;
  const totalGoalMin = goal * 60;
  const progress = Math.min(totalElapsedMin / totalGoalMin, 1);

  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={timerStyles.container}>
      {/* Background + foreground rings via nested Views */}
      <View style={[timerStyles.ring, { width: size, height: size }]}>
        {/* Track */}
        <View
          style={[
            timerStyles.trackRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
            },
          ]}
        />
        {/* We use a progress overlay approach with border clipping */}
        <View
          style={[
            timerStyles.progressRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: Colors.gold,
              // Rotate to start from top
              transform: [{ rotate: "-90deg" }],
            },
          ]}
        />

        {/* Center content */}
        <View style={timerStyles.centerContent}>
          <Text style={timerStyles.remainingLabel}>Remaining</Text>
          <Text style={timerStyles.remainingTime}>
            {remaining.hours}h {remaining.minutes}m
          </Text>
          <Text style={timerStyles.elapsedLabel}>
            {elapsed.hours}h {elapsed.minutes}m elapsed
          </Text>
        </View>
      </View>

      {/* Progress percentage */}
      <Text style={timerStyles.progressText}>
        {Math.round(progress * 100)}% complete
      </Text>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  trackRing: {
    position: "absolute",
    borderColor: Colors.navyLight,
  },
  progressRing: {
    position: "absolute",
  },
  centerContent: {
    alignItems: "center",
    gap: 4,
  },
  remainingLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  remainingTime: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.gold,
  },
  elapsedLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  progressText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
});

/* ------------------------------------------------------------------ */
/* Fasting Zone Progress                                               */
/* ------------------------------------------------------------------ */

function ZoneProgress({ elapsedHours }: { elapsedHours: number }) {
  const currentIdx = getCurrentZoneIndex(elapsedHours);

  return (
    <View style={zoneStyles.container}>
      {/* Zone bar */}
      <View style={zoneStyles.track}>
        {FASTING_ZONES.map((zone, idx) => {
          const nextStart =
            idx < FASTING_ZONES.length - 1
              ? FASTING_ZONES[idx + 1].startHour
              : 24;
          const width = ((nextStart - zone.startHour) / 24) * 100;
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <View
              key={zone.name}
              style={[
                zoneStyles.segment,
                {
                  width: `${width}%`,
                  backgroundColor: isActive ? zone.color : Colors.navyLight,
                  opacity: isActive ? (isCurrent ? 1 : 0.6) : 0.3,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Zone labels */}
      <View style={zoneStyles.labels}>
        {FASTING_ZONES.map((zone, idx) => {
          const isCurrent = idx === currentIdx;
          return (
            <View key={zone.name} style={zoneStyles.labelItem}>
              <View
                style={[
                  zoneStyles.dot,
                  { backgroundColor: zone.color },
                  isCurrent && zoneStyles.dotActive,
                ]}
              />
              <Text
                style={[
                  zoneStyles.labelText,
                  isCurrent && { color: Colors.white, fontWeight: "700" },
                ]}
              >
                {zone.name}
              </Text>
              <Text style={zoneStyles.labelHour}>{zone.startHour}h</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const zoneStyles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  track: {
    flexDirection: "row",
    height: 8,
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  labels: {
    gap: Spacing.xs,
  },
  labelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    flex: 1,
  },
  labelHour: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function FastingScreen() {
  const [isFasting, setIsFasting] = useState(CURRENT_FAST.active);
  const elapsedHours =
    CURRENT_FAST.elapsed.hours + CURRENT_FAST.elapsed.minutes / 60;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Fasting" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Fast Status */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Current Fast</Text>
            <Badge
              label={isFasting ? "Active" : "Inactive"}
              variant={isFasting ? "success" : "default"}
            />
          </View>

          <Text style={styles.protocolName}>{CURRENT_FAST.protocol}</Text>
          <Text style={styles.startTime}>
            Started at {CURRENT_FAST.startTime}
          </Text>

          {/* Circular Timer */}
          <CircularTimer
            elapsed={CURRENT_FAST.elapsed}
            goal={CURRENT_FAST.goal}
            remaining={CURRENT_FAST.remaining}
          />

          {/* Start/End Toggle */}
          <Button
            title={isFasting ? "End Fast" : "Start Fast"}
            variant={isFasting ? "danger" : "primary"}
            size="lg"
            onPress={() => {
              if (isFasting) {
                Alert.alert(
                  "End Fast",
                  `End your fast at ${CURRENT_FAST.elapsed.hours}h ${CURRENT_FAST.elapsed.minutes}m?`,
                  [
                    { text: "Continue Fasting", style: "cancel" },
                    { text: "End Fast", style: "destructive", onPress: () => setIsFasting(false) },
                  ]
                );
              } else {
                Alert.alert(
                  "Start Fast",
                  "Begin a new fasting window now?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Start Fast", onPress: () => setIsFasting(true) },
                  ]
                );
              }
            }}
            style={styles.toggleButton}
          />
        </Card>

        {/* Fasting Zones */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Fasting Zones</Text>
          <ZoneProgress elapsedHours={elapsedHours} />
        </Card>

        {/* Weekly Fasting Log */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Log</Text>

          {WEEKLY_LOG.map((entry, idx) => (
            <View
              key={entry.day}
              style={[
                styles.logRow,
                idx < WEEKLY_LOG.length - 1 && styles.logBorder,
              ]}
            >
              <View style={styles.logDay}>
                <Text style={styles.logDayText}>{entry.day}</Text>
                <Text style={styles.logDateText}>{entry.date}</Text>
              </View>
              <Text style={styles.logDuration}>{entry.duration}</Text>
              <View style={styles.logStatus}>
                {entry.completed ? (
                  <View style={styles.completedBadge}>
                    <Text style={styles.checkmark}>{"✓"}</Text>
                  </View>
                ) : entry.duration === "In progress" ? (
                  <Badge label="Active" variant="info" />
                ) : (
                  <View style={styles.missedBadge}>
                    <Text style={styles.missedText}>{"✗"}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </Card>

        {/* Fast History Stats */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{FAST_STATS.avgDuration}</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{FAST_STATS.longest}</Text>
              <Text style={styles.statLabel}>Longest Fast</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {FAST_STATS.streak}{" "}
                <Text style={styles.statUnit}>days</Text>
              </Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
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

  /* Current fast */
  protocolName: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  startTime: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  toggleButton: {
    marginTop: Spacing.xs,
  },

  /* Weekly log */
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  logBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  logDay: {
    width: 50,
  },
  logDayText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  logDateText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  logDuration: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },
  logStatus: {
    alignItems: "flex-end",
    minWidth: 30,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.successMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: "700",
  },
  missedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dangerMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  missedText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: "700",
  },

  /* Stats */
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  statUnit: {
    fontSize: FontSizes.sm,
    fontWeight: "400",
    color: Colors.silver,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
});
