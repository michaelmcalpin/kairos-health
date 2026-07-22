/**
 * Coach Profile screen.
 *
 * Displays the user's assigned coach profile with bio, specialties,
 * credentials, and the next scheduled session — all from real backend
 * data (clientPortal.settings.getMyCoach). When no coach is assigned
 * yet an honest empty state is shown instead of a fabricated profile.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Star,
  MessageCircle,
  Calendar,
  Award,
  Users,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatApptDate(raw?: string): string {
  if (!raw) return "";
  try {
    return new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function formatApptTime(raw?: string): string {
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

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function CoachProfileScreen() {
  const router = useRouter();

  /* -- tRPC queries -- */
  const coachQuery = trpc.clientPortal.settings.getMyCoach.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const appointmentsQuery = trpc.clientPortal.scheduling.listAppointments.useQuery(
    { filter: "upcoming" },
    DEFAULT_QUERY_OPTIONS,
  );

  /* -- Loading state -- */
  if (coachQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  /* -- Error state -- */
  if (coachQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load your coach"
          message="We couldn't reach the server. Please try again."
          onRetry={() => coachQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const coach = coachQuery.data as any;

  /* -- No coach assigned -- */
  if (!coach) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon={<Users size={40} color={Colors.gold} strokeWidth={1.5} />}
            title="No coach assigned yet"
            message="Once your care team assigns you a coach, their profile will appear here. Contact support if you think this is a mistake."
          />
        </View>
      </SafeAreaView>
    );
  }

  /* -- Real data mapping -- */
  const fullName = [coach.firstName, coach.lastName].filter(Boolean).join(" ");
  const initials =
    `${(coach.firstName ?? "")[0] ?? ""}${(coach.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?";
  const specialties: string[] = Array.isArray(coach.specialties) ? coach.specialties : [];
  const credentials: string[] = Array.isArray(coach.credentials)
    ? coach.credentials.map((c: any) => (typeof c === "string" ? c : c?.title ?? "")).filter(Boolean)
    : [];
  const rating: number | null = coach.rating != null ? Number(coach.rating) : null;
  const reviewCount: number = coach.reviewCount ?? 0;
  const since: string | null = coach.since
    ? new Date(coach.since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const upcomingAppointments = (appointmentsQuery.data ?? []) as any[];
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const handleMessage = () => {
    router.push("/(tabs)/chat");
  };

  const handleBookSession = () => {
    router.push("/appointments/book");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE HEADER                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.headerCard}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Name */}
          <Text style={styles.coachName}>{fullName || coach.email}</Text>
          {since && (
            <Text style={styles.coachTitle}>Your coach since {since}</Text>
          )}

          {/* Rating — only when the coach actually has one */}
          {rating != null && (
            <View style={styles.ratingRow}>
              <Star size={16} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount > 0 && (
                <Text style={styles.reviewCountText}>
                  ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                </Text>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Button
              title="Message"
              variant="secondary"
              size="md"
              icon={<MessageCircle size={16} color={Colors.gold} />}
              onPress={handleMessage}
              style={styles.actionBtn}
            />
            <Button
              title="Book Session"
              variant="primary"
              size="md"
              icon={<Calendar size={16} color={Colors.dark} />}
              onPress={handleBookSession}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ABOUT                                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {!!coach.bio && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{coach.bio}</Text>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SPECIALTIES                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {specialties.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.badgeWrap}>
              {specialties.map((s) => (
                <View key={s} style={styles.specialtyBadge}>
                  <Text style={styles.specialtyText}>{s}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CREDENTIALS                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {credentials.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Award size={18} color={Colors.gold} />
              <Text style={styles.sectionTitle}>Credentials</Text>
            </View>
            {credentials.map((c, i) => (
              <View
                key={c}
                style={[
                  styles.credentialRow,
                  i < credentials.length - 1 && styles.credentialBorder,
                ]}
              >
                <View style={styles.credentialDot} />
                <Text style={styles.credentialTitle}>{c}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* NEXT SESSION                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Next Session</Text>
          </View>
          {nextAppointment ? (
            <View style={styles.nextSessionRow}>
              <Text style={styles.nextSessionTitle}>
                {(nextAppointment.sessionType ?? "Session")
                  .split("_")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </Text>
              <Text style={styles.nextSessionTime}>
                {formatApptDate(nextAppointment.date)} at {formatApptTime(nextAppointment.startTime)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noSessionText}>
              No upcoming sessions scheduled. Book a session to get started.
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },

  /* -- Header card -- */
  headerCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  avatarText: {
    color: Colors.gold,
    fontSize: 32,
    fontWeight: "700",
  },
  coachName: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  coachTitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.lg,
  },
  ratingValue: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    marginLeft: 4,
  },
  reviewCountText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },

  /* -- Section cards -- */
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },

  /* -- About -- */
  bioText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },

  /* -- Specialties -- */
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  specialtyBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(74, 144, 217, 0.25)",
  },
  specialtyText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },

  /* -- Credentials -- */
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  credentialBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  credentialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  credentialTitle: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },

  /* -- Next session -- */
  nextSessionRow: {
    gap: 4,
  },
  nextSessionTitle: {
    color: Colors.gold,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  nextSessionTime: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
  },
  noSessionText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
