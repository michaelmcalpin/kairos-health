/**
 * Health Analysis -- interactive AI-driven health analysis screen.
 *
 * Users pick an analysis type and data scope, then tap "Analyze"
 * to see a pre-populated set of findings, risk factors, and recommendations.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useHealthAnalysis } from "@/hooks";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Sparkles,
  Heart,
  Activity,
  Moon,
  Apple,
  Dumbbell,
  Brain,
  TrendingUp,
  Droplets,
  Flame,
  ChevronDown,
  ChevronUp,
  Send,
  MessageCircle,
  Database,
  Shield,
  Target,
  Zap,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnalysisChips } from "@/components/insights/AnalysisChips";
import { ScoreGauge } from "@/components/insights/ScoreGauge";
import { FindingCard } from "@/components/insights/FindingCard";
import { RiskBar } from "@/components/insights/RiskBar";
import { RecommendationItem } from "@/components/insights/RecommendationItem";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

import type { RiskLevel } from "@/components/insights/RiskBar";
import type { StatusVariant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Analysis types                                                      */
/* ------------------------------------------------------------------ */

const ANALYSIS_TYPES = [
  { id: "full", label: "Full Analysis", icon: <Brain size={14} color={Colors.gold} /> },
  { id: "cardio", label: "Cardiovascular", icon: <Heart size={14} color={Colors.gold} /> },
  { id: "metabolic", label: "Metabolic", icon: <Activity size={14} color={Colors.gold} /> },
  { id: "sleep", label: "Sleep & Recovery", icon: <Moon size={14} color={Colors.gold} /> },
  { id: "nutrition", label: "Nutrition", icon: <Apple size={14} color={Colors.gold} /> },
  { id: "fitness", label: "Fitness", icon: <Dumbbell size={14} color={Colors.gold} /> },
];

const DATA_SCOPES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const ANALYSIS_TYPE_MAP: Record<string, string> = {
  full: "overall",
  cardio: "cardiovascular",
  metabolic: "glucose",
  sleep: "sleep",
  nutrition: "nutrition",
  fitness: "exercise",
};

/* ------------------------------------------------------------------ */
/* Sample results for "Full Analysis / Last 30 days"                   */
/* ------------------------------------------------------------------ */

interface Finding {
  id: string;
  icon: React.ReactNode;
  title: string;
  status: string;
  statusVariant: StatusVariant;
  explanation: string;
}

interface RiskFactor {
  id: string;
  label: string;
  level: RiskLevel;
  description: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  urgency: string;
  urgencyVariant: StatusVariant;
}

const SAMPLE_FINDINGS: Finding[] = [
  {
    id: "f1",
    icon: <TrendingUp size={18} color={Colors.gold} />,
    title: "LDL-P Improving",
    status: "Improving",
    statusVariant: "success",
    explanation:
      "LDL particle count has decreased 12% over the past 30 days, from 1,180 to 1,038 nmol/L. Your current statin protocol appears to be driving meaningful progress toward the optimal range (<1,000).",
  },
  {
    id: "f2",
    icon: <Moon size={18} color={Colors.gold} />,
    title: "Sleep Consistency Excellent",
    status: "Optimal",
    statusVariant: "success",
    explanation:
      "Sleep onset variance has dropped to 18 minutes (target <30min). Your average deep sleep is 1h 42m, up 18% since starting magnesium glycinate. REM latency also improved.",
  },
  {
    id: "f3",
    icon: <Heart size={18} color={Colors.gold} />,
    title: "HRV Indicating Good Recovery",
    status: "On Track",
    statusVariant: "info",
    explanation:
      "Resting HRV averaged 52ms over the past 30 days, an increase from 47ms the prior period. This suggests your cardiovascular fitness and autonomic balance are improving.",
  },
  {
    id: "f4",
    icon: <Droplets size={18} color={Colors.gold} />,
    title: "Glucose Variability Slightly Elevated",
    status: "Watch",
    statusVariant: "warning",
    explanation:
      "Post-prandial glucose spikes averaged 162 mg/dL with a standard deviation of 28 mg/dL. While fasting glucose (92 mg/dL) remains normal, meal-time variability warrants attention.",
  },
  {
    id: "f5",
    icon: <Dumbbell size={18} color={Colors.gold} />,
    title: "Body Composition On Track",
    status: "Good",
    statusVariant: "success",
    explanation:
      "Body fat percentage estimated at 18.2%, down from 19.1% last quarter. Lean mass has remained stable, indicating fat loss without muscle wasting on your current protocol.",
  },
];

