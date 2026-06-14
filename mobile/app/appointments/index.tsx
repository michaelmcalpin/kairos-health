/**
 * Appointments list — upcoming and past appointments with providers.
 *
 * Tab selector toggles between upcoming and past views.
 * FAB button for booking new appointments.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
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

/* ------------------------------------------------------------------ */
/* Sample data                                                        */
/* ------------------------------------------------------------------ */

type AppointmentMethod = "Video Call" | "In-Person";

interface Appointment {
  id: string;
  title: string;
  type: string;
  provider: string;
  date: string;
  time: string;
  method: AppointmentMethod;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  badgeVariant: "success" | "warning" | "info" | "default" | "danger";
  icon: React.ComponentType<{ size: number; color: string }>;
}

const UPCOMING: Appointment[] = [
  {
    id: "apt-1",
    title: "Nutrition Consultation",
    type: "Nutrition",
    provider: "Dr. Rachel Kim",
    date: "June 15, 2026",
    time: "10:00 AM",
    method: "Video Call",
    status: "confirmed",
    badgeVariant: "warning",
    icon: Utensils,
  },
  {
    id: "apt-2",
    title: "Lab Review",
    type: "Lab Review",
    provider: "Dr. Sarah Chen",
    date: "June 18, 2026",
    time: "2:30 PM",
    method: "In-Person",
    status: "confirmed",
    badgeVariant: "success",
    icon: FlaskConical,
  },
  {
    id: "apt-3",
    title: "Workout Assessment",
    type: "Fitness",
    provider: "Coach Walid",
    date: "June 20, 2026",
    time: "9:00 AM",
    method: "Video Call",
    status: "pending",
    badgeVariant: "info",
    icon: Dumbbell,
  },
];

const PAST: Appointment[] = [
  {
    id: "apt-4",
    title: "Annual Physical",
    type: "General",
    provider: "Dr. Sarah Chen",
    date: "May 20, 2026",
    time: "11:00 AM",
    method: "In-Person",
    status: "completed",
    badgeVariant: "default",
    icon: Stethoscope,
  },
  {
    id: "apt-5",
    title: "Sleep Consultation",
    type: "Sleep",
    provider: "Dr. James Park",
    date: "May 12, 2026",
    time: "3:00 PM",
    method: "Video Call",
    status: "completed",
    badgeVariant: "default",
    icon: Clock,
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const appointments = activeTab === "upcoming" ? UPCOMING : PAST;

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

        {/* ---- Appointment Cards ---- */}
        {appointments.map((apt) => {
          const Icon = apt.icon;
          return (
            <Pressable
              key={apt.id}
              onPress={() => router.push("/appointments/detail")}
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
    backgroundColor: "rgba(200, 169, 81, 0.15)",
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
