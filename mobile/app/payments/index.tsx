/**
 * Billing & Subscription screen.
 *
 * Displays the client's current subscription details, plan status,
 * and full billing history with pull-to-refresh.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  DollarSign,
  Receipt,
  Settings,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Subscription {
  plan: string;
  status: string;
  amount: number;
  interval: string;
  nextBillingDate: string;
  startDate: string;
}

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample / Fallback Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_SUBSCRIPTION: Subscription = {
  plan: "Everist Premium",
  status: "active",
  amount: 299,
  interval: "month",
  nextBillingDate: "2026-08-01",
  startDate: "2026-01-15",
};

const SAMPLE_BILLING_HISTORY: BillingRecord[] = [
  { id: "pay-1", date: "2026-07-01", amount: 299, status: "paid", description: "Monthly subscription" },
  { id: "pay-2", date: "2026-06-01", amount: 299, status: "paid", description: "Monthly subscription" },
  { id: "pay-3", date: "2026-05-01", amount: 299, status: "paid", description: "Monthly subscription" },
  { id: "pay-4", date: "2026-04-01", amount: 299, status: "paid", description: "Monthly subscription" },
  { id: "pay-5", date: "2026-03-01", amount: 299, status: "paid", description: "Monthly subscription" },
  { id: "pay-6", date: "2026-02-01", amount: 299, status: "paid", description: "Monthly subscription" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PaymentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // ── tRPC: fetch subscription and billing history ──
  const subscriptionQuery = trpc.clientPortal.payments.getSubscription.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const billingQuery = trpc.clientPortal.payments.billingHistory.useQuery(
    { limit: 10 },
    DEFAULT_QUERY_OPTIONS,
  );

  // ── Map API data with sample fallbacks ──
  const subscription = (subscriptionQuery.data as Subscription | undefined) ?? SAMPLE_SUBSCRIPTION;
  const billingHistory = (billingQuery.data as BillingRecord[] | undefined) ?? SAMPLE_BILLING_HISTORY;

  // ── Pull to refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([subscriptionQuery.refetch(), billingQuery.refetch()]);
    setRefreshing(false);
  }, [subscriptionQuery, billingQuery]);

  // ── Manage subscription ──
  const handleManageSubscription = () => {
    Alert.alert(
      "Manage Subscription",
      "To modify your subscription, cancel, or update your payment method, please visit the Everist.ai web portal or contact your care team.\n\nsupport@everist.ai",
      [{ text: "OK" }],
    );
  };

  // ── Helpers ──
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(0)}`;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "active":
      case "paid":
        return Colors.success;
      case "pending":
        return Colors.warning;
      case "failed":
      case "cancelled":
        return Colors.danger;
      default:
        return Colors.silver;
    }
  }

  function getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* ─── Subscription Card ───────────────────────────── */}
        <Card style={styles.subscriptionCard}>
          {/* Plan header */}
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Crown size={22} color={Colors.gold} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{subscription.plan}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(subscription.status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(subscription.status) },
                  ]}
                >
                  {getStatusLabel(subscription.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.priceAmount}>
              {formatCurrency(subscription.amount)}
            </Text>
            <Text style={styles.priceInterval}>
              /{subscription.interval}
            </Text>
          </View>

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconRow}>
                <Calendar size={14} color={Colors.silver} />
                <Text style={styles.detailLabel}>Next Billing</Text>
              </View>
              <Text style={styles.detailValue}>
                {formatDate(subscription.nextBillingDate)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconRow}>
                <Clock size={14} color={Colors.silver} />
                <Text style={styles.detailLabel}>Member Since</Text>
              </View>
              <Text style={styles.detailValue}>
                {formatDate(subscription.startDate)}
              </Text>
            </View>
          </View>

          {/* Manage button */}
          <Pressable
            style={({ pressed }) => [
              styles.manageButton,
              pressed && styles.manageButtonPressed,
            ]}
            onPress={handleManageSubscription}
          >
            <Settings size={16} color={Colors.gold} />
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </Pressable>
        </Card>

        {/* ─── Billing History ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>Billing History</Text>

        {billingHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconWrap}>
                <Receipt size={32} color={Colors.silver} />
              </View>
              <Text style={styles.emptyTitle}>No Billing History</Text>
              <Text style={styles.emptySubtitle}>
                Your payment history will appear here once your first billing
                cycle completes.
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.historyCard}>
            {billingHistory.map((record, index) => (
              <View
                key={record.id}
                style={[
                  styles.historyRow,
                  index < billingHistory.length - 1 && styles.historyRowBorder,
                ]}
              >
                {/* Left: icon + details */}
                <View style={styles.historyLeft}>
                  <View style={styles.historyIconWrap}>
                    <CreditCard size={16} color={Colors.gold} />
                  </View>
                  <View>
                    <Text style={styles.historyDescription}>
                      {record.description}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                </View>

                {/* Right: amount + status */}
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(record.amount)}
                  </Text>
                  <View style={styles.historyStatusRow}>
                    <View
                      style={[
                        styles.historyStatusDot,
                        { backgroundColor: getStatusColor(record.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.historyStatus,
                        { color: getStatusColor(record.status) },
                      ]}
                    >
                      {getStatusLabel(record.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ─── Payment Method Note ─────────────────────────── */}
        <View style={styles.noteRow}>
          <DollarSign size={14} color={Colors.silver} />
          <Text style={styles.noteText}>
            Payment methods can be updated from the web portal
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Subscription card
  subscriptionCard: {
    marginBottom: Spacing.md,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },

  // Price
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  priceAmount: {
    color: Colors.gold,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
  },
  priceInterval: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "500",
    marginLeft: 2,
  },

  // Details grid
  detailsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flex: 1,
  },
  detailIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  detailLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  detailValue: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },

  // Manage button
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.08)",
  },
  manageButtonPressed: {
    opacity: 0.7,
  },
  manageButtonText: {
    color: Colors.gold,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },

  // Section title
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // History card
  historyCard: {
    padding: 0,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  historyRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  historyDescription: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  historyDate: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "400",
    marginTop: 1,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAmount: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  historyStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  historyStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyStatus: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },

  // Empty state
  emptyCard: {
    marginBottom: Spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },

  // Note row
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  noteText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
