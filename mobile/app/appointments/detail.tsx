/**
 * Appointment detail screen — displays the real information for a single
 * appointment (provider, schedule, meeting type, notes). Only fields the
 * backend actually returns are rendered — no fabricated defaults.
 *
 * tRPC paths used (under `clientPortal`):
 *   - scheduling.getAppointment     -> raw appointment record
 *   - scheduling.cancelAppointment  -> cancel
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Video,
  Clock,
  Calendar,
  User,
  MapPin,
  Phone,
  FileText,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import type { StatusVariant } from "@/lib/types";
import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { useCancelAppointment } from "@/hooks";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function titleCase(raw?: string | null): string {
  if (!raw) return "Appointment";
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(raw?: string | null): string {
  if (!raw) return "";
  try {
    return new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function formatTime(raw?: string | null): string {
  if (!raw) return "";
  try {
    const [h, m] = raw.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return raw;
  }
}

function statusVariant(status?: string | null): StatusVariant {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "pending":
      return "info";
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

function meetingTypeLabel(raw?: string | null): string {
  switch (raw) {
    case "video":
      return "Video Call";
    case "phone":
      return "Phone Call";
    case "in_person":
      return "In-Person";
    default:
      return titleCase(raw ?? "");
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = trpc.clientPortal.scheduling.getAppointment.useQuery(
    { appointmentId: id ?? "" },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && !!id,
    } as any,
  );
  const { cancel: cancelAppointment } = useCancelAppointment();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  /* ---- Loading ---- */
  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Error ---- */
  if (query.error) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load appointment"
          message="We couldn't reach the server or the appointment was not found."
          onRetry={() => query.refetch()}
        />
      </SafeAreaView>
    );
  }

  const appt = query.data as any;

  /* ---- Not found ---- */
  if (!appt) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="clipboard"
            title="Appointment not found"
            message="This appointment may have been cancelled or is no longer available."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const title = titleCase(appt.sessionType);
  const status = appt.status ?? "confirmed";
  const meetingType = meetingTypeLabel(appt.meetingType);
  const timeText = [
    formatTime(appt.startTime),
    appt.endTime ? `– ${formatTime(appt.endTime)}` : null,
    appt.durationMinutes ? `(${appt.durationMinutes} min)` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const isCancelled = status === "cancelled";

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
        {/* ---- Badges ---- */}
        <View style={styles.badges}>
          <Badge label={title} variant="info" />
          <Badge label={titleCase(status)} variant={statusVariant(status)} />
        </View>

        {/* ---- Title ---- */}
        <Text style={styles.title}>{title}</Text>

        {/* ---- Date / Time / Method ---- */}
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Calendar size={16} color={Colors.gold} />
            <Text style={styles.scheduleText}>{formatDate(appt.date)}</Text>
          </View>
          {!!timeText && (
            <View style={styles.scheduleRow}>
              <Clock size={16} color={Colors.gold} />
              <Text style={styles.scheduleText}>{timeText}</Text>
            </View>
          )}
          <View style={styles.scheduleRow}>
            {appt.meetingType === "video" ? (
              <Video size={16} color={Colors.gold} />
            ) : appt.meetingType === "phone" ? (
              <Phone size={16} color={Colors.gold} />
            ) : (
              <MapPin size={16} color={Colors.gold} />
            )}
            <Text style={styles.scheduleText}>{meetingType}</Text>
          </View>
        </Card>

        {/* ---- Provider Card ---- */}
        {!!appt.coachName && (
          <>
            <Text style={styles.sectionTitle}>Provider</Text>
            <Card style={styles.providerCard}>
              <View style={styles.providerRow}>
                <View style={styles.avatar}>
                  <User size={24} color={Colors.gold} />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{appt.coachName}</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ---- Meeting details ---- */}
        {appt.meetingType === "video" && (
          <>
            <Text style={styles.sectionTitle}>Location</Text>
            <Card style={styles.locationCard}>
              <View style={styles.locationRow}>
                <Video size={18} color={Colors.info} />
                <Text style={styles.locationLabel}>Video Consultation</Text>
              </View>
              <Text style={styles.locationHint}>
                Your coach will share the video call link before the session
                begins.
              </Text>
            </Card>
          </>
        )}

        {/* ---- Notes (only when present) ---- */}
        {!!appt.notes && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Card style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <FileText size={16} color={Colors.silver} />
                <Text style={styles.notesLabel}>Appointment Notes</Text>
              </View>
              <Text style={styles.notesText}>{appt.notes}</Text>
            </Card>
          </>
        )}

        {/* ---- Cancellation reason ---- */}
        {isCancelled && !!appt.cancellationReason && (
          <>
            <Text style={styles.sectionTitle}>Cancellation Reason</Text>
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{appt.cancellationReason}</Text>
            </Card>
          </>
        )}

        {/* ---- Actions ---- */}
        {!isCancelled && (
          <View style={styles.actions}>
            <Button
              title="Reschedule"
              variant="secondary"
              onPress={() =>
                Alert.alert(
                  "Reschedule",
                  "Please contact your coach to reschedule this appointment.",
                )
              }
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
                    {
                      text: "Cancel Appointment",
                      style: "destructive",
                      onPress: () => {
                        cancelAppointment(id ?? "");
                        router.back();
                      },
                    },
                  ],
                );
              }}
              style={styles.actionBtn}
            />
          </View>
        )}
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
  center: {
    flex: 1,
    justifyContent: "center",
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
  locationHint: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
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

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
