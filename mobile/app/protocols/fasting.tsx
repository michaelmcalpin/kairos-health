/**
 * Fasting Tracker screen — current fast status, countdown timer, fasting zones,
 * weekly log, and history stats.
 */

import React, { useMemo } from "react";
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
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const SAMPLE_CURRENT_FAST = {
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

const SAMPLE_WEEKLY_LOG: WeeklyLogEntry[] = [
  { day: "Mon", date: "Jun 7", duration: "16h 12m", goal: 16, actual: 16.2, completed: true },
  { day: "Tue", date: "Jun 8", duration: "16h 45m", goal: 16, actual: 16.75, completed: true },
  { day: "Wed", date: "Jun 9", duration: "18h 03m", goal: 16, actual: 18.05, completed: true },
  { day: "Thu", date: "Jun 10", duration: "15h 20m", goal: 16, actual: 15.33, completed: false },
  { day: "Fri", date: "Jun 11", duration: "16h 08m", goal: 16, actual: 16.13, completed: true },
  { day: "Sat", date: "Jun 12", duration: "17h 30m", goal: 16, actual: 17.5, completed: true },
  { day: "Sun", date: "Jun 13", duration: "In progress", goal: 16, actual: 14.53, completed: false },
];

const SAMPLE_FAST_STATS = {
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
  /* ---- tRPC queries & mutations ---- */
  const protocolQuery = trpc.clientPortal.fasting.getProtocol.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const activeFastQuery = trpc.clientPortal.fasting.getActiveFast.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const logsQuery = trpc.clientPortal.fasting.listLogs.useQuery({ limit: 10 }, DEFAULT_QUERY_OPTIONS);
  const statsQuery = trpc.clientPortal.fasting.stats.useQuery(undefined, DEFAULT_QUERY_OPTIONS);

  const startFastMutation = trpc.clientPortal.fasting.startFast.useMutation({
    onSuccess: () => { activeFastQuery.refetch(); },
  });
  const endFastMutation = trpc.clientPortal.fasting.endFast.useMutation({
    onSuccess: () => { activeFastQuery.refetch(); logsQuery.refetch(); statsQuery.refetch(); },
  });

  /* ---- Map API data with sample fallback ---- */
  const protocol = protocolQuery.data
    ? (protocolQuery.data as any).name ?? (protocolQuery.data as any).protocol ?? SAMPLE_CURRENT_FAST.protocol
    : SAMPLE_CURRENT_FAST.protocol;

  const activeFast = activeFastQuery.data as any | null;

  const isFasting = activeFast
    ? true
    : activeFastQuery.isSuccess
      ? false
      : SAMPLE_CURRENT_FAST.active;

  const currentFast = useMemo(() => {
    if (activeFast) {
      const start = new Date(activeFast.startTime ?? activeFast.startedAt ?? activeFast.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const totalElapsedMin = Math.max(0, Math.floor(diffMs / 60000));
      const elapsedH = Math.floor(totalElapsedMin / 60);
      const elapsedM = totalElapsedMin % 60;
      const goalHours = activeFast.goalHours ?? activeFast.targetHours ?? (protocolQuery.data as any)?.targetHours ?? 16;
      const totalGoalMin = goalHours * 60;
      const remainingMin = Math.max(0, totalGoalMin - totalElapsedMin);
      const remH = Math.floor(remainingMin / 60);
      const remM = remainingMin % 60;
      return {
        protocol,
        startTime: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        elapsed: { hours: elapsedH, minutes: elapsedM },
        goal: goalHours,
        remaining: { hours: remH, minutes: remM },
      };
    }
    return { ...SAMPLE_CURRENT_FAST, protocol };
  }, [activeFast, protocol, protocolQuery.data]);

  const weeklyLog: WeeklyLogEntry[] = useMemo(() => {
    if (logsQuery.data && Array.isArray(logsQuery.data) && logsQuery.data.length > 0) {
      return (logsQuery.data as any[]).slice(0, 7).map((log: any) => {
        const start = new Date(log.startTime ?? log.startedAt);
        const end = log.endTime ?? log.endedAt ? new Date(log.endTime ?? log.endedAt) : null;
        const durationMs = end ? end.getTime() - start.getTime() : 0;
        const durationH = durationMs / 3600000;
        const h = Math.floor(durationH);
        const m = Math.round((durationH - h) * 60);
        const goalH = log.goalHours ?? log.targetHours ?? 16;
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
          day: dayNames[start.getDay()],
          date: `${monthNames[start.getMonth()]} ${start.getDate()}`,
          duration: end ? `${h}h ${String(m).padStart(2, "0")}m` : "In progress",
          goal: goalH,
          actual: durationH,
          completed: durationH >= goalH,
        };
      });
    }
    return SAMPLE_WEEKLY_LOG;
  }, [logsQuery.data]);

  const fastStats = useMemo(() => {
    if (statsQuery.data) {
      const s = statsQuery.data as any;
      return {
        avgDuration: (s.avgDuration ?? s.averageDurationHours) ? `${Number(s.avgDuration ?? s.averageDurationHours).toFixed(1)}h` : SAMPLE_FAST_STATS.avgDuration,
        longest: (s.longestFast ?? s.longestDurationHours) ? `${Math.round(Number(s.longestFast ?? s.longestDurationHours))}h` : SAMPLE_FAST_STATS.longest,
        streak: s.streak ?? s.currentStreak ?? SAMPLE_FAST_STATS.streak,
      };
    }
    return SAMPLE_FAST_STATS;
  }, [statsQuery.data]);

  const elapsedHours =
    currentFast.elapsed.hours + currentFast.elapsed.minutes / 60;

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

          <Text style={styles.protocolName}>{currentFast.protocol}</Text>
          <Text style={styles.startTime}>
            Started at {currentFast.startTime}
          </Text>

          {/* Circular Timer */}
          <CircularTimer
            elapsed={currentFast.elapsed}
            goal={currentFast.goal}
            remaining={currentFast.remaining}
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
                  `End your fast at ${currentFast.elapsed.hours}h ${currentFast.elapsed.minutes}m?`,
                  [
                    { text: "Continue Fasting", style: "cancel" },
                    {
                      text: "End Fast",
                      style: "destructive",
                      onPress: () => endFastMutation.mutate({}),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  "Start Fast",
                  "Begin a new fasting window now?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Start Fast",
                      onPress: () => startFastMutation.mutate({}),
                    },
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

          {weeklyLog.map((entry, idx) => (
            <View
              key={entry.day}
              style={[
                styles.logRow,
                idx < weeklyLog.length - 1 && styles.logBorder,
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
              <Text style={styles.statValue}>{fastStats.avgDuration}</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fastStats.longest}</Text>
              <Text style={styles.statLabel}>Longest Fast</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {fastStats.streak}{" "}
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
