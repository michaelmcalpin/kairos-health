/**
 * Book Appointment — multi-step booking flow.
 *
 * Step 0: Select Provider
 * Step 1: Select Session Type
 * Step 2: Select Date & Time
 * Step 3: Confirm & Notes
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stethoscope,
  Utensils,
  Dumbbell,
  Heart,
  FlaskConical,
  ClipboardList,
  UserCheck,
  Salad,
  Video,
  MapPin,
} from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";

import { StepIndicator } from "@/components/appointments/StepIndicator";
import {
  ProviderCard,
  Provider,
} from "@/components/appointments/ProviderCard";
import {
  SessionTypeCard,
  SessionType,
} from "@/components/appointments/SessionTypeCard";
import { CalendarStrip } from "@/components/appointments/CalendarStrip";
import { TimeSlotGrid } from "@/components/appointments/TimeSlotGrid";
import { BookingSummary } from "@/components/appointments/BookingSummary";

/* ------------------------------------------------------------------ */
/* Data                                                               */
/* ------------------------------------------------------------------ */

const PROVIDERS: Provider[] = [
  {
    id: "prov-1",
    name: "Dr. Sarah Chen",
    specialty: "Internal Medicine",
    rating: 4.9,
    nextAvailable: "Next: Mon 10 AM",
    initials: "SC",
    avatarColor: "#2563EB",
  },
  {
    id: "prov-2",
    name: "Dr. Rachel Kim",
    specialty: "Nutrition",
    rating: 4.8,
    nextAvailable: "Next: Tue 2 PM",
    initials: "RK",
    avatarColor: "#16A34A",
  },
  {
    id: "prov-3",
    name: "Coach Walid",
    specialty: "Strength & Conditioning",
    rating: 5.0,
    nextAvailable: "Next: Wed 9 AM",
    initials: "CW",
    avatarColor: "#D97706",
  },
  {
    id: "prov-4",
    name: "Dr. James Park",
    specialty: "Cardiology",
    rating: 4.7,
    nextAvailable: "Next: Thu 11 AM",
    initials: "JP",
    avatarColor: "#DC2626",
  },
];

const SESSION_TYPES: SessionType[] = [
  {
    id: "type-1",
    name: "Consultation",
    duration: "30 min",
    price: "$150",
    description: "General health consultation with your provider",
    icon: Stethoscope,
  },
  {
    id: "type-2",
    name: "Lab Review",
    duration: "30 min",
    price: "$100",
    description: "Review and discuss recent lab results",
    icon: FlaskConical,
  },
  {
    id: "type-3",
    name: "Workout Assessment",
    duration: "60 min",
    price: "$200",
    description: "Comprehensive fitness evaluation and plan",
    icon: Dumbbell,
  },
  {
    id: "type-4",
    name: "Nutrition Plan",
    duration: "45 min",
    price: "$175",
    description: "Personalized dietary planning session",
    icon: Salad,
  },
  {
    id: "type-5",
    name: "Follow-up",
    duration: "15 min",
    price: "$75",
    description: "Quick check-in on treatment progress",
    icon: ClipboardList,
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookAppointmentScreen() {
  const router = useRouter();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0 — Provider
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

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

  // Booking mutation
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

  // Navigation
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return selectedProvider !== null;
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
    bookMutation.mutate({
      coachId: selectedProvider ?? "",
      coachName: provider?.name ?? "",
      sessionType: sessionType?.name ?? "",
      meetingType: method,
      date: selectedDate.toISOString().split("T")[0],
      startTime: selectedTime ?? "",
      notes: notes || undefined,
    });
  };

  // Helpers
  const provider = PROVIDERS.find((p) => p.id === selectedProvider);
  const sessionType = SESSION_TYPES.find((t) => t.id === selectedType);

  const formatDate = (date: Date): string => {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  /* ---------------------------------------------------------------- */
  /* Step renderers                                                   */
  /* ---------------------------------------------------------------- */

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Provider</Text>
            <Text style={styles.stepSubtitle}>
              Choose a health provider for your appointment
            </Text>
            {PROVIDERS.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                selected={selectedProvider === p.id}
                onSelect={() => setSelectedProvider(p.id)}
              />
            ))}
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Session Type</Text>
            <Text style={styles.stepSubtitle}>
              What type of appointment do you need?
            </Text>

            {SESSION_TYPES.map((t) => (
              <SessionTypeCard
                key={t.id}
                sessionType={t}
                selected={selectedType === t.id}
                onSelect={() => setSelectedType(t.id)}
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
              selectedDate={selectedDate}
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
              providerName={provider?.name ?? ""}
              sessionName={sessionType?.name ?? ""}
              date={formatDate(selectedDate)}
              time={selectedTime ?? ""}
              duration={sessionType?.duration ?? ""}
              price={sessionType?.price ?? ""}
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
              title="Confirm Booking"
              onPress={handleConfirm}
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
