/**
 * Appointment detail screen — displays full information for a single
 * appointment including provider, schedule, notes, and checklist.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Video,
  Clock,
  Calendar,
  User,
  MapPin,
  FileText,
  CheckSquare,
  Square,
  FlaskConical,
  ExternalLink,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { useAppointmentDetail, useCancelAppointment } from "@/hooks";

/* ------------------------------------------------------------------ */
/* Sample data                                                        */
/* ------------------------------------------------------------------ */

const SAMPLE_APPOINTMENT = {
  title: "Lab Review",
  type: "Lab Review",
  status: "Confirmed",
  date: "June 18, 2026",
  time: "2:30 PM",
  duration: "45 minutes",
  method: "In-Person" as const,
  address: "1250 Health Sciences Drive, Suite 400, San Francisco, CA 94143",
  provider: {
    name: "Dr. Sarah Chen",
    specialty: "Internal Medicine & Preventive Health",
    avatar: null,
  },
  notes:
    "Follow-up review of comprehensive blood panel from June 1. Will discuss lipid optimization strategy and potential adjustments to supplement protocol based on latest biomarker results.",
  checklist: [
    { id: "c1", text: "Fast for 12 hours before appointment", done: true },
    { id: "c2", text: "Bring recent lab results printout", done: false },
    { id: "c3", text: "List current supplements and medications", done: false },
    { id: "c4", text: "Prepare questions about LDL-P trend", done: true },
    { id: "c5", text: "Wear short sleeves for blood draw", done: false },
  ],
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { appointment: apiAppointment, isLoading, refetch } = useAppointmentDetail(id ?? null);
  const { cancel: cancelAppointment } = useCancelAppointment();

  const APPOINTMENT = apiAppointment
    ? {
        ...SAMPLE_APPOINTMENT,
        title: apiAppointment.title,
        type: apiAppointment.type,
        status: apiAppointment.status.charAt(0).toUpperCase() + apiAppointment.status.slice(1),
        date: apiAppointment.date,
        time: apiAppointment.time,
        method: apiAppointment.method as "Video Call" | "In-Person",
        provider: {
          ...SAMPLE_APPOINTMENT.provider,
          name: apiAppointment.provider,
        },
      }
    : SAMPLE_APPOINTMENT;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const [checklist, setChecklist] = useState(APPOINTMENT.checklist);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const completedCount = checklist.filter((i) => i.done).length;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
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
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* ---- Badges ---- */}
        <View style={styles.badges}>
          <Badge label={APPOINTMENT.type} variant="info" />
          <Badge label={APPOINTMENT.status} variant="success" />
        </View>

        {/* ---- Title ---- */}
        <Text style={styles.title}>{APPOINTMENT.title}</Text>

        {/* ---- Date / Time / Duration ---- */}
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Calendar size={16} color={Colors.gold} />
            <Text style={styles.scheduleText}>{APPOINTMENT.date}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Clock size={16} color={Colors.gold} />
            <Text style={styles.scheduleText}>
              {APPOINTMENT.time} ({APPOINTMENT.duration})
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <MapPin size={16} color={Colors.gold} />
            <Text style={styles.scheduleText}>{APPOINTMENT.method}</Text>
          </View>
        </Card>

        {/* ---- Provider Card ---- */}
        <Text style={styles.sectionTitle}>Provider</Text>
        <Card style={styles.providerCard}>
          <View style={styles.providerRow}>
            <View style={styles.avatar}>
              <User size={24} color={Colors.gold} />
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {APPOINTMENT.provider.name}
              </Text>
              <Text style={styles.providerSpec}>
                {APPOINTMENT.provider.specialty}
              </Text>
            </View>
          </View>
        </Card>

        {/* ---- Location / Method ---- */}
        <Text style={styles.sectionTitle}>Location</Text>
        <Card style={styles.locationCard}>
          {APPOINTMENT.method === "Video Call" ? (
            <View>
              <View style={styles.locationRow}>
                <Video size={18} color={Colors.info} />
                <Text style={styles.locationLabel}>Video Consultation</Text>
              </View>
              <Button
                title="Join Video Call"
                variant="primary"
                onPress={() => {
                  const url = (apiAppointment as any)?.meetingUrl || (apiAppointment as any)?.videoUrl;
                  if (url) {
                    Linking.openURL(url);
                  } else {
                    Alert.alert("Video Call", "The video call link will be available when your appointment begins.");
                  }
                }}
                icon={<ExternalLink size={16} color={Colors.dark} />}
                style={styles.joinBtn}
              />
            </View>
          ) : (
            <View>
              <View style={styles.locationRow}>
                <MapPin size={18} color={Colors.success} />
                <Text style={styles.locationLabel}>In-Person Visit</Text>
              </View>
              <Text style={styles.address}>{APPOINTMENT.address}</Text>
            </View>
          )}
        </Card>

        {/* ---- Notes ---- */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <Card style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <FileText size={16} color={Colors.silver} />
            <Text style={styles.notesLabel}>Appointment Notes</Text>
          </View>
          <Text style={styles.notesText}>{APPOINTMENT.notes}</Text>
        </Card>

        {/* ---- Pre-Appointment Checklist ---- */}
        <Text style={styles.sectionTitle}>
          Pre-Appointment Checklist ({completedCount}/{checklist.length})
        </Text>
        <Card style={styles.checklistCard}>
          {checklist.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[
                styles.checkItem,
                idx < checklist.length - 1 && styles.checkItemBorder,
              ]}
              onPress={() => toggleItem(item.id)}
            >
              {item.done ? (
                <CheckSquare size={20} color={Colors.success} />
              ) : (
                <Square size={20} color={Colors.silver} />
              )}
              <Text
                style={[
                  styles.checkText,
                  item.done && styles.checkTextDone,
                ]}
              >
                {item.text}
              </Text>
            </Pressable>
          ))}
        </Card>

        {/* ---- Actions ---- */}
        <View style={styles.actions}>
          <Button
            title="Reschedule"
            variant="secondary"
            onPress={() => Alert.alert("Reschedule", "Please contact your coach to reschedule this appointment.")}
            style={styles.actionBtn}
          />
          <Button
            title="Cancel"
            variant="danger"
            onPress={() => {
              Alert.alert(
                "Cancel Appointment",
                "Are you sure you want to cancel this appointment?",
                [
                  { text: "Keep", style: "cancel" },
                  { text: "Cancel Appointment", style: "destructive", onPress: () => {
                    cancelAppointment(id ?? "");
                    router.back();
                  }},
                ]
              );
            }}
            style={styles.actionBtn}
          />
        </View>
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

  /* Badges */
  badges: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  /* Title */
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.md,
  },

  /* Section title */
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.white,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  /* Schedule */
  scheduleCard: {
    gap: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  scheduleText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },

  /* Provider */
  providerCard: {},
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(74, 144, 217, 0.3)",
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 2,
  },
  providerSpec: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Location */
  locationCard: {},
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  locationLabel: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  address: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },
  joinBtn: {
    marginTop: Spacing.sm,
  },

  /* Notes */
  notesCard: {},
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  notesLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
  },
  notesText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    lineHeight: 22,
  },

  /* Checklist */
  checklistCard: {},
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
  },
  checkItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  checkText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },
  checkTextDone: {
    color: Colors.silver,
    textDecorationLine: "line-through",
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
});
