/**
 * Medications screen.
 *
 * Shows medication items from the client's active protocol
 * (protocol items with category === "medication") and lets the
 * client add their own via the unified Add Item screen.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Pill, MessageCircle, Clock } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MedicationsScreen() {
  const router = useRouter();

  // Medications live in the protocol as items with category "medication"
  const protocolQuery = trpc.clientPortal.protocol.getActive.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const medications = ((protocolQuery.data as any)?.items ?? []).filter(
    (item: any) => item.category === "medication",
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await protocolQuery.refetch();
    setRefreshing(false);
  }, [protocolQuery]);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Medications" }} />

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
        {medications.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Pill size={48} color={Colors.silver} />
            </View>
            <Text style={styles.emptyTitle}>No medications tracked yet</Text>
            <Text style={styles.emptyMessage}>
              Add your medications below to track them alongside your
              supplements and peptides in your daily protocol.
            </Text>
          </View>
        ) : (
          /* Medication list */
          medications.map((med: any) => (
            <Card key={med.id} style={styles.medCard}>
              <View style={styles.medRow}>
                <View style={styles.medIconWrap}>
                  <Pill size={20} color="#4A90D9" />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>
                    {[med.dosage && `${med.dosage}${med.unit ? ` ${med.unit}` : ""}`, med.frequency]
                      .filter(Boolean)
                      .join(" · ") || "No dosage set"}
                  </Text>
                </View>
                {med.timeOfDay ? (
                  <View style={styles.timeBadge}>
                    <Clock size={12} color={Colors.gold} />
                    <Text style={styles.timeText}>{med.timeOfDay}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))
        )}

        {/* Add Medication */}
        <Button
          title="Add Medication"
          variant="secondary"
          size="lg"
          style={styles.ctaButton}
          onPress={() => router.push("/protocols/add-item?category=medication" as any)}
        />

        {/* Talk to Coach */}
        <Button
          title="Talk to Your Coach"
          variant="primary"
          size="lg"
          style={styles.ctaButton}
          icon={<MessageCircle size={18} color={Colors.dark} />}
          onPress={() => router.push("/coach")}
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

  /* Empty State */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyMessage: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },

  /* Medication cards */
  medCard: {
    paddingVertical: Spacing.md,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  medDetail: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: "rgba(201, 169, 78, 0.12)",
  },
  timeText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },

  /* CTA */
  ctaButton: {
    marginTop: Spacing.xs,
  },
});
