/**
 * DEXA Scan Results screen — body composition summary, regional breakdown,
 * visceral fat, comparison with previous scan.
 *
 * tRPC paths used (under `clientPortal`):
 *   - clinicalDocs.list({ docType: "dexa_scan" })  -> list of DEXA scan documents with parsedData
 *
 * Renders only real data from the backend. When no scan has been uploaded
 * yet (or the query fails) an honest empty/error state is shown instead of
 * fabricated values.
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
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { showImagePickerOptions } from "@/lib/image-picker";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RegionalData {
  region: string;
  fatPercent: number;
  leanMass: string;
  prevFatPercent: number;
  prevLeanMass: string;
}

interface ComparisonMetric {
  label: string;
  current: string;
  previous: string;
  change: number;
  unit: string;
  lowerIsBetter: boolean;
}

function getTrendArrow(change: number, lowerIsBetter: boolean): { arrow: string; color: string } {
  if (change === 0) return { arrow: "→", color: Colors.silver };
  const isImproved = lowerIsBetter ? change < 0 : change > 0;
  return {
    arrow: change > 0 ? "↑" : "↓",
    color: isImproved ? Colors.success : Colors.danger,
  };
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Upload flow (shared by empty state CTA and bottom button)           */
/* ------------------------------------------------------------------ */

