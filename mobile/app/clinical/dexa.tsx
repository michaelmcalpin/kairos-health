/**
 * DEXA Scan Results screen — body composition summary, regional breakdown,
 * visceral fat, comparison with previous scan.
 *
 * tRPC paths used (under `clientPortal`):
 *   - clinicalDocs.list({ docType: "dexa_scan" })  -> list of DEXA scan documents with parsedData
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Sample data (fallback when API is unreachable)                      */
/* ------------------------------------------------------------------ */

const SAMPLE_SCAN_INFO = {
  date: "May 15, 2026",
  facility: "Longevity Medical Center",
  previousDate: "Nov 12, 2025",
};

const SAMPLE_BODY_COMPOSITION = {
  totalBodyFat: 16.8,
  leanMass: 142.3,
  boneMineralDensity: -0.2,
};

interface RegionalData {
  region: string;
  fatPercent: number;
  leanMass: string;
  prevFatPercent: number;
  prevLeanMass: string;
}

const SAMPLE_REGIONAL_BREAKDOWN: RegionalData[] = [
  {
    region: "Arms",
    fatPercent: 14.2,
    leanMass: "18.4 lbs",
    prevFatPercent: 15.8,
    prevLeanMass: "17.6 lbs",
  },
  {
    region: "Legs",
    fatPercent: 18.1,
    leanMass: "48.6 lbs",
    prevFatPercent: 19.5,
    prevLeanMass: "46.8 lbs",
  },
  {
    region: "Trunk",
    fatPercent: 16.5,
    leanMass: "62.1 lbs",
    prevFatPercent: 18.2,
    prevLeanMass: "60.4 lbs",
  },
  {
    region: "Android",
    fatPercent: 15.3,
    leanMass: "8.2 lbs",
    prevFatPercent: 17.9,
    prevLeanMass: "7.8 lbs",
  },
  {
    region: "Gynoid",
    fatPercent: 19.4,
    leanMass: "14.8 lbs",
    prevFatPercent: 20.1,
    prevLeanMass: "14.2 lbs",
  },
];

const SAMPLE_VISCERAL_FAT = {
  area: 72,
  unit: "cm²",
  status: "Normal" as const,
};

interface ComparisonMetric {
  label: string;
  current: string;
  previous: string;
  change: number;
  unit: string;
  lowerIsBetter: boolean;
}

const SAMPLE_COMPARISONS: ComparisonMetric[] = [
  {
    label: "Total Body Fat",
    current: "16.8%",
    previous: "18.9%",
    change: -2.1,
    unit: "%",
    lowerIsBetter: true,
  },
  {
    label: "Lean Mass",
    current: "142.3 lbs",
    previous: "138.1 lbs",
    change: 4.2,
    unit: "lbs",
    lowerIsBetter: false,
  },
  {
    label: "BMD T-Score",
    current: "-0.2",
    previous: "-0.4",
    change: 0.2,
    unit: "",
    lowerIsBetter: false,
  },
  {
    label: "Visceral Fat",
    current: "72 cm²",
    previous: "86 cm²",
    change: -14,
    unit: "cm²",
    lowerIsBetter: true,
  },
];

