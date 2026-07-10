/**
 * Coach Profile screen.
 *
 * Displays the user's assigned coach profile with bio, specialties,
 * credentials, current plan, availability, and client reviews.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Star,
  MessageCircle,
  Calendar,
  Award,
  Clock,
  Dumbbell,
  ChevronRight,
  User,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const FALLBACK_COACH = {
  initials: "WK",
  name: "Coach Walid Kherat",
  title: "Certified Strength & Conditioning Specialist",
  rating: 5.0,
  reviewCount: 47,
  bio: "15+ years of experience in functional fitness, sports performance, and longevity-focused training. CSCS, NASM-CPT certified. Specializing in evidence-based protocols for health optimization.",
};

const SPECIALTIES = [
  "Strength Training",
  "Nutrition",
  "Longevity",
  "Functional Movement",
  "Body Composition",
];

const CREDENTIALS = [
  { title: "CSCS", issuer: "NSCA" },
  { title: "NASM-CPT", issuer: "" },
  { title: "Precision Nutrition Level 2", issuer: "" },
  { title: "FMS Certified", issuer: "" },
];

const PLAN = {
  program: "Hypertrophy + Longevity",
  totalWeeks: 12,
  currentWeek: 8,
  nextSession: "Tuesday, Jun 16 at 10:00 AM",
  sessionsRemaining: 4,
};

const AVAILABILITY = [
  { days: "Mon / Wed / Fri", hours: "9:00 AM - 5:00 PM" },
  { days: "Tue / Thu", hours: "10:00 AM - 6:00 PM" },
];

const REVIEWS = [
  {
    id: "1",
    name: "Jason M.",
    rating: 5,
    date: "May 2026",
    text: "Walid completely transformed my approach to training. His longevity-focused programming helped me drop 15 lbs while getting stronger than ever. Highly recommend.",
  },
  {
    id: "2",
    name: "Sarah L.",
    rating: 5,
    date: "Apr 2026",
    text: "Incredibly knowledgeable and attentive. He adjusts my program based on my recovery data and sleep scores. Best coach I've ever worked with.",
  },
  {
    id: "3",
    name: "David K.",
    rating: 5,
    date: "Mar 2026",
    text: "The combination of strength training and nutrition guidance has been game-changing. My bloodwork numbers improved significantly in just 3 months.",
  },
];

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

  /* -- Map API response to display variables, fall back to hardcoded data -- */
  const coachData = coachQuery.data;
  const COACH = coachData
    ? {
        initials: `${(coachData.firstName ?? "")[0] ?? ""}${(coachData.lastName ?? "")[0] ?? ""}`.toUpperCase() || FALLBACK_COACH.initials,
        name: coachData.displayName ?? (`Coach ${coachData.firstName ?? ""} ${coachData.lastName ?? ""}`.trim() || FALLBACK_COACH.name),
        title: coachData.title ?? FALLBACK_COACH.title,
        rating: coachData.rating ?? FALLBACK_COACH.rating,
        reviewCount: coachData.reviewCount ?? FALLBACK_COACH.reviewCount,
        bio: coachData.bio ?? FALLBACK_COACH.bio,
      }
    : FALLBACK_COACH;

  const upcomingAppointments = appointmentsQuery.data ?? [];
  const nextAppointment = Array.isArray(upcomingAppointments) && upcomingAppointments.length > 0
    ? upcomingAppointments[0]
    : null;

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
            <Text style={styles.avatarText}>{COACH.initials}</Text>
          </View>

          {/* Name & title */}
          <Text style={styles.coachName}>{COACH.name}</Text>
          <Text style={styles.coachTitle}>{COACH.title}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                color={Colors.gold}
                fill={Colors.gold}
              />
            ))}
            <Text style={styles.ratingValue}>{COACH.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>
              ({COACH.reviewCount} reviews)
            </Text>
          </View>

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
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{COACH.bio}</Text>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SPECIALTIES                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.badgeWrap}>
            {SPECIALTIES.map((s) => (
              <View key={s} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>{s}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CREDENTIALS                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Award size={18} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Credentials</Text>
          </View>
          {CREDENTIALS.map((c, i) => (
            <View
              key={c.title}
              style={[
                styles.credentialRow,
                i < CREDENTIALS.length - 1 && styles.credentialBorder,
              ]}
            >
              <View style={styles.credentialDot} />
              <Text style={styles.credentialTitle}>
                {c.title}
                {c.issuer ? (
                  <Text style={styles.credentialIssuer}> - {c.issuer}</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* YOUR PLAN                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Dumbbell size={18} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Your Plan</Text>
          </View>

          {/* Program name + progress */}
          <View style={styles.planProgramRow}>
            <Text style={styles.planProgramName}>{PLAN.program}</Text>
            <Text style={styles.planWeekLabel}>
              Week {PLAN.currentWeek} of {PLAN.totalWeeks}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(PLAN.currentWeek / PLAN.totalWeeks) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Plan details */}
          <View style={styles.planDetailRow}>
            <Calendar size={14} color={Colors.silver} />
            <Text style={styles.planDetailLabel}>Next session</Text>
            <Text style={styles.planDetailValue}>{PLAN.nextSession}</Text>
          </View>
          <View style={styles.planDetailRow}>
            <Clock size={14} color={Colors.silver} />
            <Text style={styles.planDetailLabel}>Sessions remaining</Text>
            <Text style={styles.planDetailValue}>
              {PLAN.sessionsRemaining} this month
            </Text>
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* AVAILABILITY                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Availability</Text>
          </View>
          {AVAILABILITY.map((slot, i) => (
            <View
              key={slot.days}
              style={[
                styles.availRow,
                i < AVAILABILITY.length - 1 && styles.availBorder,
              ]}
            >
              <Text style={styles.availDays}>{slot.days}</Text>
              <Text style={styles.availHours}>{slot.hours}</Text>
            </View>
          ))}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* REVIEWS                                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Star size={18} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Reviews</Text>
          </View>

          {REVIEWS.map((review, i) => (
            <View
              key={review.id}
              style={[
                styles.reviewItem,
                i < REVIEWS.length - 1 && styles.reviewBorder,
              ]}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthorRow}>
                  <View style={styles.reviewAvatar}>
                    <User size={14} color={Colors.silver} />
                  </View>
                  <Text style={styles.reviewAuthor}>{review.name}</Text>
                </View>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <View style={styles.reviewStars}>
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star
                    key={j}
                    size={12}
                    color={Colors.gold}
                    fill={Colors.gold}
                  />
                ))}
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
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
  credentialIssuer: {
    color: Colors.silver,
    fontWeight: "400",
  },

  /* -- Your Plan -- */
  planProgramRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  planProgramName: {
    color: Colors.gold,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  planWeekLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.navyLight,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  planDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  planDetailLabel: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  planDetailValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },

  /* -- Availability -- */
  availRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  availBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  availDays: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  availHours: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
  },

  /* -- Reviews -- */
  reviewItem: {
    paddingVertical: Spacing.sm,
  },
  reviewBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.xs,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAuthor: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  reviewDate: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 6,
  },
  reviewText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