const SAMPLE_RISKS: RiskFactor[] = [
  {
    id: "r1",
    label: "Cardiovascular",
    level: "low",
    description: "Framingham risk score 6.7%. ApoB trending favorably.",
  },
  {
    id: "r2",
    label: "Metabolic",
    level: "moderate",
    description: "Glucose variability elevated. A1C 5.4% (normal). Monitor post-prandial spikes.",
  },
  {
    id: "r3",
    label: "Inflammatory",
    level: "low",
    description: "hs-CRP at 0.8 mg/L (optimal <1.0). No systemic inflammation detected.",
  },
];

const SAMPLE_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec1",
    title: "Continue statin protocol",
    description:
      "Your LDL-P is responding well to the current rosuvastatin 10mg dose. Maintain for another 60 days and retest. Target: <1,000 nmol/L.",
    urgency: "Maintain",
    urgencyVariant: "success",
  },
  {
    id: "rec2",
    title: "Increase Zone 2 cardio",
    description:
      "Add 30 minutes of Zone 2 training (HR 120-135 bpm) twice per week to further improve HRV and metabolic flexibility.",
    urgency: "Recommended",
    urgencyVariant: "info",
  },
  {
    id: "rec3",
    title: "Consider berberine for glucose",
    description:
      "Given elevated post-prandial glucose spikes, discuss 500mg berberine before meals with your physician as an adjunct to dietary modifications.",
    urgency: "Discuss",
    urgencyVariant: "warning",
  },
  {
    id: "rec4",
    title: "Maintain sleep schedule",
    description:
      "Your sleep consistency is excellent. Continue the 10:30 PM target bedtime and magnesium glycinate 400mg protocol. Avoid screens after 9:30 PM.",
    urgency: "Maintain",
    urgencyVariant: "success",
  },
];

const DATA_SOURCES = [
  "Apple Health -- Heart rate, HRV, sleep stages (30 days)",
  "Lab Results -- Lipid panel, metabolic panel (Jun 2, 2026)",
  "CGM Readings -- Dexcom G7 glucose data (30 days)",
  "Fitness Tracker -- Workout sessions, body composition",
  "Supplement Log -- Protocol adherence data",
];

/* ------------------------------------------------------------------ */
/* Mapping helpers: hook data -> UI shapes                             */
/* ------------------------------------------------------------------ */

function mapSeverityToStatus(severity: string): { status: string; statusVariant: StatusVariant } {
  switch (severity) {
    case "positive": return { status: "Optimal", statusVariant: "success" };
    case "attention": return { status: "Watch", statusVariant: "warning" };
    case "warning": return { status: "Alert", statusVariant: "danger" };
    default: return { status: "Stable", statusVariant: "info" };
  }
}

function mapInsightIcon(severity: string): React.ReactNode {
  switch (severity) {
    case "positive": return <TrendingUp size={18} color={Colors.gold} />;
    case "attention": return <Droplets size={18} color={Colors.gold} />;
    case "warning": return <Flame size={18} color={Colors.gold} />;
    default: return <Activity size={18} color={Colors.gold} />;
  }
}

