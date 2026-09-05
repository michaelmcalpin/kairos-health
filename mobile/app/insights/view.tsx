/**
 * AI report viewer — renders a structured report saved by /api/reports/generate.
 * Mirrors the web ReportViewer (scores, sections, risks, strengths, action plan)
 * in a mobile-native layout.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import type { ReportData } from "@/lib/reports";

function Score({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreValue, { color: color ?? Colors.gold }]}>{value}</Text>
      <View>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreOutOf}>out of 100</Text>
      </View>
    </View>
  );
}

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {children}
    </View>
  );
}

export default function ReportViewScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const query = trpc.clientPortal.reports.getByType.useQuery(
    { reportType: type ?? "" },
    { ...DEFAULT_QUERY_OPTIONS, enabled: !!type },
  );

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading report…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const report = query.data?.reportData as ReportData | undefined;
  if (!report) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Report not found</Text>
          <Text style={styles.emptyText}>Generate it again from the Insight Sherpa screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const actionPlan = (report.actionPlan ?? report.prioritizedActions) as ReportData[] | undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Sparkles size={13} color={Colors.gold} />
          <Text style={styles.badgeText}>AI-generated report</Text>
        </View>
        <Text style={styles.title}>{report.title}</Text>
        {report.generatedAt ? (
          <Text style={styles.date}>Generated {new Date(report.generatedAt).toLocaleString()}</Text>
        ) : null}

        {/* Summary */}
        {report.summary ? (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </Card>
        ) : null}

        {/* Scores */}
        {report.overallScore != null && (
          <Card style={styles.card}><Score value={report.overallScore} label="Overall Health Score" /></Card>
        )}
        {report.metabolicScore != null && (
          <Card style={styles.card}><Score value={report.metabolicScore} label="Metabolic Score" color={Colors.warning} /></Card>
        )}
        {report.recoveryScore != null && (
          <Card style={styles.card}><Score value={report.recoveryScore} label="Recovery Score" color={Colors.info} /></Card>
        )}
        {report.alignmentScore != null && (
          <Card style={styles.card}><Score value={report.alignmentScore} label="Protocol Alignment" color={Colors.success} /></Card>
        )}

        {/* Health Age */}
        {report.healthAge && (
          <SectionBlock label="Health Age">
            <Card style={styles.card}>
              <View style={styles.ageRow}>
                <View style={styles.ageItem}>
                  <Text style={styles.ageValue}>{report.healthAge.biologicalAge}</Text>
                  <Text style={styles.ageLabel}>Biological</Text>
                </View>
                <View style={styles.ageItem}>
                  <Text style={[styles.ageValue, { color: Colors.silver }]}>{report.healthAge.chronologicalAge}</Text>
                  <Text style={styles.ageLabel}>Chronological</Text>
                </View>
                <View style={styles.ageItem}>
                  <Text style={[styles.ageValue, { color: report.healthAge.delta <= 0 ? Colors.success : Colors.danger }]}>
                    {report.healthAge.delta > 0 ? `+${report.healthAge.delta}` : report.healthAge.delta}y
                  </Text>
                  <Text style={styles.ageLabel}>Difference</Text>
                </View>
              </View>
              {report.healthAge.interpretation ? (
                <Text style={styles.bodyText}>{report.healthAge.interpretation}</Text>
              ) : null}
            </Card>
          </SectionBlock>
        )}

        {/* Domain scores */}
        {Array.isArray(report.domainScores) && report.domainScores.length > 0 && (
          <SectionBlock label="Domain Breakdown">
            {report.domainScores.map((d: ReportData, i: number) => (
              <Card key={i} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{d.domain}</Text>
                  <Text style={styles.rowScore}>{d.score}/100</Text>
                </View>
                {d.keyFindings?.[0] ? <Text style={styles.mutedText}>{d.keyFindings[0]}</Text> : null}
              </Card>
            ))}
          </SectionBlock>
        )}

        {/* Sections */}
        {Array.isArray(report.sections) && report.sections.length > 0 && (
          <SectionBlock label="Detailed Analysis">
            {report.sections.map((s: ReportData, i: number) => (
              <Card key={i} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{s.title}</Text>
                  {s.score != null ? <Text style={styles.rowScore}>{s.score}/100</Text> : null}
                </View>
                {s.summary ? <Text style={styles.bodyText}>{s.summary}</Text> : null}
                {Array.isArray(s.recommendations) && s.recommendations.map((r: string, ri: number) => (
                  <Text key={ri} style={styles.bullet}>• {r}</Text>
                ))}
              </Card>
            ))}
          </SectionBlock>
        )}

        {/* Top risks */}
        {Array.isArray(report.topRisks) && report.topRisks.length > 0 && (
          <SectionBlock label="Top Risks">
            {report.topRisks.map((r: ReportData, i: number) => (
              <Card key={i} style={[styles.rowCard, styles.riskCard]}>
                <View style={styles.iconRow}>
                  <AlertTriangle size={14} color={Colors.danger} />
                  <Text style={styles.rowTitle}>{r.risk}</Text>
                </View>
                {r.mitigation ? <Text style={styles.mutedText}>Mitigation: {r.mitigation}</Text> : null}
              </Card>
            ))}
          </SectionBlock>
        )}

        {/* Strengths */}
        {Array.isArray(report.topStrengths) && report.topStrengths.length > 0 && (
          <SectionBlock label="Strengths">
            {report.topStrengths.map((s: ReportData, i: number) => (
              <Card key={i} style={[styles.rowCard, styles.strengthCard]}>
                <View style={styles.iconRow}>
                  <CheckCircle2 size={14} color={Colors.success} />
                  <Text style={styles.rowTitle}>{s.strength}</Text>
                </View>
                {s.impact ? <Text style={styles.mutedText}>{s.impact}</Text> : null}
              </Card>
            ))}
          </SectionBlock>
        )}

        {/* Action plan */}
        {Array.isArray(actionPlan) && actionPlan.length > 0 && (
          <SectionBlock label="Action Plan">
            {actionPlan.map((a: ReportData, i: number) => (
              <Card key={i} style={styles.rowCard}>
                <View style={styles.iconRow}>
                  <View style={styles.priorityDot}>
                    <Text style={styles.priorityNum}>{a.priority}</Text>
                  </View>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{a.action}</Text>
                </View>
                <Text style={styles.mutedText}>
                  {[a.category, (a.timeframe ?? a.effort)?.toString().replace(/_/g, " ")].filter(Boolean).join(" · ")}
                </Text>
              </Card>
            ))}
          </SectionBlock>
        )}

        <Text style={styles.disclaimer}>
          This AI-generated report is for informational purposes only and does not replace professional
          medical advice. Discuss changes with your healthcare provider or Everist coach.
        </Text>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg, gap: Spacing.sm },
  loadingText: { color: Colors.silver, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  emptyTitle: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: "700" },
  emptyText: { color: Colors.silver, fontSize: FontSizes.sm, textAlign: "center" },

  badge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  badgeText: { color: Colors.gold, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: "800" },
  date: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 2, marginBottom: Spacing.md },

  summaryCard: { marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  summaryText: { color: Colors.white, fontSize: FontSizes.sm, lineHeight: 21 },

  card: { marginBottom: Spacing.sm },
  section: { marginTop: Spacing.md },
  sectionTitle: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: "700", marginBottom: Spacing.sm },

  scoreRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  scoreValue: { fontSize: 40, fontWeight: "800" },
  scoreLabel: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "600" },
  scoreOutOf: { color: Colors.silver, fontSize: FontSizes.xs },

  ageRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  ageItem: { alignItems: "center", flex: 1 },
  ageValue: { color: Colors.gold, fontSize: FontSizes.xxl, fontWeight: "800" },
  ageLabel: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 2 },

  rowCard: { marginBottom: Spacing.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitle: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "600" },
  rowScore: { color: Colors.gold, fontSize: FontSizes.sm, fontWeight: "700" },
  bodyText: { color: Colors.silver, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 4 },
  mutedText: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 4 },
  bullet: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 4, lineHeight: 18 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  riskCard: { borderLeftWidth: 3, borderLeftColor: Colors.danger },
  strengthCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  priorityDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(212,175,55,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  priorityNum: { color: Colors.gold, fontSize: 11, fontWeight: "700" },

  disclaimer: { color: Colors.silver, fontSize: 10, lineHeight: 15, marginTop: Spacing.lg, opacity: 0.7 },
});
