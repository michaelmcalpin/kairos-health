/**
 * Genetics screen — genetic profile summary and key findings.
 *
 * tRPC paths used (under `clientPortal`):
 *   - genetics.getProfile   -> profile summary + markers
 *   - genetics.getMarkers   -> all markers for the latest profile
 *   - clinicalDocs.create   -> upload a genetic report for care-team review
 *
 * Renders only real data from the backend. When no genetic profile
 * exists yet (or the query fails) an honest empty/error state is shown
 * instead of fabricated values. The previous fake "Risk Factors"
 * section (invented percentiles) has been removed.
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

interface GeneticFinding {
  gene: string;
  variant: string;
  interpretation: string;
  impact: string;
  category: string;
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Upload flow (same clinicalDocs flow as other clinical screens)      */
/* ------------------------------------------------------------------ */

function useUploadGeneticReport() {
  const createDoc = trpc.clientPortal.clinicalDocs.create.useMutation();

  return async () => {
    const image = await showImagePickerOptions();
    if (!image) return;
    try {
      await new Promise<void>((resolve, reject) => {
        createDoc.mutate(
          {
            docType: "medical_record",
            title: `Genetic Report - ${new Date().toLocaleDateString()}`,
            sourceFileName: image.fileName ?? `genetics_${Date.now()}.jpg`,
            notes: `Genetic report captured via mobile app. Image URI: ${image.uri}`,
          },
          {
            onSuccess: () => resolve(),
            onError: (err: any) => reject(err),
          },
        );
      });
      Alert.alert(
        "Document Uploaded",
        "Your genetic report has been submitted. It will be reviewed by your care team within 24-48 hours.",
      );
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message ?? "Your genetic report could not be uploaded. Please try again later.",
      );
    }
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function GeneticsScreen() {
  // ── tRPC queries ─────────────────────────────────────────────────
  const query = trpc.clientPortal.genetics.getProfile.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const markersQuery = trpc.clientPortal.genetics.getMarkers.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const uploadGeneticReport = useUploadGeneticReport();

  // ── Loading state ───────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Genetics" }} />
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
        <Stack.Screen options={{ title: "Genetics" }} />
        <ErrorView
          title="Couldn't load genetic profile"
          message="We couldn't reach the server. Please try again."
          onRetry={() => query.refetch()}
        />
      </SafeAreaView>
    );
  }

  // Backend returns: { id, uploadType, status, createdAt, markers: [...] } | null
  const apiData = query.data as any;

  // ── Empty state ─────────────────────────────────────────────────
  if (!apiData) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Genetics" }} />
        <View style={styles.center}>
          <EmptyState
            icon="document"
            title="No genetic data yet"
            message="Upload a genetic report and your care team will review it and add your results here."
            actionLabel="Upload a report"
            onAction={uploadGeneticReport}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Real data mapping (no fabricated fallbacks) ─────────────────
  const markersData = (markersQuery.data ?? []) as any[];
  const allMarkers: any[] = markersData.length > 0 ? markersData : (apiData.markers ?? []);

  const profileDate = formatDate(apiData.createdAt);
  const uploadType: string | null = apiData.uploadType ?? null;
  const actionableCount = allMarkers.filter(
    (m: any) => m.clinicalPriority === "high",
  ).length;

  const findings: GeneticFinding[] = allMarkers.map((m: any) => ({
    gene: m.gene ?? "",
    variant: m.mutation ?? m.rsId ?? "",
    interpretation: m.function ?? "",
    impact: m.supplementProtocol ?? m.dietStrategy ?? m.lifestyleStrategy ?? "",
    category: m.pathway ?? m.section ?? "",
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Genetics" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Genetic Profile</Text>

          <Text style={styles.profileProvider}>
            {uploadType ?? "Genetic Report"}
          </Text>
          {profileDate && (
            <Text style={styles.profileLab}>Uploaded {profileDate}</Text>
          )}

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{allMarkers.length}</Text>
              <Text style={styles.statLabel}>Variants Analyzed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.gold }]}>
                {actionableCount}
              </Text>
              <Text style={styles.statLabel}>High-Priority Findings</Text>
            </View>
          </View>
        </Card>

        {/* Key Findings */}
        {findings.length > 0 ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Key Findings</Text>

            {findings.map((finding, idx) => (
              <View
                key={idx}
                style={[
                  styles.findingCard,
                  idx < findings.length - 1 && styles.findingBorder,
                ]}
              >
                <View style={styles.findingHeader}>
                  <View style={styles.geneTag}>
                    <Text style={styles.geneTagText}>{finding.gene}</Text>
                  </View>
                  {!!finding.category && (
                    <Badge label={finding.category} variant="default" />
                  )}
                </View>

                {!!finding.variant && (
                  <Text style={styles.variantText}>{finding.variant}</Text>
                )}
                {!!finding.interpretation && (
                  <Text style={styles.interpretation}>
                    {finding.interpretation}
                  </Text>
                )}

                {!!finding.impact && (
                  <View style={styles.impactBox}>
                    <Text style={styles.impactLabel}>Action</Text>
                    <Text style={styles.impactText}>{finding.impact}</Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Results Pending</Text>
            <Text style={styles.pendingText}>
              Your genetic report has been received and is awaiting review by
              your care team. Detailed findings will appear here once
              processed.
            </Text>
          </Card>
        )}

        {/* Upload Button */}
        <Button
          title="Upload Genetic Report"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={uploadGeneticReport}
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

  /* Profile */
  profileProvider: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  profileLab: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },

  /* Findings */
  findingCard: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  findingBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  findingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  geneTag: {
    backgroundColor: Colors.gold,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  geneTagText: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.dark,
    letterSpacing: 0.5,
  },
  variantText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  interpretation: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },
  impactBox: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    gap: 2,
  },
  impactLabel: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  impactText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },
  pendingText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