function mapPriorityToUrgency(priority: string): { urgency: string; urgencyVariant: StatusVariant } {
  switch (priority) {
    case "high": return { urgency: "Recommended", urgencyVariant: "info" };
    case "low": return { urgency: "Maintain", urgencyVariant: "success" };
    default: return { urgency: "Discuss", urgencyVariant: "warning" };
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AnalyzeScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("full");
  const [selectedScope, setSelectedScope] = useState("30d");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dataSourcesExpanded, setDataSourcesExpanded] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpText, setFollowUpText] = useState("");

  /* ---- tRPC hook ---- */
  const hookType = (ANALYSIS_TYPE_MAP[selectedType] ?? "overall") as any;
  const hookRange = selectedScope as any;
  const { analysis, isLoading: analysisLoading, refetch } = useHealthAnalysis(hookType, hookRange);

  /* ---- Derive UI data from hook or fall back to sample data ---- */
  const findings: Finding[] = analysis?.insights
    ? analysis.insights.map((ins) => {
        const { status, statusVariant } = mapSeverityToStatus(ins.severity);
        return {
          id: ins.id,
          icon: mapInsightIcon(ins.severity),
          title: ins.title,
          status,
          statusVariant,
          explanation: ins.description,
        };
      })
    : SAMPLE_FINDINGS;

  const recommendations: Recommendation[] = analysis?.recommendations
    ? analysis.recommendations.map((rec) => {
        const { urgency, urgencyVariant } = mapPriorityToUrgency(rec.priority);
        return {
          id: rec.id,
          title: rec.title,
          description: rec.description,
          urgency,
          urgencyVariant,
        };
      })
    : SAMPLE_RECOMMENDATIONS;

  const risks = SAMPLE_RISKS; // No direct mapping from hook data

  const overallScore = analysis?.score ?? 82;
  const scoreTrend = analysis?.scoreChange ?? 3;
  const summaryText = analysis?.summary ??
    "Your overall health trajectory is positive. Cardiovascular markers are responding well to treatment, sleep quality is excellent, and body composition continues to improve. Primary area of focus: managing post-prandial glucose variability.";

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    refetch().finally(() => {
      // Small delay for UX feel, then show results
      setTimeout(() => {
        setIsAnalyzing(false);
        setHasAnalyzed(true);
      }, 500);
    });
  }, [refetch]);

  const handleAskQuestion = useCallback(() => {
    if (followUpText.trim()) {
      router.push({
        pathname: "/insights/ask",
        params: { initialQuestion: followUpText.trim() },
      });
      setFollowUpText("");
      setFollowUpVisible(false);
    } else {
      router.push("/insights/ask");
    }
  }, [followUpText, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Header ---- */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={22} color={Colors.gold} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Health Analysis</Text>
              <Text style={styles.headerSub}>
                AI-powered deep dive into your health data
              </Text>
            </View>
          </View>

          {/* ---- Analysis Type Selector ---- */}
          <Text style={styles.sectionLabel}>Analysis Type</Text>
          <AnalysisChips
            options={ANALYSIS_TYPES}
            selected={selectedType}
            onSelect={setSelectedType}
          />

          {/* ---- Data Scope Selector ---- */}
          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
            Data Scope
          </Text>
          <View style={styles.scopeRow}>
            {DATA_SCOPES.map((scope) => {
              const isActive = scope.id === selectedScope;
              return (
                <Pressable
                  key={scope.id}
                  style={[
                    styles.scopeChip,
                    isActive && styles.scopeChipActive,
                  ]}
                  onPress={() => setSelectedScope(scope.id)}
                >
                  <Text
                    style={[
                      styles.scopeText,
                      isActive && styles.scopeTextActive,
                    ]}
                  >
                    {scope.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ---- Analyze Button ---- */}
          <Button
            title={isAnalyzing ? "Analyzing..." : "Analyze"}
            onPress={handleAnalyze}
            loading={isAnalyzing}
            icon={
              !isAnalyzing ? (
                <Sparkles size={18} color={Colors.dark} />
              ) : undefined
            }
            size="lg"
            style={styles.analyzeBtn}
          />

          {/* ---- Loading indicator ---- */}
          {analysisLoading && !hasAnalyzed && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.gold} />
            </View>
          )}

          {/* ---- Results ---- */}
          {hasAnalyzed && (
            <View style={styles.results}>
              {/* Overall Assessment */}
              <Card style={styles.assessmentCard}>
                <View style={styles.assessmentHeader}>
                  <Target size={18} color={Colors.gold} />
                  <Text style={styles.assessmentTitle}>
                    Overall Assessment
                  </Text>
                </View>
                <ScoreGauge score={overallScore} trend={scoreTrend} label="Health Score" />
                <Text style={styles.assessmentSummary}>
                  {summaryText}
                </Text>
              </Card>

              {/* Key Findings */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Zap size={18} color={Colors.gold} />
                  <Text style={styles.sectionTitle}>Key Findings</Text>
                </View>
                {findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    icon={finding.icon}
                    title={finding.title}
                    status={finding.status}
                    statusVariant={finding.statusVariant}
                    explanation={finding.explanation}
                  />
                ))}
              </View>

              {/* Risk Factors */}
              <Card style={styles.riskCard}>
                <View style={styles.sectionHeaderRow}>
                  <Shield size={18} color={Colors.gold} />
                  <Text style={styles.sectionTitle}>Risk Factors</Text>
                </View>
                {risks.map((risk) => (
                  <RiskBar
                    key={risk.id}
                    label={risk.label}
                    level={risk.level}
                    description={risk.description}
                  />
                ))}
              </Card>

              {/* Recommendations */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Sparkles size={18} color={Colors.gold} />
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                </View>
                {recommendations.map((rec, idx) => (
                  <RecommendationItem
                    key={rec.id}
                    number={idx + 1}
                    title={rec.title}
                    description={rec.description}
                    urgency={rec.urgency}
                    urgencyVariant={rec.urgencyVariant}
                  />
                ))}
              </View>

              {/* Data Sources */}
              <Card style={styles.dataSourcesCard}>
                <Pressable
                  style={styles.dataSourcesHeader}
                  onPress={() => setDataSourcesExpanded((p) => !p)}
                >
                  <View style={styles.dataSourcesLeft}>
                    <Database size={16} color={Colors.silver} />
                    <Text style={styles.dataSourcesTitle}>
                      Data Sources ({DATA_SOURCES.length})
                    </Text>
                  </View>
                  {dataSourcesExpanded ? (
                    <ChevronUp size={18} color={Colors.silver} />
                  ) : (
                    <ChevronDown size={18} color={Colors.silver} />
                  )}
                </Pressable>
                {dataSourcesExpanded &&
                  DATA_SOURCES.map((src, i) => (
                    <View key={i} style={styles.dataSourceItem}>
                      <View style={styles.dataSourceDot} />
                      <Text style={styles.dataSourceText}>{src}</Text>
                    </View>
                  ))}
              </Card>

              {/* Ask a Question */}
              {!followUpVisible ? (
                <Button
                  title="Ask a Question"
                  variant="secondary"
                  onPress={() => setFollowUpVisible(true)}
                  icon={<MessageCircle size={16} color={Colors.gold} />}
                  style={styles.askBtn}
                />
              ) : (
                <View style={styles.followUpContainer}>
                  <Text style={styles.followUpLabel}>
                    Ask a follow-up question about your analysis
                  </Text>
                  <View style={styles.followUpInputRow}>
                    <TextInput
                      style={styles.followUpInput}
                      value={followUpText}
                      onChangeText={setFollowUpText}
                      placeholder="e.g. Why is my glucose spiking?"
                      placeholderTextColor={Colors.silver}
                      multiline
                      maxLength={500}
                    />
                    <Pressable
                      style={[
                        styles.followUpSend,
                        !followUpText.trim() && styles.followUpSendDisabled,
                      ]}
                      onPress={handleAskQuestion}
                    >
                      <Send size={18} color={Colors.dark} />
                    </Pressable>
                  </View>
                  <Button
                    title="Open Full Q&A"
                    variant="tertiary"
                    size="sm"
                    onPress={() => router.push("/insights/ask")}
                    style={styles.openQaBtn}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSub: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
  },

  /* Section labels */
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Scope row */
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scopeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeChipActive: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    borderColor: Colors.gold,
  },
  scopeText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontWeight: "500",
  },
  scopeTextActive: {
    color: Colors.gold,
    fontWeight: "600",
  },

  /* Analyze button */
  analyzeBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  /* Results area */
  results: {
    marginTop: Spacing.sm,
  },

  /* Assessment card */
  assessmentCard: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  assessmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  assessmentTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.white,
  },
  assessmentSummary: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 22,
  },

  /* Section blocks */
  sectionBlock: {
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.white,
  },

  /* Risk card */
  riskCard: {
    marginBottom: Spacing.md,
  },

  /* Data sources */
  dataSourcesCard: {
    marginBottom: Spacing.md,
  },
  dataSourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dataSourcesLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dataSourcesTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  dataSourceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  dataSourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  dataSourceText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.silver,
    lineHeight: 18,
  },

  /* Ask a question */
  askBtn: {
    marginTop: Spacing.sm,
  },
  followUpContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  followUpLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  followUpInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  followUpInput: {
    flex: 1,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.white,
    maxHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  followUpSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  followUpSendDisabled: {
    opacity: 0.4,
  },
  openQaBtn: {
    marginTop: Spacing.sm,
    alignSelf: "center",
  },
});
