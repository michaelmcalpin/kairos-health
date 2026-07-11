/**
 * Insight Sherpa — AI-generated health report hub.
 *
 * Lets the user generate new reports from dropdown presets
 * and browse / open previously generated analyses.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Sparkles,
  ChevronDown,
  FileText,
  TrendingUp,
  Brain,
  Moon,
  Heart,
  ArrowRight,
  Lightbulb,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Sample data                                                        */
/* ------------------------------------------------------------------ */

const REPORT_OPTIONS = [
  { id: "full", label: "Full Health Analysis", icon: Brain },
  { id: "cardio", label: "Cardiovascular Focus", icon: Heart },
  { id: "metabolic", label: "Metabolic Health", icon: TrendingUp },
  { id: "sleep", label: "Sleep & Recovery", icon: Moon },
] as const;

// Reports are now fetched from the backend via reports.listAll

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function InsightsScreen() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<(typeof REPORT_OPTIONS)[number]>(REPORT_OPTIONS[0]);

  // Fetch reports from backend
  const reportsQuery = trpc.clientPortal.reports.listAll.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // Backend returns: Array<{ id, clientId, reportType, title, reportData, createdAt, expiresAt }>
  const reportsData = reportsQuery.data as any[] | undefined;
  const RECENT_REPORTS = reportsData && reportsData.length > 0
    ? reportsData.map((r: any) => ({
        id: r.id,
        title: r.title ?? r.reportType ?? "Report",
        date: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "",
        dataPoints: (r.reportData as any)?.dataPoints ?? null,
        summary: (r.reportData as any)?.summary ?? "",
      }))
    : [];

  const handleSelectOption = (opt: (typeof REPORT_OPTIONS)[number]) => {
    setSelectedOption(opt);
    setDropdownOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Sparkles size={24} color={Colors.gold} />
          </View>
          <Text style={styles.headerTitle}>Insight Sherpa</Text>
        </View>
        <Text style={styles.headerSub}>
          AI-powered health analysis and recommendations
        </Text>

        {/* ---- Generate Report Card ---- */}
        <Card style={styles.generateCard}>
          <Text style={styles.sectionLabel}>Generate Report</Text>

          {/* Dropdown trigger */}
          <Pressable
            style={styles.dropdown}
            onPress={() => setDropdownOpen((p) => !p)}
          >
            <View style={styles.dropdownLeft}>
              <selectedOption.icon size={18} color={Colors.gold} />
              <Text style={styles.dropdownText}>{selectedOption.label}</Text>
            </View>
            <ChevronDown
              size={18}
              color={Colors.silver}
              style={{
                transform: [{ rotate: dropdownOpen ? "180deg" : "0deg" }],
              }}
            />
          </Pressable>

          {/* Dropdown options */}
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {REPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = opt.id === selectedOption.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.dropdownItem,
                      active && styles.dropdownItemActive,
                    ]}
                    onPress={() => handleSelectOption(opt)}
                  >
                    <Icon
                      size={16}
                      color={active ? Colors.gold : Colors.silver}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        active && styles.dropdownItemTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Button
            title="Generate Report"
            onPress={() => {
              Alert.alert(
                "Generate Report",
                `Generating a "${selectedOption.label}" report. This will analyze your health data and create a detailed assessment.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Generate",
                    onPress: () => router.push("/insights/analyze"),
                  },
                ],
              );
            }}
            icon={<Sparkles size={16} color={Colors.dark} />}
            style={styles.generateBtn}
          />
        </Card>

        {/* ---- AI Insight Banner ---- */}
        <View style={styles.insightBanner}>
          <View style={styles.insightIconWrap}>
            <Lightbulb size={18} color={Colors.gold} />
          </View>
          <Text style={styles.insightText}>
            Based on your recent labs, your LDL-P trend has improved 12% over 3
            months
          </Text>
        </View>

        {/* ---- Recent Reports ---- */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>

        {RECENT_REPORTS.length === 0 && !reportsQuery.isLoading && (
          <Card style={styles.reportCard}>
            <View style={{ alignItems: "center", paddingVertical: Spacing.lg }}>
              <FileText size={32} color={Colors.silver} />
              <Text style={[styles.reportTitle, { marginTop: Spacing.sm, textAlign: "center" }]}>
                No Reports Yet
              </Text>
              <Text style={[styles.reportDate, { textAlign: "center", marginTop: 4 }]}>
                Generate your first health analysis report above to get started.
              </Text>
            </View>
          </Card>
        )}

        {RECENT_REPORTS.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => router.push({ pathname: "/insights/report", params: { id: report.id } })}
          >
            <Card style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <FileText size={18} color={Colors.gold} />
                <View style={styles.reportMeta}>
                  <Text style={styles.reportTitle}>{report.title}</Text>
                  <Text style={styles.reportDate}>
                    {report.date}
                    {report.dataPoints
                      ? ` · Based on ${report.dataPoints} data points`
                      : ""}
                  </Text>
                </View>
              </View>

              <Text style={styles.reportSummary} numberOfLines={2}>
                {report.summary}
              </Text>

              <View style={styles.reportFooter}>
                <Button
                  title="View Report"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push({ pathname: "/insights/report", params: { id: report.id } })}
                  icon={<ArrowRight size={14} color={Colors.gold} />}
                />
              </View>
            </Card>
          </Pressable>
        ))}
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

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSub: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginBottom: Spacing.lg,
  },

  /* Generate card */
  generateCard: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dropdownText: {
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  dropdownMenu: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dropdownItemActive: {
    backgroundColor: "rgba(74, 144, 217, 0.1)",
  },
  dropdownItemText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  dropdownItemTextActive: {
    color: Colors.gold,
    fontWeight: "600",
  },
  generateBtn: {
    marginTop: Spacing.md,
  },

  /* AI insight banner */
  insightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(74, 144, 217, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 144, 217, 0.3)",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.goldLight,
    lineHeight: 20,
  },

  /* Section title */
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: Spacing.md,
  },

  /* Report cards */
  reportCard: {
    marginBottom: Spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reportMeta: {
    flex: 1,
  },
  reportTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 2,
  },
  reportDate: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  reportSummary: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
