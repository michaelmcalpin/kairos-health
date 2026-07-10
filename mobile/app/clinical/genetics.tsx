/**
 * Genetics screen — genetic profile summary, key findings, and risk factors.
 *
 * tRPC paths used (under `clientPortal`):
 *   - genetics.getProfile   -> profile summary + markers (used to build findings + risk factors)
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
import type { StatusVariant } from "@/lib/types";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Sample data (fallback when API is unreachable)                      */
/* ------------------------------------------------------------------ */

const SAMPLE_PROFILE = {
  provider: "Whole Genome Sequencing",
  lab: "Nebula Genomics",
  date: "Feb 14, 2026",
  variants: 42,
  actionable: 8,
};

interface GeneticFinding {
  gene: string;
  variant: string;
  interpretation: string;
  impact: string;
  category: string;
}

const SAMPLE_KEY_FINDINGS: GeneticFinding[] = [
  {
    gene: "MTHFR",
    variant: "Heterozygous C677T",
    interpretation: "Reduced methylation capacity (~35% reduction in enzyme activity)",
    impact: "Use methylated B vitamins (methylfolate, methylcobalamin)",
    category: "Methylation",
  },
  {
    gene: "APOE",
    variant: "3/3 (Wild Type)",
    interpretation: "Normal cardiovascular and neurological risk baseline",
    impact: "Standard dietary recommendations apply",
    category: "Cardiovascular",
  },
  {
    gene: "COMT",
    variant: "Val/Met (Intermediate)",
    interpretation: "Moderate dopamine clearance rate",
    impact: "Balanced stress response; may benefit from magnesium",
    category: "Neurotransmitter",
  },
];

interface RiskFactor {
  name: string;
  risk: "low" | "moderate" | "elevated" | "high";
  percentile: string;
  details: string;
}

const riskToVariant: Record<RiskFactor["risk"], StatusVariant> = {
  low: "success",
  moderate: "info",
  elevated: "warning",
  high: "danger",
};

const SAMPLE_RISK_FACTORS: RiskFactor[] = [
  {
    name: "Type 2 Diabetes",
    risk: "moderate",
    percentile: "42nd percentile",
    details: "Slight increase based on TCF7L2 variant; mitigated by current lifestyle",
  },
  {
    name: "Cardiovascular Disease",
    risk: "low",
    percentile: "28th percentile",
    details: "APOE 3/3 with favorable lipid genetics; no FH variants detected",
  },
  {
    name: "Alzheimer's Disease",
    risk: "low",
    percentile: "22nd percentile",
    details: "APOE 3/3 — population average risk; no TREM2 variants",
  },
  {
    name: "Inflammatory Response",
    risk: "elevated",
    percentile: "71st percentile",
    details: "IL-6 promoter variant associated with higher baseline inflammation",
  },
  {
    name: "Caffeine Metabolism",
    risk: "low",
    percentile: "Fast metabolizer",
    details: "CYP1A2 *1A/*1A — rapid caffeine clearance; normal consumption safe",
  },
  {
    name: "Vitamin D Synthesis",
    risk: "moderate",
    percentile: "55th percentile",
    details: "VDR and GC gene variants reduce conversion efficiency; supplement recommended",
  },
];

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

  // Map API response → local shapes, falling back to sample data.
  // Backend returns: { id, uploadType, status, createdAt, markers: [...] } | null
  const apiData = query.data as any;

  // Use markers from the dedicated markers query, then fall back to profile markers, then sample data
  const markersData = (markersQuery.data ?? []) as any[];
  const allMarkers = markersData.length > 0 ? markersData : (apiData?.markers ?? []);

  const PROFILE = apiData
    ? {
        provider: apiData.uploadType ?? SAMPLE_PROFILE.provider,
        lab: SAMPLE_PROFILE.lab,
        date: apiData.createdAt
          ? new Date(apiData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : SAMPLE_PROFILE.date,
        variants: allMarkers.length || SAMPLE_PROFILE.variants,
        actionable: allMarkers.filter((m: any) => m.clinicalPriority === "high").length || SAMPLE_PROFILE.actionable,
      }
    : SAMPLE_PROFILE;

  const KEY_FINDINGS: GeneticFinding[] = allMarkers.length > 0
    ? (allMarkers as any[]).slice(0, 6).map((m: any) => ({
        gene: m.gene ?? "",
        variant: m.mutation ?? m.rsId ?? "",
        interpretation: m.function ?? "",
        impact: m.supplementProtocol ?? m.dietStrategy ?? m.lifestyleStrategy ?? "",
        category: m.pathway ?? m.section ?? "",
      }))
    : SAMPLE_KEY_FINDINGS;

  // Risk factors are not directly provided by the API — use sample data
  const RISK_FACTORS: RiskFactor[] = SAMPLE_RISK_FACTORS;

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

          <Text style={styles.profileProvider}>{PROFILE.provider}</Text>
          <Text style={styles.profileLab}>
            {PROFILE.lab} &middot; {PROFILE.date}
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PROFILE.variants}</Text>
              <Text style={styles.statLabel}>Variants Analyzed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.gold }]}>
                {PROFILE.actionable}
              </Text>
              <Text style={styles.statLabel}>Actionable Findings</Text>
            </View>
          </View>
        </Card>

        {/* Key Findings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Key Findings</Text>

          {KEY_FINDINGS.map((finding, idx) => (
            <View
              key={idx}
              style={[
                styles.findingCard,
                idx < KEY_FINDINGS.length - 1 && styles.findingBorder,
              ]}
            >
              <View style={styles.findingHeader}>
                <View style={styles.geneTag}>
                  <Text style={styles.geneTagText}>{finding.gene}</Text>
                </View>
                <Badge label={finding.category} variant="default" />
              </View>

              <Text style={styles.variantText}>{finding.variant}</Text>
              <Text style={styles.interpretation}>
                {finding.interpretation}
              </Text>

              <View style={styles.impactBox}>
                <Text style={styles.impactLabel}>Action</Text>
                <Text style={styles.impactText}>{finding.impact}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Risk Factors */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Factors</Text>

          {RISK_FACTORS.map((risk, idx) => (
            <View
              key={idx}
              style={[
                styles.riskRow,
                idx < RISK_FACTORS.length - 1 && styles.riskBorder,
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.riskName}>{risk.name}</Text>
                <Badge
                  label={risk.risk}
                  variant={riskToVariant[risk.risk]}
                />
              </View>
              <Text style={styles.riskPercentile}>{risk.percentile}</Text>
              <Text style={styles.riskDetails}>{risk.details}</Text>
            </View>
          ))}
        </Card>

        {/* Upload Button */}
        <Button
          title="Upload Genetic Report"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={() => Alert.alert("Upload Genetic Report", "Upload functionality coming soon. Your coach can also upload genetic reports on your behalf.")}
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

  /* Risks */
  riskRow: {
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  riskBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  riskName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  riskPercentile: {
    fontSize: FontSizes.sm,
    color: Colors.goldLight,
  },
  riskDetails: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
