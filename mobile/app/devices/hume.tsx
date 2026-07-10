/**
 * Hume AI Integration screen.
 *
 * Hume AI is not a wearable device but an AI-powered emotion and
 * wellbeing analysis platform. It analyzes voice and facial expressions
 * to provide emotional wellness insights.
 *
 * Because Hume is not yet in the backend provider list, this screen
 * uses sample data for display and wraps API calls in try/catch.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Shield,
  RefreshCw,
  Brain,
  Smile,
  Frown,
  Sun,
  Zap,
  Wind,
  Eye,
  Clock,
  TrendingUp,
  BarChart3,
  Info,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Accent color — Hume warm coral/pink                                 */
/* ------------------------------------------------------------------ */

const HUME_ACCENT = "#E879A8"; // Warm coral-pink
const HUME_ACCENT_BG = "rgba(232, 121, 168, 0.12)";
const HUME_ACCENT_BORDER = "rgba(232, 121, 168, 0.2)";

/* ------------------------------------------------------------------ */
/* Sample emotion data                                                 */
/* ------------------------------------------------------------------ */

interface EmotionMetric {
  id: string;
  label: string;
  score: number; // 0-100
  trend: "up" | "down" | "stable";
  icon: React.ReactNode;
  color: string;
}

const SAMPLE_EMOTIONS: EmotionMetric[] = [
  {
    id: "joy",
    label: "Joy",
    score: 72,
    trend: "up",
    icon: <Smile size={18} color="#F59E0B" />,
    color: "#F59E0B",
  },
  {
    id: "calm",
    label: "Calm",
    score: 65,
    trend: "stable",
    icon: <Wind size={18} color="#06B6D4" />,
    color: "#06B6D4",
  },
  {
    id: "energy",
    label: "Energy",
    score: 58,
    trend: "up",
    icon: <Zap size={18} color="#4A9D5B" />,
    color: "#4A9D5B",
  },
  {
    id: "stress",
    label: "Stress",
    score: 34,
    trend: "down",
    icon: <Frown size={18} color="#C65D5D" />,
    color: "#C65D5D",
  },
  {
    id: "focus",
    label: "Focus",
    score: 81,
    trend: "up",
    icon: <Eye size={18} color="#8B5CF6" />,
    color: "#8B5CF6",
  },
  {
    id: "optimism",
    label: "Optimism",
    score: 69,
    trend: "stable",
    icon: <Sun size={18} color="#D4A843" />,
    color: "#D4A843",
  },
];

interface AnalysisEntry {
  id: string;
  date: string;
  overallScore: number;
  summary: string;
}

