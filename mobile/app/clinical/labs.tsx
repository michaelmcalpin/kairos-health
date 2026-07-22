/**
 * Lab Results screen — most recent panel and key markers with status.
 *
 * tRPC paths used (under `clientPortal`):
 *   - labs.listBiomarkers -> latest biomarker values across all markers
 *   - labs.listOrders     -> recent lab orders (panel metadata)
 *
 * Renders only real data from the backend. When no results exist yet
 * (or the query fails) an honest empty/error state is shown instead of
 * fabricated values.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
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
import type { StatusVariant } from "@/lib/types";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { showImagePickerOptions } from "@/lib/image-picker";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface LabMarker {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: "optimal" | "normal" | "borderline" | "critical";
}

const statusToVariant: Record<LabMarker["status"], StatusVariant> = {
  optimal: "success",
  normal: "info",
  borderline: "warning",
  critical: "danger",
};

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Upload flow (shared by empty state CTA and bottom button)           */
/* ------------------------------------------------------------------ */

function useUploadLabs() {
  const createDoc = trpc.clientPortal.clinicalDocs.create.useMutation();

  return async () => {
    const image = await showImagePickerOptions();
    if (!image) return;
    try {
      await new Promise<void>((resolve, reject) => {
        createDoc.mutate(
          {
            docType: "medical_record",
            title: `Lab Results - ${new Date().toLocaleDateString()}`,
            sourceFileName: image.fileName ?? `lab_${Date.now()}.jpg`,
            notes: `Captured via mobile app. Image URI: ${image.uri}`,
          },
          {
            onSuccess: () => resolve(),
            onError: (err: any) => reject(err),
          },
        );
      });
      Alert.alert(
        "Document Uploaded",
        "Your lab results have been submitted. They will be reviewed by your care team within 24-48 hours.",
      );
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message ?? "Your lab results could not be uploaded. Please try again later.",
      );
    }
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LabsScreen() {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const uploadLabs = useUploadLabs();

  // ── tRPC queries ─────────────────────────────────────────────────
  const query = trpc.clientPortal.labs.listBiomarkers.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const ordersQuery = trpc.clientPortal.labs.listOrders.useQuery(
    { limit: 10 },
    DEFAULT_QUERY_OPTIONS,
  );

  // ── Loading state ───────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Lab Results" }} />
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
        <Stack.Screen options={{ title: "Lab Results" }} />
        <ErrorView
          title="Couldn't load lab results"
          message="We couldn't reach the server. Please try again."
          onRetry={() => query.refetch()}
        />
      </SafeAreaView>
    );
  }

  // Backend returns: Array<{ code, name, category, value, unit, refLow, refHigh, status, lastMeasured }>
  const biomarkers = (query.data ?? []) as any[];

  // ── Empty state ─────────────────────────────────────────────────
  if (biomarkers.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Lab Results" }} />
        <View style={styles.center}>
          <EmptyState
            icon="document"
            title="No lab results yet"
            message="Upload a lab report and your care team will review it and add your biomarker results here."
            actionLabel="Upload a report"
            onAction={uploadLabs}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Real data mapping (no fabricated fallbacks) ─────────────────
  const labOrders = (ordersQuery.data ?? []) as any[];
  const latestOrder = labOrders[0];

  const latestMeasured = biomarkers.reduce((latest: Date | null, b: any) => {
    const d = b.lastMeasured ? new Date(b.lastMeasured) : null;
    return d && !isNaN(d.getTime()) && (!latest || d > latest) ? d : latest;
  }, null as Date | null);

  const panelName: string | null = latestOrder?.panelName ?? null;
  const panelDate: string | null =
    formatDate(latestOrder?.testDate) ?? (latestMeasured ? formatDate(latestMeasured) : null);
  const panelProvider: string | null = latestOrder?.provider ?? null;

  const mapStatus = (s?: string): LabMarker["status"] => {
    if (s === "optimal" || s === "normal" || s === "borderline" || s === "critical") return s;
    if (s === "high" || s === "low") return "borderline";
    return "normal";
  };

  const MARKERS: LabMarker[] = biomarkers.map((b: any) => ({
    name: b.name ?? b.code ?? "",
    value: String(b.value ?? ""),
    unit: b.unit ?? "",
    range: b.refLow != null && b.refHigh != null
      ? `${b.refLow}-${b.refHigh}`
      : b.refHigh != null
        ? `< ${b.refHigh}`
        : b.refLow != null
          ? `> ${b.refLow}`
          : "—",
    status: mapStatus(b.status),
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Lab Results" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Most Recent Panel — only real metadata */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Most Recent Panel</Text>
          <Text style={styles.panelName}>{panelName ?? "Lab Results"}</Text>
          <View style={styles.panelMeta}>
            {panelDate && <Text style={styles.panelDetail}>{panelDate}</Text>}
            {panelProvider && <Text style={styles.panelDetail}>{panelProvider}</Text>}
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
          onPress={uploadLabs}
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
