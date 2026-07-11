/**
 * Manual Data Entry hub screen.
 *
 * Displays tappable cards for each health data type that
 * can be logged manually. Each card shows the entry type
 * name, icon, and last entry timestamp.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Heart,
  Scale,
  Droplets,
  Moon,
  Thermometer,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EntryTypeCard, EntryType } from "@/components/data-entry/EntryTypeCard";
import { useTodayCheckin } from "@/hooks";

/* ------------------------------------------------------------------ */
/* Entry types                                                         */
/* ------------------------------------------------------------------ */

const ENTRY_TYPES: EntryType[] = [
  {
    id: "blood-pressure",
    label: "Blood Pressure",
    icon: <Heart size={22} color="#C65D5D" />,
    iconColor: "#C65D5D",
    lastEntry: "2 hours ago",
  },
  {
    id: "weight",
    label: "Body Weight",
    icon: <Scale size={22} color="#D4A843" />,
    iconColor: "#D4A843",
    lastEntry: "This morning",
  },
  {
    id: "glucose",
    label: "Blood Glucose",
    icon: <Droplets size={22} color="#4A9D5B" />,
    iconColor: "#4A9D5B",
    lastEntry: "4 hours ago",
  },
  {
    id: "sleep",
    label: "Sleep",
    icon: <Moon size={22} color="#8B5CF6" />,
    iconColor: "#8B5CF6",
    lastEntry: "Yesterday",
  },
  {
    id: "temperature",
    label: "Temperature",
    icon: <Thermometer size={22} color="#F97316" />,
    iconColor: "#F97316",
    lastEntry: "3 days ago",
  },
  {
    id: "symptoms",
    label: "Symptoms / Notes",
    icon: <FileText size={22} color="#4A90D9" />,
    iconColor: "#4A90D9",
    lastEntry: "1 day ago",
  },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DataEntryScreen() {
  const router = useRouter();

  // ── Check-in data ─────────────────────────────────────────
  const { checkin: todayCheckin, isLoading: loadingCheckin, refetch: refetchCheckin } = useTodayCheckin();

  const hasCheckedInToday = !!todayCheckin;

  // Build a summary of today's check-in fields
  const checkinSummary: string[] = [];
  if (todayCheckin) {
    if (todayCheckin.weight) checkinSummary.push(`Weight: ${todayCheckin.weight} lbs`);
    if (todayCheckin.sleepHours) checkinSummary.push(`Sleep: ${todayCheckin.sleepHours} hrs`);
    if (todayCheckin.mood) checkinSummary.push(`Mood: ${todayCheckin.mood}/10`);
    if (todayCheckin.energy) checkinSummary.push(`Energy: ${todayCheckin.energy}/10`);
    if (todayCheckin.cardioMinutes) checkinSummary.push(`Exercise: ${todayCheckin.cardioMinutes} min`);
    if (todayCheckin.waterOz) checkinSummary.push(`Water: ${todayCheckin.waterOz} oz`);
  }

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchCheckin();
    setRefreshing(false);
  }, [refetchCheckin]);

  const handlePress = (entry: EntryType) => {
    router.push({
      pathname: "/data-entry/log",
      params: { type: entry.id, title: entry.label },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Log Health Data</Text>
        <Text style={styles.headerSubtitle}>
          Manually record measurements that aren't captured by your connected
          devices.
        </Text>

        {/* ─── Today's Check-in Status ──────────────────────── */}
        <Card style={styles.checkinCard}>
          <View style={styles.checkinHeader}>
            {hasCheckedInToday ? (
              <CheckCircle2 size={20} color={Colors.success} />
            ) : (
              <AlertCircle size={20} color={Colors.warning} />
            )}
            <Text style={styles.checkinTitle}>
              {hasCheckedInToday ? "Daily Check-in Complete" : "Daily Check-in Pending"}
            </Text>
            <Badge
              label={hasCheckedInToday ? "Done" : "Pending"}
              variant={hasCheckedInToday ? "success" : "warning"}
            />
          </View>
          {hasCheckedInToday && checkinSummary.length > 0 ? (
            <Text style={styles.checkinSummary}>
              {checkinSummary.join("  |  ")}
            </Text>
          ) : !hasCheckedInToday ? (
            <Text style={styles.checkinSummary}>
              Tap any entry type below to start logging today's data.
            </Text>
          ) : null}
          {loadingCheckin && (
            <ActivityIndicator size="small" color={Colors.gold} style={{ marginTop: Spacing.xs }} />
          )}
        </Card>

        {/* Entry type cards */}
        {ENTRY_TYPES.map((entry) => (
          <EntryTypeCard
            key={entry.id}
            entry={entry}
            onPress={() => handlePress(entry)}
          />
        ))}

        {/* Tip card */}
        <Card style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>
            Regular manual logging helps fill gaps in your health data and
            gives your care team a more complete picture. Try to log at
            consistent times each day for best results.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  checkinCard: {
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkinHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  checkinTitle: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    flex: 1,
  },
  checkinSummary: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: "rgba(74, 144, 217, 0.08)",
    borderColor: "rgba(74, 144, 217, 0.2)",
    marginTop: Spacing.md,
  },
  tipTitle: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
});
