/**
 * Book Appointment — multi-step booking flow wired to real backend data.
 *
 * Step 0: Your Coach (from clientPortal.settings.getMyCoach)
 * Step 1: Session Type (from clientPortal.scheduling.getSessionTypes)
 * Step 2: Date & Time  (from clientPortal.scheduling.getAvailableSlots)
 * Step 3: Confirm & Notes (books via clientPortal.scheduling.bookAppointment)
 *
 * If no coach is assigned, an honest "You need an assigned coach" state
 * is shown instead of a hardcoded provider list.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stethoscope,
  FlaskConical,
  ClipboardList,
  FileText,
  Target,
  MessageCircle,
  Video,
  MapPin,
} from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";

import { StepIndicator } from "@/components/appointments/StepIndicator";
import {
  SessionTypeCard,
  SessionType,
} from "@/components/appointments/SessionTypeCard";
import { CalendarStrip } from "@/components/appointments/CalendarStrip";
import { TimeSlotGrid, TimeSlot } from "@/components/appointments/TimeSlotGrid";
import { BookingSummary } from "@/components/appointments/BookingSummary";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const SESSION_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  initial_consultation: Stethoscope,
  follow_up: ClipboardList,
  protocol_review: FileText,
  lab_review: FlaskConical,
  goal_setting: Target,
  ad_hoc: MessageCircle,
};

/** Local (device-timezone) YYYY-MM-DD, avoiding UTC day-shift. */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHHMM(raw: string): string {
  try {
    const [h, m] = raw.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return raw;
  }
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookAppointmentScreen() {
  const router = useRouter();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 — Session type + method
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [method, setMethod] = useState<"Video Call" | "In-Person">(
    "Video Call"
  );

  // Step 2 — Date & time
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 3 — Notes
  const [notes, setNotes] = useState("");

  /* ---- Queries ---- */
  const coachQuery = trpc.clientPortal.settings.getMyCoach.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );
  const sessionTypesQuery = trpc.clientPortal.scheduling.getSessionTypes.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );

  const coach = coachQuery.data as any;
  const rawSessionTypes = (sessionTypesQuery.data ?? []) as any[];

  // Map backend session types → SessionTypeCard shape (no fabricated prices)
  const sessionTypes: SessionType[] = rawSessionTypes.map((t) => ({
    id: t.id,
    name: t.label,
    duration: `${t.duration} min`,
    description: t.description ?? "",
    icon: SESSION_TYPE_ICONS[t.id] ?? Stethoscope,
  }));

  const sessionType = sessionTypes.find((t) => t.id === selectedType);
  const selectedTypeRaw = rawSessionTypes.find((t) => t.id === selectedType);
  const durationMinutes: number = selectedTypeRaw?.duration ?? 60;

  const dateString = toDateString(selectedDate);

  const slotsQuery = trpc.clientPortal.scheduling.getAvailableSlots.useQuery(
    {
      coachId: coach?.id ?? "",
      date: dateString,
      durationMinutes,
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      staleTime: 30_000,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && !!coach?.id && !!selectedType,
    } as any,
  );

  // Backend returns: Array<{ start, end, startUtc?, endUtc?, coachTimezone? }>
  const slots: TimeSlot[] = ((slotsQuery.data ?? []) as any[]).map((s) => ({
    value: s.start,
    label: s.startUtc
      ? new Date(s.startUtc).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : formatHHMM(s.start),
  }));
  const selectedSlotLabel =
    slots.find((s) => s.value === selectedTime)?.label ??
    (selectedTime ? formatHHMM(selectedTime) : "");

  /* ---- Booking mutation ---- */
  const bookMutation = trpc.clientPortal.scheduling.bookAppointment.useMutation({
    onSuccess: () => {
      Alert.alert(
        "Booking Confirmed",
        "Your appointment has been booked successfully. You will receive a confirmation shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert("Booking Failed", error?.message ?? "Something went wrong. Please try again.");
    },
  });

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  /* ---- Loading / error / no-coach gates ---- */
  if (coachQuery.isLoading || sessionTypesQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (coachQuery.error) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load booking info"
          message="We couldn't reach the server. Please try again."
          onRetry={() => {
            coachQuery.refetch();
            sessionTypesQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="clipboard"
            title="You need an assigned coach to book"
            message="Once your care team assigns you a coach, you'll be able to book sessions with them here."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const coachName = [coach.firstName, coach.lastName].filter(Boolean).join(" ") || coach.email;
  const coachInitials =
    `${(coach.firstName ?? "")[0] ?? ""}${(coach.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?";

  // Navigation
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return true; // coach is always the assigned coach
      case 1:
        return selectedType !== null;
      case 2:
        return selectedTime !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    if (currentStep < 3) {
      animateTransition(() => setCurrentStep((s) => s + 1));
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep((s) => s - 1));
    } else {
      router.back();
    }
  };

  const handleConfirm = () => {
    if (!selectedType || !selectedTime) return;
    bookMutation.mutate({
      coachId: coach.id,
      coachName,
      sessionType: selectedType,
      meetingType: method === "Video Call" ? "video" : "in_person",
      date: dateString,
      startTime: selectedTime,
      notes: notes || "",
    });
  };

  /* ---------------------------------------------------------------- */
  /* Step renderers                                                   */
  /* ---------------------------------------------------------------- */

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Your Coach</Text>
            <Text style={styles.stepSubtitle}>
              Sessions are booked with your assigned coach
            </Text>

            <View style={styles.coachCard}>
              <View style={styles.coachAvatar}>
                <Text style={styles.coachAvatarText}>{coachInitials}</Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{coachName}</Text>
                {Array.isArray(coach.specialties) && coach.specialties.length > 0 && (
                  <Text style={styles.coachSpecialty}>
                    {coach.specialties.join(" · ")}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Session Type</Text>
            <Text style={styles.stepSubtitle}>
              What type of appointment do you need?
            </Text>

            {sessionTypes.map((t) => (
              <SessionTypeCard
                key={t.id}
                sessionType={t}
                selected={selectedType === t.id}
                onSelect={() => {
                  setSelectedType(t.id);
                  setSelectedTime(null); // duration change invalidates slots
                }}
              />
            ))}

            {/* Method toggle */}
            <View style={styles.methodSection}>
              <Text style={styles.methodLabel}>Appointment Method</Text>
              <View style={styles.methodToggle}>
                <Pressable
                  style={[
                    styles.methodOption,
                    method === "Video Call" && styles.methodOptionActive,
                  ]}
                  onPress={() => setMethod("Video Call")}
                >
                  <Video
                    size={16}
                    color={
                      method === "Video Call" ? Colors.dark : Colors.silver
                    }
                  />
                  <Text
                    style={[
                      styles.methodText,
                      method === "Video Call" && styles.methodTextActive,
                    ]}
                  >
                    Video Call
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.methodOption,
                    method === "In-Person" && styles.methodOptionActive,
                  ]}
                  onPress={() => setMethod("In-Person")}
                >
                  <MapPin
                    size={16}
                    color={
                      method === "In-Person" ? Colors.dark : Colors.silver
                    }
                  />
                  <Text
                    style={[
                      styles.methodText,
                      method === "In-Person" && styles.methodTextActive,
                    ]}
                  >
                    In-Person
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Date & Time</Text>
            <Text style={styles.stepSubtitle}>
              Pick a date and available time slot
            </Text>

            <CalendarStrip
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null); // Reset time on date change
              }}
            />

            <TimeSlotGrid
              slots={slots}
              loading={slotsQuery.isLoading || slotsQuery.isFetching}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
            />
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Confirm Booking</Text>
            <Text style={styles.stepSubtitle}>
              Review your appointment details
            </Text>

            <BookingSummary
              providerName={coachName}
              sessionName={sessionType?.name ?? ""}
              date={formatLongDate(selectedDate)}
              time={selectedSlotLabel}
              duration={sessionType?.duration ?? ""}
              method={method}
              notes={notes}
              onNotesChange={setNotes}
            />
          </View>
        );

      default:
        return null;
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Animated content */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>
              {currentStep === 0 ? "Cancel" : "Back"}
            </Text>
          </Pressable>

          {currentStep < 3 ? (
            <Button
              title="Next"
              onPress={handleNext}
              disabled={!canGoNext()}
              size="lg"
              style={styles.nextButton}
            />
          ) : (
            <Button
              title={bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              onPress={handleConfirm}
              disabled={bookMutation.isPending}
              size="lg"
              style={styles.confirmButton}
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },

  /* Step content */
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginBottom: Spacing.lg,
  },

  /* Coach card */
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    padding: Spacing.md,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  coachAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.gold,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 2,
  },
  coachSpecialty: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Method toggle */
  methodSection: {
    marginTop: Spacing.md,
  },
  methodLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodToggle: {
    flexDirection: "row",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    padding: 4,
  },
  methodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radii.sm,
  },
  methodOptionActive: {
    backgroundColor: Colors.gold,
  },
  methodText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silver,
  },
  methodTextActive: {
    color: Colors.dark,
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.dark,
    gap: Spacing.sm,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  backText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.silver,
  },
  nextButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
