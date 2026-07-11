/**
 * Appointments list — upcoming and past appointments with providers.
 *
 * Tab selector toggles between upcoming and past views.
 * FAB button for booking new appointments.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  Video,
  MapPin,
  Plus,
  Clock,
  User,
  Utensils,
  FlaskConical,
  Dumbbell,
  Stethoscope,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { useAppointments } from "@/hooks";

/* ------------------------------------------------------------------ */
/* Sample data is provided by the useAppointments hook as fallback     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { appointments: upcomingData, isLoading: loadingUp, refetch: refetchUp } = useAppointments("upcoming");
  const { appointments: pastData, isLoading: loadingPast, refetch: refetchPast } = useAppointments("past");

  const mapIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("nutrition")) return Utensils;
    if (lower.includes("lab")) return FlaskConical;
    if (lower.includes("fitness") || lower.includes("workout") || lower.includes("exercise")) return Dumbbell;
    if (lower.includes("sleep")) return Clock;
    return Stethoscope;
  };

  const rawAppointments = activeTab === "upcoming" ? upcomingData : pastData;
  const appointments = rawAppointments.map((apt) => ({
    ...apt,
    icon: mapIcon(apt.type),
  }));
  const isLoading = activeTab === "upcoming" ? loadingUp : loadingPast;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchUp(), refetchPast()]);
    setRefreshing(false);
  }, [refetchUp, refetchPast]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Calendar size={24} color={Colors.gold} />
          </View>
          <Text style={styles.headerTitle}>Appointments</Text>
        </View>
        <Text style={styles.headerSub}>
          Manage your health provider consultations
        </Text>

        {/* ---- Tab Selector ---- */}
        <View style={styles.tabs}>
          {(["upcoming", "past"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "upcoming" ? "Upcoming" : "Past"}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* ---- Appointment Cards ---- */}
        {appointments.map((apt) => {
          const Icon = apt.icon;
          return (
            <Pressable
              key={apt.id}
              onPress={() => router.push({ pathname: "/appointments/detail", params: { id: apt.id } })}
            >
              <Card style={styles.aptCard}>
                <View style={styles.aptTop}>
                  <Badge
                    label={apt.type}
                    variant={apt.badgeVariant}
                  />
                  <Text style={styles.aptStatus}>
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </Text>
                </View>

                <Text style={styles.aptTitle}>{apt.title}</Text>

                <View style={styles.aptRow}>
                  <User size={14} color={Colors.silver} />
                  <Text style={styles.aptDetail}>{apt.provider}</Text>
                </View>

                <View style={styles.aptRow}>
                  <Calendar size={14} color={Colors.silver} />
                  <Text style={styles.aptDetail}>
                    {apt.date} at {apt.time}
                  </Text>
                </View>

                <View style={styles.aptRow}>
                  {apt.method === "Video Call" ? (
                    <Video size={14} color={Colors.info} />
                  ) : (
                    <MapPin size={14} color={Colors.success} />
                  )}
                  <Text
                    style={[
                      styles.aptDetail,
                      {
                        color:
                          apt.method === "Video Call"
                            ? Colors.info
                            : Colors.success,
                      },
                    ]}
                  >
                    {apt.method}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {appointments.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No appointments to display</Text>
          </View>
        )}
      </ScrollView>

      {/* ---- FAB ---- */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/appointments/book")}
      >
        <Plus size={28} color={Colors.dark} />
      </Pressable>
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
    paddingBottom: 100,
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

  /* Tabs */
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radii.sm,
  },
  tabActive: {
    backgroundColor: Colors.navyLight,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
  },
  tabTextActive: {
    color: Colors.gold,
  },

  /* Appointment card */
  aptCard: {
    marginBottom: Spacing.sm,
  },
  aptTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  aptStatus: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontWeight: "500",
  },
  aptTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  aptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 6,
  },
  aptDetail: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Loading */
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },

  /* Empty */
  empty: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
  },

  /* FAB */
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