function getTrendArrow(change: number, lowerIsBetter: boolean): { arrow: string; color: string } {
  if (change === 0) return { arrow: "→", color: Colors.silver };
  const isImproved = lowerIsBetter ? change < 0 : change > 0;
  return {
    arrow: change > 0 ? "↑" : "↓",
    color: isImproved ? Colors.success : Colors.danger,
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DexaScreen() {
  // ── tRPC query ──────────────────────────────────────────────────
  const query = trpc.clientPortal.clinicalDocs.list.useQuery(
    { docType: "dexa_scan" },
    DEFAULT_QUERY_OPTIONS,
  );

  // Backend returns an array of clinical documents with parsedData JSON blobs.
  // Extract the latest document's parsedData for display, falling back to sample data.
  const docs = (query.data ?? []) as any[];
  const latest = docs[0]; // already sorted by createdAt DESC
  const parsed = latest?.parsedData as Record<string, any> | null | undefined;

  const SCAN_INFO = parsed?.scanInfo
    ? {
        date: parsed.scanInfo.date ?? SAMPLE_SCAN_INFO.date,
        facility: parsed.scanInfo.facility ?? SAMPLE_SCAN_INFO.facility,
        previousDate: parsed.scanInfo.previousDate ?? SAMPLE_SCAN_INFO.previousDate,
      }
    : latest
      ? {
          date: latest.reportDate
            ? new Date(latest.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : new Date(latest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          facility: latest.providerName ?? SAMPLE_SCAN_INFO.facility,
          previousDate: docs[1]?.reportDate
            ? new Date(docs[1].reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : SAMPLE_SCAN_INFO.previousDate,
        }
      : SAMPLE_SCAN_INFO;

  const BODY_COMPOSITION = parsed?.composition
    ? {
        totalBodyFat: parsed.composition.totalBodyFat ?? SAMPLE_BODY_COMPOSITION.totalBodyFat,
        leanMass: parsed.composition.leanMass ?? SAMPLE_BODY_COMPOSITION.leanMass,
        boneMineralDensity: parsed.composition.boneMineralDensity ?? SAMPLE_BODY_COMPOSITION.boneMineralDensity,
      }
    : SAMPLE_BODY_COMPOSITION;

  const REGIONAL_BREAKDOWN: RegionalData[] = parsed?.regional
    ? (parsed.regional as any[]).map((r: any) => ({
        region: r.region ?? "",
        fatPercent: r.fatPercent ?? 0,
        leanMass: r.leanMass ?? "0 lbs",
        prevFatPercent: r.prevFatPercent ?? 0,
        prevLeanMass: r.prevLeanMass ?? "0 lbs",
      }))
    : SAMPLE_REGIONAL_BREAKDOWN;

  const VISCERAL_FAT = parsed?.visceralFat
    ? {
        area: parsed.visceralFat.area ?? SAMPLE_VISCERAL_FAT.area,
        unit: parsed.visceralFat.unit ?? SAMPLE_VISCERAL_FAT.unit,
        status: (parsed.visceralFat.status ?? SAMPLE_VISCERAL_FAT.status) as "Normal",
      }
    : SAMPLE_VISCERAL_FAT;

  const COMPARISONS: ComparisonMetric[] = parsed?.comparisons
    ? (parsed.comparisons as any[]).map((c: any) => ({
        label: c.label ?? "",
        current: c.current ?? "",
        previous: c.previous ?? "",
        change: c.change ?? 0,
        unit: c.unit ?? "",
        lowerIsBetter: c.lowerIsBetter ?? false,
      }))
    : SAMPLE_COMPARISONS;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "DEXA Scan" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Most Recent Scan */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Most Recent Scan</Text>
          <Text style={styles.scanDate}>{SCAN_INFO.date}</Text>
          <Text style={styles.scanFacility}>{SCAN_INFO.facility}</Text>
        </Card>

        {/* Body Composition Summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Body Composition</Text>

          <View style={styles.compositionGrid}>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionValue}>
                {BODY_COMPOSITION.totalBodyFat}%
              </Text>
              <Text style={styles.compositionLabel}>Total Body Fat</Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionValue}>
                {BODY_COMPOSITION.leanMass}
                <Text style={styles.compositionUnit}> lbs</Text>
              </Text>
              <Text style={styles.compositionLabel}>Lean Mass</Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionValue}>
                {BODY_COMPOSITION.boneMineralDensity}
              </Text>
              <Text style={styles.compositionLabel}>BMD T-Score</Text>
            </View>
          </View>
        </Card>

        {/* Regional Breakdown */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Regional Breakdown</Text>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.regionCol]}>
              Region
            </Text>
            <Text style={[styles.tableHeaderText, styles.valueCol]}>
              Fat %
            </Text>
            <Text style={[styles.tableHeaderText, styles.valueCol]}>
              Lean Mass
            </Text>
          </View>

          {REGIONAL_BREAKDOWN.map((region, idx) => {
            const fatChange = region.fatPercent - region.prevFatPercent;
            const fatTrend = getTrendArrow(fatChange, true);

            return (
              <View
                key={region.region}
                style={[
                  styles.tableRow,
                  idx < REGIONAL_BREAKDOWN.length - 1 && styles.tableBorder,
                ]}
              >
                <Text style={[styles.regionName, styles.regionCol]}>
                  {region.region}
                </Text>
                <View style={[styles.valueCol, styles.valueWithTrend]}>
                  <Text style={styles.regionValue}>
                    {region.fatPercent}%
                  </Text>
                  <Text style={[styles.trendArrow, { color: fatTrend.color }]}>
                    {fatTrend.arrow}
                  </Text>
                </View>
                <Text style={[styles.regionValue, styles.valueCol]}>
                  {region.leanMass}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Visceral Fat */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Visceral Fat</Text>
            <Badge label={VISCERAL_FAT.status} variant="success" />
          </View>

          <View style={styles.visceralRow}>
            <Text style={styles.visceralValue}>
              {VISCERAL_FAT.area}{" "}
              <Text style={styles.visceralUnit}>{VISCERAL_FAT.unit}</Text>
            </Text>
            <Text style={styles.visceralRange}>
              Normal: {"<"} 100 {VISCERAL_FAT.unit}
            </Text>
          </View>

          {/* Visual bar */}
          <View style={styles.visceralBar}>
            <View
              style={[
                styles.visceralFill,
                { width: `${(VISCERAL_FAT.area / 150) * 100}%` },
              ]}
            />
            <View style={styles.visceralThreshold} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.barLabel}>0</Text>
            <Text style={[styles.barLabel, { color: Colors.warning }]}>
              100 (threshold)
            </Text>
            <Text style={styles.barLabel}>150</Text>
          </View>
        </Card>

        {/* Comparison with Previous */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            Changes Since {SCAN_INFO.previousDate}
          </Text>

          {COMPARISONS.map((metric, idx) => {
            const trend = getTrendArrow(metric.change, metric.lowerIsBetter);

            return (
              <View
                key={metric.label}
                style={[
                  styles.compRow,
                  idx < COMPARISONS.length - 1 && styles.compBorder,
                ]}
              >
                <View style={styles.compInfo}>
                  <Text style={styles.compLabel}>{metric.label}</Text>
                  <Text style={styles.compValues}>
                    {metric.previous} {"→"} {metric.current}
                  </Text>
                </View>
                <View style={styles.compChange}>
                  <Text
                    style={[styles.compChangeValue, { color: trend.color }]}
                  >
                    {trend.arrow}{" "}
                    {metric.change > 0 ? "+" : ""}
                    {metric.change}
                    {metric.unit}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Upload Button */}
        <Button
          title="Upload DEXA Report"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={() => Alert.alert("Upload DEXA Report", "Upload functionality coming soon. Your coach can also upload DEXA reports on your behalf.")}
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

  /* Scan info */
  scanDate: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  scanFacility: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Body composition */
  compositionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
  },
  compositionItem: {
    alignItems: "center",
    gap: 4,
  },
  compositionValue: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  compositionUnit: {
    fontSize: FontSizes.sm,
    fontWeight: "400",
    color: Colors.silver,
  },
  compositionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Regional table */
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  regionCol: {
    flex: 1,
  },
  valueCol: {
    width: 90,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tableBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  regionName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  regionValue: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    textAlign: "right",
  },
  valueWithTrend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  trendArrow: {
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },

  /* Visceral fat */
  visceralRow: {
    gap: 4,
  },
  visceralValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  visceralUnit: {
    fontSize: FontSizes.md,
    fontWeight: "400",
    color: Colors.silver,
  },
  visceralRange: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  visceralBar: {
    height: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    overflow: "hidden",
    position: "relative",
  },
  visceralFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: Radii.full,
  },
  visceralThreshold: {
    position: "absolute",
    left: "66.7%", // 100/150
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.warning,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.silver,
  },

  /* Comparisons */
  compRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  compBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  compInfo: {
    flex: 1,
    gap: 2,
  },
  compLabel: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  compValues: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  compChange: {
    alignItems: "flex-end",
  },
  compChangeValue: {
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
