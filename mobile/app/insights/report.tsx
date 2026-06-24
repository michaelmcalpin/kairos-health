/**
 * Report detail view — displays a full AI-generated health report.
 *
 * Shows executive summary, key findings, recommendations,
 * data sources, and share / download actions.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Heart,
  TrendingDown,
  Activity,
  Pill,
  ShieldCheck,
  AlertTriangle,
  ArrowDownCircle,
  Share2,
  Download,
  FlaskConical,
  Footprints,
  Moon,
  Droplets,
  CheckCircle2,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Sample report data                                                 */
/* ------------------------------------------------------------------ */

const REPORT = {
  title: "Cardiovascular Risk Assessment",
  date: "June 3, 2026",
  executiveSummary:
    "Your cardiovascular health profile has shown meaningful improvement over the past quarter. The combination of optimized statin therapy, structured exercise, and dietary changes has contributed to a significant reduction in your Framingham risk score from 8.2% to 6.7%. While apolipoprotein B and LDL-P levels are trending favorably, there remains room for improvement in HDL function and triglyceride management.",
  keyFindings: [
    {
      id: "f1",
      icon: TrendingDown,
      title: "Framingham Risk Score Decreased",
      description:
        "10-year ASCVD risk dropped from 8.2% to 6.7%, moving you closer to the optimal range below 5%.",
      variant: "success" as const,
    },
    {
      id: "f2",
      icon: Heart,
      title: "ApoB Trending Favorably",
      description:
        "Apolipoprotein B decreased from 98 mg/dL to 82 mg/dL, now within the recommended target of < 90 mg/dL.",
      variant: "success" as const,
    },
    {
      id: "f3",
      icon: AlertTriangle,
      title: "Triglycerides Above Optimal",
      description:
        "Fasting triglycerides remain at 162 mg/dL. Target is < 100 mg/dL for optimal cardiovascular protection.",
      variant: "warning" as const,
    },
    {
      id: "f4",
      icon: Activity,
      title: "VO2 Max Improvement",
      description:
        "Estimated VO2 max improved from 38.2 to 41.6 mL/kg/min, correlating with reduced all-cause mortality risk.",
      variant: "info" as const,
    },
  ],
  recommendations: [
    {
      id: "r1",
      priority: "High",
      title: "Optimize Triglyceride Management",
      description:
        "Consider adding omega-3 fatty acid supplementation (EPA 2g/day) and reducing refined carbohydrate intake to address elevated triglycerides.",
    },
    {
      id: "r2",
      priority: "High",
      title: "Continue Current Statin Protocol",
      description:
        "Rosuvastatin 10mg is effectively lowering ApoB. Maintain current dosage and recheck lipid panel in 8 weeks.",
    },
    {
      id: "r3",
      priority: "Medium",
      title: "Increase Zone 2 Training Volume",
      description:
        "Add 30 minutes of Zone 2 cardio per week to continue VO2 max trajectory. Current 150 min/week is good; target 180 min/week.",
    },
    {
      id: "r4",
      priority: "Low",
      title: "Schedule Coronary Calcium Score",
      description:
        "Given family history, a baseline CAC score would provide additional risk stratification data. Discuss with your cardiologist at next visit.",
    },
  ],
  dataSources: [
    { icon: FlaskConical, label: "Blood panel — June 1, 2026" },
    { icon: Activity, label: "Continuous heart rate — 90 days" },
    { icon: Footprints, label: "Activity & step data — 90 days" },
    { icon: Moon, label: "Sleep metrics — 90 days" },
    { icon: Droplets, label: "Blood pressure readings — 42 entries" },
    { icon: Pill, label: "Medication adherence log" },
  ],
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: Colors.dangerMuted, text: Colors.danger },
  Medium: { bg: Colors.warningMuted, text: Colors.warning },
  Low: { bg: Colors.infoMuted, text: Colors.info },
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Title ---- */}
        <Text style={styles.reportTitle}>{REPORT.title}</Text>
        <Text style={styles.reportDate}>
          Generated {REPORT.date} by Insight Sherpa
        </Text>

        {/* ---- Executive Summary ---- */}
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>{REPORT.executiveSummary}</Text>
        </Card>

        {/* ---- Key Findings ---- */}
        <Text style={styles.sectionTitle}>Key Findings</Text>
        {REPORT.keyFindings.map((finding) => {
          const Icon = finding.icon;
          return (
            <Card key={finding.id} style={styles.findingCard}>
              <View style={styles.findingHeader}>
                <View style={styles.findingIconWrap}>
                  <Icon size={18} color={Colors.gold} />
                </View>
                <View style={styles.findingMeta}>
                  <Text style={styles.findingTitle}>{finding.title}</Text>
                  <Badge label={finding.variant} variant={finding.variant} />
                </View>
              </View>
              <Text style={styles.findingDesc}>{finding.description}</Text>
            </Card>
          );
        })}

        {/* ---- Recommendations ---- */}
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {REPORT.recommendations.map((rec, idx) => {
          const priority = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS.Low;
          return (
            <Card key={rec.id} style={styles.recCard}>
              <View style={styles.recHeader}>
                <View
                  style={[styles.recPriority, { backgroundColor: priority.bg }]}
                >
                  <Text style={[styles.recPriorityText, { color: priority.text }]}>
                    {rec.priority}
                  </Text>
                </View>
                <Text style={styles.recNumber}>#{idx + 1}</Text>
              </View>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDesc}>{rec.description}</Text>
            </Card>
          );
        })}

        {/* ---- Data Sources ---- */}
        <Text style={styles.sectionTitle}>Data Sources Used</Text>
        <Card style={styles.sourcesCard}>
          {REPORT.dataSources.map((src, idx) => {
            const Icon = src.icon;
            return (
              <View
                key={idx}
                style={[
                  styles.sourceRow,
                  idx < REPORT.dataSources.length - 1 && styles.sourceRowBorder,
                ]}
              >
                <Icon size={16} color={Colors.silver} />
                <Text style={styles.sourceLabel}>{src.label}</Text>
              </View>
            );
          })}
        </Card>

        {/* ---- Actions ---- */}
        <View style={styles.actions}>
          <Button
            title="Share Report"
            variant="secondary"
            onPress={() => {}}
            icon={<Share2 size={16} color={Colors.gold} />}
            style={styles.actionBtn}
          />
          <Button
            title="Download PDF"
            variant="primary"
            onPress={() => {}}
            icon={<Download size={16} color={Colors.dark} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
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
  },

  /* Title */
  reportTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  reportDate: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginBottom: Spacing.lg,
  },

  /* Section title */
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.white,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  /* Executive summary */
  summaryCard: {
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    lineHeight: 22,
  },

  /* Key findings */
  findingCard: {
    marginBottom: Spacing.sm,
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  findingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  findingMeta: {
    flex: 1,
    gap: Spacing.xs,
  },
  findingTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  findingDesc: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Recommendations */
  recCard: {
    marginBottom: Spacing.sm,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  recPriority: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  recPriorityText: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recNumber: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  recTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  recDesc: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },

  /* Data sources */
  sourcesCard: {
    marginBottom: Spacing.md,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
  },
  sourceRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sourceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
