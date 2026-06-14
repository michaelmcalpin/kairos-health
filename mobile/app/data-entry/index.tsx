/**
 * Manual Data Entry hub screen.
 *
 * Displays tappable cards for each health data type that
 * can be logged manually. Each card shows the entry type
 * name, icon, and last entry timestamp.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
} from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { EntryTypeCard, EntryType } from "@/components/data-entry/EntryTypeCard";

/* ------------------------------------------------------------------ */
/* Entry types                                                         */
/* ------------------------------------------------------------------ */

const ENTRY_TYPES: EntryType[] = [
  {
    id: "blood-pressure",
    label: "Blood Pressure",
    icon: <Heart size={22} color="#EF4444" />,
    iconColor: "#EF4444",
    lastEntry: "2 hours ago",
  },
  {
    id: "weight",
    label: "Body Weight",
    icon: <Scale size={22} color="#EAB308" />,
    iconColor: "#EAB308",
    lastEntry: "This morning",
  },
  {
    id: "glucose",
    label: "Blood Glucose",
    icon: <Droplets size={22} color="#22C55E" />,
    iconColor: "#22C55E",
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
    icon: <FileText size={22} color="#3B82F6" />,
    iconColor: "#3B82F6",
    lastEntry: "1 day ago",
  },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DataEntryScreen() {
  const router = useRouter();

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
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Log Health Data</Text>
        <Text style={styles.headerSubtitle}>
          Manually record measurements that aren't captured by your connected
          devices.
        </Text>

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
  tipCard: {
    backgroundColor: "rgba(200, 169, 81, 0.08)",
    borderColor: "rgba(200, 169, 81, 0.2)",
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
