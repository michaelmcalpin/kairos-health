/**
 * Billing & Subscription screen.
 *
 * Displays the client's current subscription details, plan status,
 * and subscription history with pull-to-refresh — all from real
 * backend data (clientPortal.payments). Pricing amounts are not
 * stored in the backend, so none are shown.
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  Crown,
  CreditCard,
  DollarSign,
  Receipt,
  Settings,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorView } from "@/components/ui/ErrorView";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTier(tier: string | null | undefined): string {
  if (!tier) return "Subscription";
  return tier
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
    case "paid":
      return Colors.success;
    case "pending":
    case "trialing":
      return Colors.warning;
    case "failed":
    case "cancelled":
    case "canceled":
    case "past_due":
      return Colors.danger;
    default:
      return Colors.silver;
  }
}

function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PaymentsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // ── tRPC: fetch subscription and billing history ──
  // getSubscription returns: { subscription: { id, tier, status, currentPeriodEnd, createdAt } | null, tier }
  const subscriptionQuery = trpc.clientPortal.payments.getSubscription.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // billingHistory returns: Array<{ id, tier, status, currentPeriodEnd, createdAt }>
  const billingQuery = trpc.clientPortal.payments.billingHistory.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

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

  // ── Loading state ──
  if (subscriptionQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (subscriptionQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load billing info"
          message="We couldn't reach the server. Please try again."
          onRetry={() => {
            subscriptionQuery.refetch();
            billingQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const data = subscriptionQuery.data as any;
  const subscription = data?.subscription ?? null;
  const profileTier: string | null = data?.tier ?? null;
  const billingHistory = ((billingQuery.data ?? []) as any[]);

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
        {subscription ? (
          <Card style={styles.subscriptionCard}>
            {/* Plan header */}
            <View style={styles.planHeader}>
              <View style={styles.planIconWrap}>
                <Crown size={22} color={Colors.gold} />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{formatTier(subscription.tier)}</Text>
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

            {/* Details grid */}
            <View style={styles.detailsGrid}>
              {formatDate(subscription.currentPeriodEnd) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconRow}>
                    <Calendar size={14} color={Colors.silver} />
                    <Text style={styles.detailLabel}>Current Period Ends</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatDate(subscription.currentPeriodEnd)}
                  </Text>
                </View>
              )}
              {formatDate(subscription.createdAt) && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconRow}>
                    <Clock size={14} color={Colors.silver} />
                    <Text style={styles.detailLabel}>Member Since</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatDate(subscription.createdAt)}
                  </Text>
                </View>
              )}
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
        ) : (
          <Card style={styles.subscriptionCard}>
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconWrap}>
                <Crown size={32} color={Colors.silver} />
              </View>
              <Text style={styles.emptyTitle}>No subscription on file</Text>
              <Text style={styles.emptySubtitle}>
                {profileTier
                  ? `Your profile is on the ${formatTier(profileTier)} tier, but no billing subscription is set up yet.`
                  : "You don't have an active subscription. Contact your care team or visit the web portal to get started."}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.manageButton,
                  styles.emptyManageButton,
                  pressed && styles.manageButtonPressed,
                ]}
                onPress={handleManageSubscription}
              >
                <Settings size={16} color={Colors.gold} />
                <Text style={styles.manageButtonText}>Contact Support</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* ─── Billing History ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>Subscription History</Text>

        {billingHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconWrap}>
                <Receipt size={32} color={Colors.silver} />
              </View>
              <Text style={styles.emptyTitle}>No Billing History</Text>
              <Text style={styles.emptySubtitle}>
                Your subscription history will appear here once your first
                billing cycle completes.
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
                      {formatTier(record.tier)}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(record.createdAt) ?? ""}
                    </Text>
                  </View>
                </View>

                {/* Right: status */}
                <View style={styles.historyRight}>
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
            Payment methods and invoices can be managed from the web portal
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
  center: {
    flex: 1,
    justifyContent: "center",
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
  emptyManageButton: {
    alignSelf: "stretch",
    marginTop: Spacing.md,
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
