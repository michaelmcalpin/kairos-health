/**
 * Gut Biome Results screen — overall health score, diversity index,
 * bacterial phyla breakdown, key findings, and dietary recommendations.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
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

const GUT_SCORE = {
  overall: 78,
  maxScore: 100,
  testDate: "Apr 22, 2026",
  provider: "Viome",
};

const DIVERSITY = {
  shannonIndex: 3.2,
  rating: "Good" as const,
};

interface PhylumData {
  name: string;
  percentage: number;
  color: string;
}

const PHYLA: PhylumData[] = [
  { name: "Firmicutes", percentage: 52, color: Colors.info },
  { name: "Bacteroidetes", percentage: 38, color: Colors.success },
  { name: "Proteobacteria", percentage: 6, color: Colors.warning },
  { name: "Others", percentage: 4, color: Colors.silver },
];

interface KeyFinding {
  organism: string;
  status: string;
  variant: StatusVariant;
  note: string;
}

const KEY_FINDINGS: KeyFinding[] = [
  {
    organism: "Akkermansia",
    status: "Optimal",
    variant: "success",
    note: "Supports gut barrier integrity and metabolic health.",
  },
  {
    organism: "Bifidobacterium",
    status: "Low",
    variant: "warning",
    note: "Supplement recommended. Consider probiotic with B. longum and B. breve strains.",
  },
  {
    organism: "Lactobacillus",
    status: "Normal",
    variant: "info",
    note: "Adequate levels supporting immune function and nutrient absorption.",
  },
  {
    organism: "F/B Ratio",
    status: "1.37 — Normal",
    variant: "info",
    note: "Firmicutes-to-Bacteroidetes ratio within healthy range (0.5–2.0).",
  },
];

interface Recommendation {
  category: string;
  items: string[];
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    category: "Increase",
    items: [
      "Fermented foods (kimchi, sauerkraut, kefir)",
      "Prebiotic fiber (chicory root, garlic, onions)",
      "Polyphenol-rich foods (blueberries, dark chocolate)",
    ],
  },
  {
    category: "Reduce",
    items: [
      "Refined sugars and artificial sweeteners",
      "Processed seed oils",
    ],
  },
  {
    category: "Supplements",
    items: [
      "Bifidobacterium probiotic (10B CFU daily)",
      "Butyrate supplement (300mg, 2x daily)",
      "L-Glutamine (5g daily for gut lining support)",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Score Ring Component                                                 */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100;
  let ringColor = Colors.success;
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
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function GutBiomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Gut Biome" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Score */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Overall Gut Health</Text>
            <Badge label="Good" variant="success" />
          </View>

          <ScoreRing
            score={GUT_SCORE.overall}
            maxScore={GUT_SCORE.maxScore}
          />

          <View style={styles.testMeta}>
            <Text style={styles.metaText}>
              Test Date: {GUT_SCORE.testDate}
            </Text>
            <Text style={styles.metaText}>
              Provider: {GUT_SCORE.provider}
            </Text>
          </View>
        </Card>

        {/* Diversity Index */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Diversity Index</Text>

          <View style={styles.diversityRow}>
            <View>
              <Text style={styles.diversityLabel}>Shannon Index</Text>
              <Text style={styles.diversityValue}>
                {DIVERSITY.shannonIndex}
              </Text>
            </View>
            <Badge label={DIVERSITY.rating} variant="success" />
          </View>

          {/* Diversity scale */}
          <View style={styles.scaleContainer}>
            <View style={styles.scaleTrack}>
              <View
                style={[
                  styles.scaleMarker,
                  {
                    left: `${(DIVERSITY.shannonIndex / 5) * 100}%`,
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

        {/* Bacterial Phyla */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Top Bacterial Phyla</Text>

          {/* Stacked bar */}
          <View style={styles.phylaBar}>
            {PHYLA.map((phylum) => (
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
          {PHYLA.map((phylum) => (
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

        {/* Key Findings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Key Findings</Text>

          {KEY_FINDINGS.map((finding, idx) => (
            <View
              key={finding.organism}
              style={[
                styles.findingRow,
                idx < KEY_FINDINGS.length - 1 && styles.findingBorder,
              ]}
            >
              <View style={styles.findingHeader}>
                <Text style={styles.findingOrganism}>
                  {finding.organism}
                </Text>
                <Badge label={finding.status} variant={finding.variant} />
              </View>
              <Text style={styles.findingNote}>{finding.note}</Text>
            </View>
          ))}
        </Card>

        {/* Dietary Recommendations */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Recommendations</Text>

          {RECOMMENDATIONS.map((rec) => (
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

        {/* Upload Button */}
        <Button
          title="Upload Viome Report"
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

  /* Test meta */
  testMeta: {
    gap: 2,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
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
