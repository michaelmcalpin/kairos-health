/**
 * Medical Records screen — documents grouped by type with search and upload.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  provider: string;
  fileType: "pdf" | "image" | "doc";
}

interface RecordGroup {
  type: string;
  icon: string;
  records: MedicalRecord[];
}

const SAMPLE_RECORD_GROUPS: RecordGroup[] = [
  {
    type: "Lab Reports",
    icon: "🧪",
    records: [
      {
        id: "1",
        title: "Comprehensive Metabolic Panel",
        date: "May 28, 2026",
        provider: "Quest Diagnostics",
        fileType: "pdf",
      },
      {
        id: "2",
        title: "Lipid Panel + ApoB",
        date: "May 28, 2026",
        provider: "Quest Diagnostics",
        fileType: "pdf",
      },
      {
        id: "3",
        title: "Hormone Panel (Testosterone, DHEA, Cortisol)",
        date: "Apr 15, 2026",
        provider: "LabCorp",
        fileType: "pdf",
      },
    ],
  },
  {
    type: "Imaging",
    icon: "📷",
    records: [
      {
        id: "4",
        title: "Chest X-Ray",
        date: "Mar 10, 2026",
        provider: "Radiology Associates",
        fileType: "image",
      },
      {
        id: "5",
        title: "DEXA Scan Report",
        date: "May 15, 2026",
        provider: "Longevity Medical Center",
        fileType: "pdf",
      },
      {
        id: "6",
        title: "Coronary Artery Calcium Score",
        date: "Jan 20, 2026",
        provider: "Heart Imaging Center",
        fileType: "pdf",
      },
    ],
  },
  {
    type: "Visit Notes",
    icon: "📋",
    records: [
      {
        id: "7",
        title: "Annual Physical - Dr. Chen",
        date: "May 2, 2026",
        provider: "Dr. Sarah Chen, MD",
        fileType: "doc",
      },
      {
        id: "8",
        title: "Cardiology Follow-up",
        date: "Feb 18, 2026",
        provider: "Dr. James Park, MD",
        fileType: "doc",
      },
      {
        id: "9",
        title: "Dermatology Screening",
        date: "Jan 8, 2026",
        provider: "Dr. Lisa Wong, MD",
        fileType: "doc",
      },
    ],
  },
  {
    type: "Prescriptions",
    icon: "💊",
    records: [
      {
        id: "10",
        title: "Rosuvastatin 10mg",
        date: "May 2, 2026",
        provider: "Dr. Sarah Chen, MD",
        fileType: "pdf",
      },
      {
        id: "11",
        title: "Metformin 500mg (off-label)",
        date: "May 2, 2026",
        provider: "Dr. Sarah Chen, MD",
        fileType: "pdf",
      },
    ],
  },
];

function mapApiToRecordGroups(docs: any[]): RecordGroup[] {
  const groupMap: Record<string, MedicalRecord[]> = {};
  for (const doc of docs) {
    const groupType = doc.category ?? doc.docSubType ?? "Other";
    if (!groupMap[groupType]) groupMap[groupType] = [];
    groupMap[groupType].push({
      id: doc.id,
      title: doc.title ?? doc.fileName ?? "Untitled",
      date: doc.reportDate
        ? new Date(doc.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "",
      provider: doc.providerName ?? "",
      fileType: mapFileType(doc.mimeType ?? doc.fileType),
    });
  }
  const iconMap: Record<string, string> = {
    "Lab Reports": "🧪",
    "Imaging": "📷",
    "Visit Notes": "📋",
    "Prescriptions": "💊",
  };
  return Object.entries(groupMap).map(([type, records]) => ({
    type,
    icon: iconMap[type] ?? "📄",
    records,
  }));
}

function mapFileType(mime?: string): "pdf" | "image" | "doc" {
  if (!mime) return "doc";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("image")) return "image";
  return "doc";
}

const FILE_TYPE_LABELS: Record<MedicalRecord["fileType"], { label: string; color: string }> = {
  pdf: { label: "PDF", color: Colors.danger },
  image: { label: "IMG", color: Colors.info },
  doc: { label: "DOC", color: Colors.success },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MedicalRecordsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const query = trpc.clientPortal.clinicalDocs.list.useQuery(
    { docType: "medical_record" },
    DEFAULT_QUERY_OPTIONS,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const apiGroups = query.data ? mapApiToRecordGroups(query.data as any[]) : null;
  const RECORD_GROUPS = apiGroups ?? SAMPLE_RECORD_GROUPS;

  const filteredGroups = RECORD_GROUPS.map((group) => ({
    ...group,
    records: group.records.filter(
      (record) =>
        record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.provider.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((group) => group.records.length > 0);

  const totalRecords = RECORD_GROUPS.reduce(
    (sum, g) => sum + g.records.length,
    0,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Medical Records" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>{"🔍"}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={Colors.silver}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Text style={styles.clearButton}>{"✕"}</Text>
            </Pressable>
          )}
        </View>

        {query.isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {totalRecords} documents
          </Text>
          {searchQuery.length > 0 && (
            <Text style={styles.filterText}>
              Showing{" "}
              {filteredGroups.reduce((s, g) => s + g.records.length, 0)}{" "}
              results
            </Text>
          )}
        </View>

        {/* Record Groups */}
        {filteredGroups.map((group) => (
          <Card key={group.type} style={styles.section}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupIcon}>{group.icon}</Text>
              <Text style={styles.sectionTitle}>{group.type}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{group.records.length}</Text>
              </View>
            </View>

            {group.records.map((record, idx) => {
              const fileInfo = FILE_TYPE_LABELS[record.fileType];

              return (
                <Pressable key={record.id} onPress={() => Alert.alert(record.title, `${record.date}\n${record.provider}\n\nDocument viewing coming soon.`)}>
                  <View
                    style={[
                      styles.recordRow,
                      idx < group.records.length - 1 && styles.recordBorder,
                    ]}
                  >
                    {/* File type badge */}
                    <View
                      style={[
                        styles.fileTypeBadge,
                        { backgroundColor: `${fileInfo.color}22` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fileTypeText,
                          { color: fileInfo.color },
                        ]}
                      >
                        {fileInfo.label}
                      </Text>
                    </View>

                    {/* Record info */}
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordTitle}>{record.title}</Text>
                      <View style={styles.recordMeta}>
                        <Text style={styles.recordDate}>{record.date}</Text>
                        <Text style={styles.recordDot}>{"·"}</Text>
                        <Text style={styles.recordProvider}>
                          {record.provider}
                        </Text>
                      </View>
                    </View>

                    {/* Chevron */}
                    <Text style={styles.chevron}>{"›"}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ))}

        {/* Empty state for no search results */}
        {filteredGroups.length === 0 && searchQuery.length > 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{"🔍"}</Text>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyMessage}>
              No documents matching "{searchQuery}"
            </Text>
          </View>
        )}

        {/* Upload Button */}
        <Button
          title="Upload Document"
          variant="secondary"
          size="lg"
          style={styles.uploadButton}
          onPress={() => Alert.alert("Upload Document", "Upload functionality coming soon. Your coach can also upload documents on your behalf.")}
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

  /* Search */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: FontSizes.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  clearButton: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    padding: Spacing.xs,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },

  /* Summary */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  filterText: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
  },

  /* Sections */
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  groupIcon: {
    fontSize: FontSizes.lg,
  },
  countBadge: {
    backgroundColor: Colors.navyLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  countText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
  },

  /* Record rows */
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  recordBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  fileTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTypeText: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },
  recordInfo: {
    flex: 1,
    gap: 4,
  },
  recordTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  recordMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordDate: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  recordDot: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  recordProvider: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    flex: 1,
  },
  chevron: {
    fontSize: FontSizes.xl,
    color: Colors.silver,
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  emptyMessage: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
  },

  /* Upload */
  uploadButton: {
    marginTop: Spacing.xs,
  },
});
