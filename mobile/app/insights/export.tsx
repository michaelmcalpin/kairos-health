/**
 * Health Report Export screen — generate, preview, and share health reports.
 * Supports multiple report types, date ranges, and section filtering.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
  pageEstimate: number;
}

interface DateRangeOption {
  id: string;
  label: string;
  days: number;
}

interface SectionOption {
  id: string;
  label: string;
  defaultChecked: boolean;
}

interface RecentReport {
  id: string;
  title: string;
  dateRange: string;
  generatedAt: string;
  pages: number;
  type: string;
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const REPORT_TYPES: ReportType[] = [
  {
    id: "full",
    title: "Full Health Summary",
    description: "Comprehensive overview of all metrics",
    icon: "📋",
    pageEstimate: 12,
  },
  {
    id: "labs",
    title: "Lab Results Summary",
    description: "Focus on bloodwork and lab values",
    icon: "🧪",
    pageEstimate: 6,
  },
  {
    id: "progress",
    title: "Progress Report",
    description: "Before/after comparison for a date range",
    icon: "📈",
    pageEstimate: 8,
  },
  {
    id: "provider",
    title: "Provider Report",
    description: "Formatted for sharing with your doctor",
    icon: "🩺",
    pageEstimate: 10,
  },
];

const DATE_RANGES: DateRangeOption[] = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "6m", label: "Last 6 months", days: 180 },
  { id: "1y", label: "Last year", days: 365 },
  { id: "custom", label: "Custom", days: 0 },
];

const SECTIONS: SectionOption[] = [
  { id: "biometrics", label: "Biometrics (weight, BP, glucose)", defaultChecked: true },
  { id: "labs", label: "Lab Results", defaultChecked: true },
  { id: "adherence", label: "Protocol Adherence", defaultChecked: true },
  { id: "sleep", label: "Sleep Data", defaultChecked: true },
  { id: "activity", label: "Activity & Exercise", defaultChecked: true },
  { id: "supplements", label: "Supplement Stack", defaultChecked: false },
  { id: "genetics", label: "Genetic Markers", defaultChecked: false },
];

const RECENT_REPORTS: RecentReport[] = [
  {
    id: "r1",
    title: "Full Health Summary",
    dateRange: "Mar 15 — Jun 15, 2026",
    generatedAt: "Jun 14, 2026",
    pages: 12,
    type: "full",
  },
  {
    id: "r2",
    title: "Lab Results Summary",
    dateRange: "Apr 1 — Jun 1, 2026",
    generatedAt: "Jun 2, 2026",
    pages: 6,
    type: "labs",
  },
  {
    id: "r3",
    title: "Provider Report",
    dateRange: "Jan 1 — May 31, 2026",
    generatedAt: "May 28, 2026",
    pages: 10,
    type: "provider",
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExportScreen() {
  const [selectedType, setSelectedType] = useState<string>("full");
  const [selectedRange, setSelectedRange] = useState<string>("90d");
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      SECTIONS.forEach((s) => (initial[s.id] = s.defaultChecked));
      return initial;
    }
  );
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const currentType = REPORT_TYPES.find((r) => r.id === selectedType)!;
  const currentRange = DATE_RANGES.find((r) => r.id === selectedRange)!;
  const enabledSections = Object.entries(selectedSections).filter(([, v]) => v);

  /* Toggle section */
  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  /* Generate report */
  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    // TODO: Replace with real API call to generate report
    Alert.alert(
      "Generating Report",
      `Generating ${currentType.title} for ${currentRange.label} with ${enabledSections.length} sections...`,
    );
    // Simulate generation delay while API integration is pending
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  /* Share report */
  const handleShare = async () => {
    await Share.share({
      message: `${currentType.title} — Health Report\nDate range: ${currentRange.label}\nGenerated by Everist.ai`,
    });
  };

  /* Save to device */
  const handleSave = () => {
    // TODO: Replace with real file system save when PDF generation API is ready
    Alert.alert(
      "Save Report",
      `${currentType.title} will be saved to your device. PDF export is coming in a future update.`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Health Report" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health Report</Text>
          <Text style={styles.subtitle}>
            Generate and share detailed health reports
          </Text>
        </View>

        {/* Report Type Selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <View style={styles.reportTypeGrid}>
            {REPORT_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setSelectedType(type.id);
                    setGenerated(false);
                  }}
                  style={[
                    styles.reportTypeCard,
                    isSelected && styles.reportTypeCardSelected,
                  ]}
                >
                  <Text style={styles.reportTypeIcon}>{type.icon}</Text>
                  <Text
                    style={[
                      styles.reportTypeTitle,
                      isSelected && styles.reportTypeTitleSelected,
                    ]}
                  >
                    {type.title}
                  </Text>
                  <Text style={styles.reportTypeDesc}>{type.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date Range Picker */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.dateRangeRow}>
            {DATE_RANGES.map((range) => {
              const isSelected = selectedRange === range.id;
              return (
                <Pressable
                  key={range.id}
                  onPress={() => {
                    setSelectedRange(range.id);
                    setGenerated(false);
                  }}
                  style={[
                    styles.dateRangeChip,
                    isSelected && styles.dateRangeChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateRangeChipText,
                      isSelected && styles.dateRangeChipTextSelected,
                    ]}
                  >
                    {range.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sections to Include */}
        <Card style={styles.sectionsCard}>
          <Text style={styles.sectionTitle}>Sections to Include</Text>

          {SECTIONS.map((section) => {
            const checked = selectedSections[section.id] ?? false;
            return (
              <Pressable
                key={section.id}
                onPress={() => {
                  toggleSection(section.id);
                  setGenerated(false);
                }}
                style={styles.sectionRow}
              >
                <View
                  style={[
                    styles.sectionCheckbox,
                    checked && styles.sectionCheckboxChecked,
                  ]}
                >
                  {checked && (
                    <Text style={styles.sectionCheckmark}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.sectionLabel,
                    !checked && styles.sectionLabelDimmed,
                  ]}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </Card>

        {/* Generate Button */}
        <Button
          title={generating ? "Generating..." : "Generate Report"}
          variant="primary"
          size="lg"
          loading={generating}
          onPress={handleGenerate}
          disabled={enabledSections.length === 0}
        />

        {/* Generated Report Preview */}
        {generated && (
          <Card elevated style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewIcon}>{currentType.icon}</Text>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{currentType.title}</Text>
                <Text style={styles.previewMeta}>
                  {currentRange.label} · ~{currentType.pageEstimate} pages
                </Text>
                <Text style={styles.previewMeta}>
                  {enabledSections.length} sections included
                </Text>
              </View>
            </View>

            {/* Status badge */}
            <View style={styles.readyBadge}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>Ready to share</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.previewButtonRow}>
              <Button
                title="Share"
                variant="primary"
                style={styles.flex1}
                onPress={handleShare}
              />
              <Button
                title="Save to Device"
                variant="secondary"
                style={styles.flex1}
                onPress={handleSave}
              />
            </View>
          </Card>
        )}

        {/* Recent Reports */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>

          {RECENT_REPORTS.map((report) => (
            <Card key={report.id} style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentIcon}>
                  {REPORT_TYPES.find((r) => r.id === report.type)?.icon ?? "📄"}
                </Text>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle}>{report.title}</Text>
                  <Text style={styles.recentMeta}>{report.dateRange}</Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentPages}>{report.pages} pg</Text>
                  <Text style={styles.recentDate}>{report.generatedAt}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
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

  /* Header */
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Generic section block */
  sectionBlock: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  /* Report type grid */
  reportTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  reportTypeCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
  },
  reportTypeCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.08)",
  },
  reportTypeIcon: {
    fontSize: 24,
  },
  reportTypeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
  },
  reportTypeTitleSelected: {
    color: Colors.gold,
  },
  reportTypeDesc: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    lineHeight: 16,
  },

  /* Date range chips */
  dateRangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dateRangeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRangeChipSelected: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    borderColor: Colors.gold,
  },
  dateRangeChipText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontWeight: "500",
  },
  dateRangeChipTextSelected: {
    color: Colors.gold,
  },

  /* Sections checkboxes */
  sectionsCard: {
    gap: Spacing.sm,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  sectionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCheckboxChecked: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  sectionCheckmark: {
    color: Colors.dark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: -1,
  },
  sectionLabel: {
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: "500",
  },
  sectionLabelDimmed: {
    color: Colors.silver,
  },

  /* Preview card */
  previewCard: {
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  previewIcon: {
    fontSize: 36,
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  previewMeta: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.successMuted,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  readyText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },

  /* Recent reports */
  recentCard: {
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recentIcon: {
    fontSize: 22,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  recentMeta: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  recentRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  recentPages: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  recentDate: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
});
