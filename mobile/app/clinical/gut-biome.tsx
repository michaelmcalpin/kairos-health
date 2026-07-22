/**
 * Gut Biome Results screen — overall health score, diversity index,
 * bacterial phyla breakdown, key findings, and dietary recommendations.
 *
 * tRPC paths used (under `clientPortal`):
 *   - clinicalDocs.list({ docType: "gut_biome" })  -> list of gut biome docs with parsedData
 *
 * Renders only real data from the backend. When no report has been
 * uploaded yet (or the query fails) an honest empty/error state is
 * shown instead of fabricated values.
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
import type { StatusVariant } from "@/lib/types";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { showImagePickerOptions } from "@/lib/image-picker";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PhylumData {
  name: string;
  percentage: number;
  color: string;
}

interface KeyFinding {
  organism: string;
  status: string;
  variant: StatusVariant;
  note: string;
}

interface Recommendation {
  category: string;
  items: string[];
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Score Ring Component                                                 */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100;
  let ringColor: string = Colors.success;
  if (percentage < 50) ringColor = Colors.danger;
  else if (percentage < 70) ringColor = Colors.warning;

  return (
    <View style={scoreStyles.container}>
      <View style={scoreStyles.ring}>
        <View style={scoreStyles.trackRing} />
        <View
          style={[scoreStyles.progressRing, { borderColor: ringColor }]}
        />
        <View style={scoreStyles.center}>
          <Text style={scoreStyles.scoreValue}>{score}</Text>
          <Text style={scoreStyles.scoreMax}>/ {maxScore}</Text>
        </View>
      </View>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  ring: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  trackRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: Colors.navyLight,
  },
  progressRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    transform: [{ rotate: "-90deg" }],
  },
  center: {
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.white,
  },
  scoreMax: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
});

/* ------------------------------------------------------------------ */
/* Upload flow (shared by empty state CTA and bottom button)           */
/* ------------------------------------------------------------------ */

