/**
 * Lab Results screen — most recent panel, key markers with status, and historical trends.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StatusVariant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const PANEL = {
  name: "Comprehensive Metabolic Panel",
  date: "May 28, 2026",
  lab: "Quest Diagnostics",
  orderedBy: "Dr. Sarah Chen",
};

interface LabMarker {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: "optimal" | "normal" | "borderline" | "critical";
  history: { date: string; value: number }[];
}

const statusToVariant: Record<LabMarker["status"], StatusVariant> = {
  optimal: "success",
  normal: "info",
  borderline: "warning",
  critical: "danger",
};

const MARKERS: LabMarker[] = [
  {
    name: "LDL-P",
    value: "980",
    unit: "nmol/L",
    range: "< 1,000",
    status: "optimal",
    history: [
      { date: "Nov 2025", value: 1340 },
      { date: "Jan 2026", value: 1180 },
      { date: "Mar 2026", value: 1050 },
      { date: "May 2026", value: 980 },
    ],
  },
  {
    name: "ApoB",
    value: "78",
    unit: "mg/dL",
    range: "< 90",
    status: "optimal",
    history: [
      { date: "Nov 2025", value: 112 },
      { date: "Jan 2026", value: 98 },
      { date: "Mar 2026", value: 86 },
      { date: "May 2026", value: 78 },
    ],
  },
  {
    name: "HbA1c",
    value: "5.2",
    unit: "%",
    range: "< 5.7",
    status: "optimal",
    history: [
      { date: "Nov 2025", value: 5.6 },
      { date: "Jan 2026", value: 5.4 },
      { date: "Mar 2026", value: 5.3 },
      { date: "May 2026", value: 5.2 },
    ],
  },
  {
    name: "Fasting Glucose",
    value: "92",
    unit: "mg/dL",
    range: "70-100",
    status: "normal",
    history: [
      { date: "Nov 2025", value: 98 },
      { date: "Jan 2026", value: 95 },
      { date: "Mar 2026", value: 93 },
      { date: "May 2026", value: 92 },
    ],
  },
  {
    name: "hs-CRP",
    value: "1.8",
    unit: "mg/L",
    range: "< 1.0",
    status: "borderline",
    history: [
      { date: "Nov 2025", value: 3.2 },
      { date: "Jan 2026", value: 2.6 },
      { date: "Mar 2026", value: 2.1 },
      { date: "May 2026", value: 1.8 },
    ],
  },
  {
    name: "Vitamin D",
    value: "58",
    unit: "ng/mL",
    range: "40-80",
    status: "optimal",
    history: [
      { date: "Nov 2025", value: 32 },
      { date: "Jan 2026", value: 41 },
      { date: "Mar 2026", value: 50 },
      { date: "May 2026", value: 58 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Mini Trend Chart                                                    */
/* ------------------------------------------------------------------ */

function TrendChart({ data, color }: { data: { date: string; value: number }[]; color: string }) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartHeight = 60;

  return (
    <View style={trendStyles.container}>
      <View style={trendStyles.chart}>
        {data.map((point, idx) => {
          const height = ((point.value - min) / range) * chartHeight + 8;
          return (
            <View key={idx} style={trendStyles.barCol}>
              <View
                style={[
                  trendStyles.bar,
                  {
                    height,
                    backgroundColor: idx === data.length - 1 ? color : `${color}66`,
                  },
                ]}
              />
              <Text style={trendStyles.barValue}>{point.value}</Text>
              <Text style={trendStyles.barDate}>{point.date}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 100,
  },
  barCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: Radii.sm,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.white,
  },
  barDate: {
    fontSize: 9,
    color: Colors.silver,
  },
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LabsScreen() {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Lab Results" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Most Recent Panel */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Most Recent Panel</Text>
          <Text style={styles.panelName}>{PANEL.name}</Text>
          <View style={styles.panelMeta}>
            <Text style={styles.panelDetail}>{PANEL.date}</Text>
            <Text style={styles.panelDetail}>{PANEL.lab}</Text>
            <Text style={styles.panelDetail}>Ordered by {PANEL.orderedBy}</Text>
          </View>
        </Card>

        {/* Key Markers */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Key Markers</Text>

          {MARKERS.map((marker, idx) => {
            const isSelected = selectedMarker === marker.name;
            const variantColor = statusToVariant[marker.status];

            return (
              <Pressable
                key={idx}
                onPress={() =>
                  setSelectedMarker(isSelected ? null : marker.name)
                }
              >
                <View
                  style={[
                    styles.markerRow,
                    idx < MARKERS.length - 1 && styles.markerBorder,
                  ]}
                >
                  <View style={styles.markerInfo}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.markerName}>{marker.name}</Text>
                      <Badge
                        label={marker.status}
                        variant={variantColor}
                      />
                    </View>
                    <View style={styles.markerValues}>
                      <Text style={styles.markerValue}>
                        {marker.value}{" "}
                        <Text style={styles.markerUnit}>{marker.unit}</Text>
                      </Text>
                      <Text style={styles.markerRange}>
                        Ref: {marker.range}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Trend chart (expanded) */}
                {isSelected && (
                  <TrendChart
                    data={marker.history}
                    color={
                      variantColor === "success"
                        ? Colors.success
                        : variantColor === "warning"
                          ? Colors.warning
                          : variantColor === "danger"
                            ? Colors.danger
                            : Colors.info
                    }
                  />
                )}
              </Pressable>
            );
          })}
        </Card>

        {/* Upload Button */}
        <Button
          title="Upload Lab Results"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
        />
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

  /* Panel header */
  panelName: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  panelMeta: {
    gap: 2,
  },
  panelDetail: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Markers */
  markerRow: {
    paddingVertical: Spacing.sm,
  },
  markerBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  markerInfo: {
    gap: Spacing.xs,
  },
  markerName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  markerValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  markerValue: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  markerUnit: {
    fontSize: FontSizes.sm,
    fontWeight: "400",
    color: Colors.silver,
  },
  markerRange: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