function useUploadDexa() {
  const createDoc = trpc.clientPortal.clinicalDocs.create.useMutation();
  const utils = (trpc as any).useUtils();

  return async () => {
    const image = await showImagePickerOptions();
    if (!image) return;
    try {
      await new Promise<void>((resolve, reject) => {
        createDoc.mutate(
          {
            docType: "dexa_scan",
            title: `DEXA Scan - ${new Date().toLocaleDateString()}`,
            sourceFileName: image.fileName ?? `dexa_${Date.now()}.jpg`,
            notes: `Captured via mobile app. Image URI: ${image.uri}`,
          },
          {
            onSuccess: () => resolve(),
            onError: (err: any) => reject(err),
          },
        );
      });
      utils?.clientPortal?.clinicalDocs?.list?.invalidate?.();
      Alert.alert(
        "Document Uploaded",
        "Your DEXA report has been submitted. It will be reviewed by your care team within 24-48 hours.",
      );
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message ?? "Your DEXA report could not be uploaded. Please try again later.",
      );
    }
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
  const uploadDexa = useUploadDexa();

  const docs = (query.data ?? []) as any[];
  const latest = docs[0]; // already sorted by createdAt DESC
  const parsed = latest?.parsedData as Record<string, any> | null | undefined;

  // ── Loading state ───────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "DEXA Scan" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (query.error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "DEXA Scan" }} />
        <ErrorView
          title="Couldn't load DEXA results"
          message="We couldn't reach the server. Please try again."
          onRetry={() => query.refetch()}
        />
      </SafeAreaView>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────
  if (!latest) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "DEXA Scan" }} />
        <View style={styles.center}>
          <EmptyState
            icon="document"
            title="No DEXA scans yet"
            message="Upload a DEXA report and your care team will review it and add the results here."
            actionLabel="Upload a report"
            onAction={uploadDexa}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Real data mapping (no fabricated fallbacks) ─────────────────
  const scanDate =
    formatDate(parsed?.scanInfo?.date) ??
    formatDate(latest.reportDate) ??
    formatDate(latest.createdAt);
  const facility = parsed?.scanInfo?.facility ?? latest.providerName ?? null;
  const previousDate =
    formatDate(parsed?.scanInfo?.previousDate) ?? formatDate(docs[1]?.reportDate);

  const composition = parsed?.composition
    ? {
        totalBodyFat: parsed.composition.totalBodyFat ?? null,
        leanMass: parsed.composition.leanMass ?? null,
        boneMineralDensity: parsed.composition.boneMineralDensity ?? null,
      }
    : null;

  const regional: RegionalData[] = Array.isArray(parsed?.regional)
    ? (parsed!.regional as any[]).map((r: any) => ({
        region: r.region ?? "",
        fatPercent: r.fatPercent ?? 0,
        leanMass: r.leanMass ?? "—",
        prevFatPercent: r.prevFatPercent ?? r.fatPercent ?? 0,
        prevLeanMass: r.prevLeanMass ?? "—",
      }))
    : [];

  const visceralFat =
    parsed?.visceralFat && parsed.visceralFat.area != null
      ? {
          area: Number(parsed.visceralFat.area),
          unit: parsed.visceralFat.unit ?? "cm²",
          status: (parsed.visceralFat.status ?? null) as string | null,
        }
      : null;

  const comparisons: ComparisonMetric[] = Array.isArray(parsed?.comparisons)
    ? (parsed!.comparisons as any[]).map((c: any) => ({
        label: c.label ?? "",
        current: c.current ?? "",
        previous: c.previous ?? "",
        change: c.change ?? 0,
        unit: c.unit ?? "",
        lowerIsBetter: c.lowerIsBetter ?? false,
      }))
    : [];

  const hasParsedResults =
    composition !== null || regional.length > 0 || visceralFat !== null || comparisons.length > 0;

  const visceralVariant =
    visceralFat === null
      ? "default"
      : visceralFat.area < 100
        ? "success"
        : visceralFat.area < 130
          ? "warning"
          : "danger";
  const visceralLabel =
    visceralFat === null
      ? ""
      : visceralFat.status ?? (visceralFat.area < 100 ? "Normal" : visceralFat.area < 130 ? "Elevated" : "High");

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
          {scanDate && <Text style={styles.scanDate}>{scanDate}</Text>}
          {facility && <Text style={styles.scanFacility}>{facility}</Text>}
        </Card>

        {/* Awaiting review — document uploaded but no parsed results yet */}
        {!hasParsedResults && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Results Pending</Text>
            <Text style={styles.pendingText}>
              Your DEXA report has been received and is awaiting review by your
              care team. Detailed results will appear here once processed.
            </Text>
          </Card>
        )}

        {/* Body Composition Summary */}
        {composition && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Body Composition</Text>

            <View style={styles.compositionGrid}>
              <View style={styles.compositionItem}>
                <Text style={styles.compositionValue}>
                  {composition.totalBodyFat != null ? `${composition.totalBodyFat}%` : "—"}
                </Text>
                <Text style={styles.compositionLabel}>Total Body Fat</Text>
              </View>
              <View style={styles.compositionItem}>
                <Text style={styles.compositionValue}>
                  {composition.leanMass != null ? (
                    <>
                      {composition.leanMass}
                      <Text style={styles.compositionUnit}> lbs</Text>
                    </>
                  ) : (
                    "—"
                  )}
                </Text>
                <Text style={styles.compositionLabel}>Lean Mass</Text>
              </View>
              <View style={styles.compositionItem}>
                <Text style={styles.compositionValue}>
                  {composition.boneMineralDensity != null ? composition.boneMineralDensity : "—"}
                </Text>
                <Text style={styles.compositionLabel}>BMD T-Score</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Regional Breakdown */}
        {regional.length > 0 && (
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

            {regional.map((region, idx) => {
              const fatChange = region.fatPercent - region.prevFatPercent;
              const fatTrend = getTrendArrow(fatChange, true);

              return (
                <View
                  key={region.region || idx}
                  style={[
                    styles.tableRow,
                    idx < regional.length - 1 && styles.tableBorder,
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
        )}

        {/* Visceral Fat */}
        {visceralFat && (
          <Card style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Visceral Fat</Text>
              <Badge label={visceralLabel} variant={visceralVariant as any} />
            </View>

            <View style={styles.visceralRow}>
              <Text style={styles.visceralValue}>
                {visceralFat.area}{" "}
                <Text style={styles.visceralUnit}>{visceralFat.unit}</Text>
              </Text>
              <Text style={styles.visceralRange}>
                Normal: {"<"} 100 {visceralFat.unit}
              </Text>
            </View>

            {/* Visual bar */}
            <View style={styles.visceralBar}>
              <View
                style={[
                  styles.visceralFill,
                  {
                    width: `${Math.min((visceralFat.area / 150) * 100, 100)}%`,
                    backgroundColor:
                      visceralVariant === "success"
                        ? Colors.success
                        : visceralVariant === "warning"
                          ? Colors.warning
                          : Colors.danger,
                  },
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
        )}

        {/* Comparison with Previous */}
        {comparisons.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>
              {previousDate ? `Changes Since ${previousDate}` : "Changes Since Previous Scan"}
            </Text>

            {comparisons.map((metric, idx) => {
              const trend = getTrendArrow(metric.change, metric.lowerIsBetter);

              return (
                <View
                  key={metric.label || idx}
                  style={[
                    styles.compRow,
                    idx < comparisons.length - 1 && styles.compBorder,
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
        )}

        {/* Upload Button */}
        <Button
          title="Upload DEXA Report"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={uploadDexa}
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
  center: {
    flex: 1,
    justifyContent: "center",
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
  pendingText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
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