function useUploadGutBiome() {
  const createDoc = trpc.clientPortal.clinicalDocs.create.useMutation();

  return async () => {
    const image = await showImagePickerOptions();
    if (!image) return;
    try {
      await new Promise<void>((resolve, reject) => {
        createDoc.mutate(
          {
            docType: "gut_biome",
            title: `Gut Biome Report - ${new Date().toLocaleDateString()}`,
            sourceFileName: image.fileName ?? `gut_biome_${Date.now()}.jpg`,
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
        "Your gut biome report has been submitted. It will be reviewed by your care team within 24-48 hours.",
      );
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message ?? "Your report could not be uploaded. Please try again later.",
      );
    }
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function GutBiomeScreen() {
  // ── tRPC query ──────────────────────────────────────────────────
  const query = trpc.clientPortal.clinicalDocs.list.useQuery(
    { docType: "gut_biome" },
    DEFAULT_QUERY_OPTIONS,
  );
  const uploadGutBiome = useUploadGutBiome();

  const docs = (query.data ?? []) as any[];
  const latest = docs[0]; // already sorted by createdAt DESC
  const parsed = latest?.parsedData as Record<string, any> | null | undefined;

  // ── Loading state ───────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Gut Biome" }} />
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
        <Stack.Screen options={{ title: "Gut Biome" }} />
        <ErrorView
          title="Couldn't load gut biome results"
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
        <Stack.Screen options={{ title: "Gut Biome" }} />
        <View style={styles.center}>
          <EmptyState
            icon="document"
            title="No gut biome results yet"
            message="Upload a microbiome report (e.g. Viome) and your care team will review it and add the results here."
            actionLabel="Upload a report"
            onAction={uploadGutBiome}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Real data mapping (no fabricated fallbacks) ─────────────────
  const testDate = formatDate(latest.reportDate) ?? formatDate(latest.createdAt);
  const provider = latest.providerName ?? null;

  const score =
    parsed?.score && parsed.score.overall != null
      ? {
          overall: Number(parsed.score.overall),
          maxScore: Number(parsed.score.maxScore ?? 100),
        }
      : null;

  const scoreVariant: StatusVariant =
    score === null
      ? "default"
      : (score.overall / score.maxScore) * 100 >= 70
        ? "success"
        : (score.overall / score.maxScore) * 100 >= 50
          ? "warning"
          : "danger";
  const scoreLabel =
    score === null
      ? ""
      : (score.overall / score.maxScore) * 100 >= 70
        ? "Good"
        : (score.overall / score.maxScore) * 100 >= 50
          ? "Fair"
          : "Poor";

  const diversity =
    parsed?.diversity && parsed.diversity.shannonIndex != null
      ? {
          shannonIndex: Number(parsed.diversity.shannonIndex),
          rating: (parsed.diversity.rating ?? null) as string | null,
        }
      : null;

  const phylaColorMap: Record<string, string> = {
    Firmicutes: Colors.info,
    Bacteroidetes: Colors.success,
    Proteobacteria: Colors.warning,
  };

  const phyla: PhylumData[] = Array.isArray(parsed?.phyla)
    ? (parsed!.phyla as any[]).map((p: any) => ({
        name: p.name ?? "",
        percentage: p.percentage ?? 0,
        color: phylaColorMap[p.name] ?? Colors.silver,
      }))
    : [];

  const variantMap: Record<string, StatusVariant> = {
    optimal: "success",
    low: "warning",
    normal: "info",
    high: "danger",
  };

  const findings: KeyFinding[] = Array.isArray(parsed?.findings)
    ? (parsed!.findings as any[]).map((f: any) => ({
        organism: f.organism ?? "",
        status: f.status ?? "",
        variant: (variantMap[(f.status ?? "").toLowerCase()] ?? "info") as StatusVariant,
        note: f.note ?? "",
      }))
    : [];

  const recommendations: Recommendation[] = Array.isArray(parsed?.recommendations)
    ? (parsed!.recommendations as any[]).map((r: any) => ({
        category: r.category ?? "",
        items: r.items ?? [],
      }))
    : [];

  const hasParsedResults =
    score !== null ||
    diversity !== null ||
    phyla.length > 0 ||
    findings.length > 0 ||
    recommendations.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Gut Biome" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Most Recent Report */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Most Recent Report</Text>
          <View style={styles.testMeta}>
            {testDate && <Text style={styles.metaText}>Test Date: {testDate}</Text>}
            {provider && <Text style={styles.metaText}>Provider: {provider}</Text>}
          </View>
        </Card>

        {/* Awaiting review — document uploaded but no parsed results yet */}
        {!hasParsedResults && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Results Pending</Text>
            <Text style={styles.pendingText}>
              Your gut biome report has been received and is awaiting review by
              your care team. Detailed results will appear here once processed.
            </Text>
          </Card>
        )}

        {/* Overall Score */}
        {score && (
          <Card style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Overall Gut Health</Text>
              <Badge label={scoreLabel} variant={scoreVariant} />
            </View>

            <ScoreRing score={score.overall} maxScore={score.maxScore} />
          </Card>
        )}

        {/* Diversity Index */}
        {diversity && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Diversity Index</Text>

            <View style={styles.diversityRow}>
              <View>
                <Text style={styles.diversityLabel}>Shannon Index</Text>
                <Text style={styles.diversityValue}>
                  {diversity.shannonIndex}
                </Text>
              </View>
              {diversity.rating && (
                <Badge
                  label={diversity.rating}
                  variant={
                    diversity.shannonIndex >= 3
                      ? "success"
                      : diversity.shannonIndex >= 2
                        ? "warning"
                        : "danger"
                  }
                />
              )}
            </View>

            {/* Diversity scale */}
            <View style={styles.scaleContainer}>
              <View style={styles.scaleTrack}>
                <View
                  style={[
                    styles.scaleMarker,
                    {
                      left: `${Math.min((diversity.shannonIndex / 5) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.scaleLabels}>
                <Text style={styles.scaleLabel}>0 (Low)</Text>
                <Text style={styles.scaleLabel}>2.5</Text>
                <Text style={styles.scaleLabel}>5.0 (High)</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Bacterial Phyla */}
        {phyla.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Top Bacterial Phyla</Text>

            {/* Stacked bar */}
            <View style={styles.phylaBar}>
              {phyla.map((phylum) => (
                <View
                  key={phylum.name}
                  style={[
                    styles.phylaSegment,
                    {
                      width: `${phylum.percentage}%`,
                      backgroundColor: phylum.color,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Labels */}
            {phyla.map((phylum) => (
              <View key={phylum.name} style={styles.phylaRow}>
                <View style={styles.phylaLabel}>
                  <View
                    style={[
                      styles.phylaDot,
                      { backgroundColor: phylum.color },
                    ]}
                  />
                  <Text style={styles.phylaName}>{phylum.name}</Text>
                </View>
                <Text style={styles.phylaPercent}>{phylum.percentage}%</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Key Findings */}
        {findings.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Key Findings</Text>

            {findings.map((finding, idx) => (
              <View
                key={finding.organism || idx}
                style={[
                  styles.findingRow,
                  idx < findings.length - 1 && styles.findingBorder,
                ]}
              >
                <View style={styles.findingHeader}>
                  <Text style={styles.findingOrganism}>
                    {finding.organism}
                  </Text>
                  <Badge label={finding.status} variant={finding.variant} />
                </View>
                {!!finding.note && (
                  <Text style={styles.findingNote}>{finding.note}</Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Dietary Recommendations */}
        {recommendations.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Recommendations</Text>

            {recommendations.map((rec) => (
              <View key={rec.category} style={styles.recGroup}>
                <Text style={styles.recCategory}>{rec.category}</Text>
                {rec.items.map((item, idx) => (
                  <View key={idx} style={styles.recItem}>
                    <Text style={styles.recBullet}>{"•"}</Text>
                    <Text style={styles.recText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Card>
        )}

        {/* Upload Button */}
        <Button
          title="Upload Gut Biome Report"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={uploadGutBiome}
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

  /* Test meta */
  testMeta: {
    gap: 2,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  pendingText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Diversity */
  diversityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diversityLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  diversityValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  scaleContainer: {
    gap: 6,
    marginTop: Spacing.xs,
  },
  scaleTrack: {
    height: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    position: "relative",
  },
  scaleMarker: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleLabel: {
    fontSize: 10,
    color: Colors.silver,
  },

  /* Phyla */
  phylaBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: Radii.full,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  phylaSegment: {
    height: "100%",
  },
  phylaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  phylaLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  phylaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phylaName: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },
  phylaPercent: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
  },

  /* Key findings */
  findingRow: {
    paddingVertical: Spacing.sm,
    gap: 6,
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
  findingOrganism: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
  },
  findingNote: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Recommendations */
  recGroup: {
    gap: 6,
    marginTop: Spacing.xs,
  },
  recCategory: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
  },
  recItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  recBullet: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
  },
  recText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    flex: 1,
    lineHeight: 20,
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
