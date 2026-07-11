/**
 * Report detail view — displays health insights from the backend.
 *
 * Fetches real data via insights.getAll. Shows insights, recommendations,
 * and an honest empty state when no data is available.
 * No dedicated report endpoint exists; this uses the insights API.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Share2,
  FileText,
  Info,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { useHealthAnalysis } from "@/hooks/useInsights";

/* ------------------------------------------------------------------ */
/* Severity mapping                                                    */
/* ------------------------------------------------------------------ */

const SEVERITY_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  positive: "success",
  attention: "warning",
  warning: "danger",
  neutral: "info",
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: Colors.dangerMuted, text: Colors.danger },
  medium: { bg: Colors.warningMuted, text: Colors.warning },
  low: { bg: Colors.infoMuted, text: Colors.info },
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportScreen() {
  const { analysis, isLoading, error } = useHealthAnalysis("overall", "30d");

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading health insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis || (analysis.insights.length === 0 && analysis.recommendations.length === 0)) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.emptyState}>
          <FileText size={48} color={Colors.silver} />
          <Text style={styles.emptyTitle}>No report data available</Text>
          <Text style={styles.emptyMessage}>
            Health reports are generated from your tracked data.
            Continue logging check-ins, connecting wearables, and uploading
            lab results to unlock detailed reports.
          </Text>
          <Text style={styles.emptyHint}>
            Detailed reports with PDF export are available in the web dashboard at app.everist.ai
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const reportDate = analysis.generatedAt
    ? new Date(analysis.generatedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Title ---- */}
        <Text style={styles.reportTitle}>{analysis.title}</Text>
        <Text style={styles.reportDate}>
          Generated {reportDate}
        </Text>

        {/* ---- Summary ---- */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
        </Card>

        {/* ---- Insights ---- */}
        {analysis.insights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Key Findings</Text>
            {analysis.insights.map((insight) => {
              const variant = SEVERITY_VARIANT[insight.severity] ?? "default";
              return (
                <Card key={insight.id} style={styles.findingCard}>
                  <View style={styles.findingHeader}>
                    <View style={styles.findingIconWrap}>
                      <Activity size={18} color={Colors.gold} />
                    </View>
                    <View style={styles.findingMeta}>
                      <Text style={styles.findingTitle}>{insight.title}</Text>
                      <Badge label={insight.severity} variant={variant} />
                    </View>
                  </View>
                  <Text style={styles.findingDesc}>{insight.description}</Text>
                  {insight.metric && insight.value && (
                    <Text style={styles.findingMetric}>
                      {insight.metric}: {insight.value}
                    </Text>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* ---- Recommendations ---- */}
        {analysis.recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {analysis.recommendations.map((rec, idx) => {
              const priority = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS.low;
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
          </>
        )}

        {/* ---- Actions ---- */}
        <View style={styles.actions}>
          <Button
            title="Share Report"
            variant="secondary"
            onPress={() => Alert.alert("Share", "Report sharing will be available in a future update.")}
            icon={<Share2 size={16} color={Colors.gold} />}
            style={styles.actionBtn}
          />
        </View>

        {/* ---- Web Dashboard Note ---- */}
        <Card style={styles.webNote}>
          <View style={styles.webNoteHeader}>
            <Info size={16} color={Colors.gold} />
            <Text style={styles.webNoteTitle}>Full Reports</Text>
          </View>
          <Text style={styles.webNoteText}>
            Detailed health reports with PDF export, data source citations,
            and cardiovascular risk assessments are available in the
            Everist web dashboard.
          </Text>
        </Card>
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

  /* Loading */
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.silver,
    fontSize: FontSizes.md,
  },

  /* Empty state */
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyMessage: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyHint: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
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

  /* Summary */
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
  findingMetric: {
    fontSize: FontSizes.xs,
    color: Colors.goldLight,
    fontWeight: "600",
    marginTop: Spacing.xs,
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

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
  },

  /* Web Dashboard Note */
  webNote: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  webNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  webNoteTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
  },
  webNoteText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },
});