const SAMPLE_ANALYSES: AnalysisEntry[] = [
  {
    id: "a1",
    date: "Today, 9:30 AM",
    overallScore: 78,
    summary: "Positive emotional state with high focus and low stress levels.",
  },
  {
    id: "a2",
    date: "Yesterday, 4:15 PM",
    overallScore: 62,
    summary: "Moderate energy with slightly elevated stress. Good calm baseline.",
  },
  {
    id: "a3",
    date: "Jul 8, 10:00 AM",
    overallScore: 85,
    summary: "Excellent emotional balance. High joy and optimism scores.",
  },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function HumeScreen() {
  const router = useRouter();

  /* -- Connection state (sample for now) -- */
  const [isConnected, setIsConnected] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotions] = useState<EmotionMetric[]>(SAMPLE_EMOTIONS);
  const [analyses] = useState<AnalysisEntry[]>(SAMPLE_ANALYSES);

  /* -- Handlers -- */
  const handleConnect = () => {
    Alert.alert(
      "Hume AI Setup",
      "Hume AI integration requires setup through the Everist dashboard. Contact your coach for access.",
      [{ text: "OK" }],
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Hume AI",
      "Are you sure you want to disconnect Hume AI? Your analysis history will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => setIsConnected(false),
        },
      ],
    );
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      Alert.alert(
        "Analysis Complete",
        "Your emotional wellbeing analysis has been updated.",
        [{ text: "OK" }],
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HEADER                                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Brain size={28} color={HUME_ACCENT} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Hume AI</Text>
            <Text style={styles.headerSubtitle}>
              Emotional wellbeing analysis
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* WHAT IS HUME                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.explainerCard}>
          <View style={styles.explainerRow}>
            <View style={styles.explainerIconCircle}>
              <Info size={16} color={HUME_ACCENT} />
            </View>
            <Text style={styles.explainerText}>
              Hume AI analyzes voice and facial expressions to provide emotional
              wellbeing insights. It tracks patterns in joy, stress, calm,
              energy, and more to help you and your care team understand your
              emotional health over time.
            </Text>
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONNECTION STATUS                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card
          style={[
            styles.statusCard,
            isConnected
              ? styles.statusCardConnected
              : styles.statusCardDisconnected,
          ]}
        >
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? Colors.success : Colors.silver },
                ]}
              />
              <View>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: isConnected ? Colors.success : Colors.silver },
                  ]}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </Text>
              </View>
            </View>
            {isConnected && (
              <View style={styles.syncTimeCol}>
                <Text style={styles.syncTimeLabel}>Last analysis</Text>
                <Text style={styles.syncTimeValue}>Today, 9:30 AM</Text>
              </View>
            )}
          </View>

          {isConnected ? (
            <Button
              title={isAnalyzing ? "Analyzing..." : "Run Analysis"}
              variant="secondary"
              size="sm"
              icon={
                isAnalyzing ? undefined : (
                  <BarChart3 size={14} color={Colors.gold} />
                )
              }
              onPress={handleRunAnalysis}
              loading={isAnalyzing}
              style={styles.actionBtn}
            />
          ) : (
            <Button
              title="Setup via Dashboard"
              variant="primary"
              size="sm"
              onPress={handleConnect}
              style={styles.actionBtn}
            />
          )}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EMOTION METRICS                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isConnected && (
          <>
            <Card style={styles.metricsCard}>
              <Text style={styles.categoryTitle}>Emotion Metrics</Text>
              <Text style={styles.categorySubtitle}>
                Current emotional state based on recent analysis
              </Text>

              <View style={styles.metricsGrid}>
                {emotions.map((emotion) => (
                  <View key={emotion.id} style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      <View style={styles.metricIconWrap}>{emotion.icon}</View>
                      <TrendingUp
                        size={12}
                        color={
                          emotion.trend === "up"
                            ? Colors.success
                            : emotion.trend === "down"
                              ? Colors.danger
                              : Colors.silver
                        }
                        style={
                          emotion.trend === "down"
                            ? { transform: [{ rotate: "180deg" }] }
                            : {}
                        }
                      />
                    </View>
                    <Text style={styles.metricLabel}>{emotion.label}</Text>
                    {/* Score bar */}
                    <View style={styles.scoreBarContainer}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          {
                            width: `${emotion.score}%`,
                            backgroundColor: emotion.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.metricScore, { color: emotion.color }]}>
                      {emotion.score}%
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* RECENT ANALYSES                                        */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Card style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>Recent Analyses</Text>
              <Text style={styles.categorySubtitle}>
                History of your emotional wellbeing assessments
              </Text>

              {analyses.map((analysis, index) => (
                <View
                  key={analysis.id}
                  style={[
                    styles.analysisRow,
                    index < analyses.length - 1 && styles.analysisRowBorder,
                  ]}
                >
                  <View style={styles.analysisLeft}>
                    <View style={styles.analysisScoreCircle}>
                      <Text style={styles.analysisScoreText}>
                        {analysis.overallScore}
                      </Text>
                    </View>
                    <View style={styles.analysisContent}>
                      <Text style={styles.analysisDate}>{analysis.date}</Text>
                      <Text style={styles.analysisSummary}>
                        {analysis.summary}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PRIVACY INFO                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Card style={styles.privacyCard}>
              <View style={styles.infoRow}>
                <View style={styles.privacyIconCircle}>
                  <Shield size={16} color={Colors.success} />
                </View>
                <Text style={styles.privacyText}>
                  Emotion analysis data is processed securely and only shared
                  with your authorized care team. Voice and facial data is never
                  stored permanently.
                </Text>
              </View>
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* DISCONNECT                                             */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Button
              title="Disconnect Hume AI"
              variant="danger"
              size="lg"
              onPress={handleDisconnect}
              style={styles.disconnectBtn}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },

  /* -- Header -- */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: HUME_ACCENT_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },

  /* -- Explainer card -- */
  explainerCard: {
    marginBottom: Spacing.md,
    backgroundColor: HUME_ACCENT_BG,
    borderColor: HUME_ACCENT_BORDER,
  },
  explainerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  explainerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(232, 121, 168, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  explainerText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
  },

  /* -- Connection status card -- */
  statusCard: {
    marginBottom: Spacing.md,
  },
  statusCardConnected: {
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  statusCardDisconnected: {
    backgroundColor: "rgba(192, 197, 206, 0.06)",
    borderColor: "rgba(192, 197, 206, 0.15)",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  statusValue: {
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  syncTimeCol: {
    alignItems: "flex-end",
  },
  syncTimeLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  syncTimeValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  actionBtn: {
    alignSelf: "stretch",
  },

  /* -- Emotion metrics -- */
  metricsCard: {
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: 4,
  },
  categorySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metricItem: {
    width: "48%",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.xs,
  },
  scoreBarContainer: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 2,
    marginBottom: Spacing.xs,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  metricScore: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },

  /* -- Analysis history -- */
  categoryCard: {
    marginBottom: Spacing.md,
  },
  analysisRow: {
    paddingVertical: 12,
  },
  analysisRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  analysisLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  analysisScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HUME_ACCENT_BG,
    borderWidth: 2,
    borderColor: HUME_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  analysisScoreText: {
    color: HUME_ACCENT,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  analysisContent: {
    flex: 1,
  },
  analysisDate: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: 4,
  },
  analysisSummary: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },

  /* -- Info / privacy cards -- */
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  privacyCard: {
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  privacyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 157, 91, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  privacyText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
  },

  /* -- Disconnect button -- */
  disconnectBtn: {
    marginBottom: Spacing.lg,
  },
});
