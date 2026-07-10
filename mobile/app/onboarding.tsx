/**
 * Multi-step onboarding flow for the Everist.ai mobile app.
 *
 * Steps:
 *   1. Welcome — brand intro + value props
 *   2. Profile — name, DOB, gender, height
 *   3. Health Goals — multi-select grid
 *   4. Wearable Selection — "Which wearable do you use?"
 *   5. Complete — summary + explore CTA
 *
 * Persists progress via tRPC onboarding endpoints when available,
 * with graceful fallback for offline/dev mode.
 */

import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/lib/constants";
import { trpc } from "@/lib/api";
import {
  WelcomeStep,
  ProfileStep,
  HealthGoalsStep,
  WearableStep,
  CompleteStep,
} from "@/components/onboarding";
import type { ProfileData, WearableChoice } from "@/components/onboarding";

/* ------------------------------------------------------------------ */
/* Step definitions                                                    */
/* ------------------------------------------------------------------ */

type StepId = "welcome" | "profile" | "goals" | "wearable" | "complete";

const STEP_ORDER: StepId[] = [
  "welcome",
  "profile",
  "goals",
  "wearable",
  "complete",
];

/* ------------------------------------------------------------------ */
/* Progress dots                                                       */
/* ------------------------------------------------------------------ */

function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current ? styles.dotActive : styles.dotInactive,
            i < current && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function OnboardingScreen() {
  const router = useRouter();

  /* -- State for each step -- */
  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    heightFeet: "",
    heightInches: "",
  });
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedWearables, setSelectedWearables] = useState<WearableChoice[]>(
    [],
  );

  /* -- tRPC mutations for saving step data -- */
  const saveProfileMutation = trpc.clientPortal.onboarding.saveProfile.useMutation();
  const saveGoalsMutation = trpc.clientPortal.onboarding.saveGoals.useMutation();
  const saveHealthHistoryMutation = trpc.clientPortal.onboarding.saveHealthHistory.useMutation();
  const completeMutation = trpc.clientPortal.onboarding.complete.useMutation({
    onSuccess: () => router.replace("/(tabs)"),
    onError: () => {
      // Still navigate even if the API call fails
      router.replace("/(tabs)");
    },
  });

  /* -- Navigation helpers -- */
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      const leavingStep = STEP_ORDER[currentIndex];

      // Save step data to backend when leaving a step
      if (leavingStep === "profile") {
        const heightInches =
          (parseInt(profile.heightFeet || "0", 10) * 12) +
          parseInt(profile.heightInches || "0", 10);
        saveProfileMutation.mutate({
          firstName: profile.firstName,
          lastName: profile.lastName,
          dateOfBirth: profile.dateOfBirth || undefined,
          gender: profile.gender || undefined,
          heightInches: heightInches || undefined,
        });
      } else if (leavingStep === "goals") {
        saveGoalsMutation.mutate({ goals: selectedGoals });
      }

      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [currentIndex, profile, selectedGoals, saveProfileMutation, saveGoalsMutation]);

  const goBack = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentIndex]);

  const handleFinish = useCallback(() => {
    completeMutation.mutate({});
  }, [completeMutation]);

  /* -- Render current step -- */
  const renderStep = () => {
    switch (currentStep) {
      case "welcome":
        return <WelcomeStep onContinue={goNext} />;

      case "profile":
        return (
          <ProfileStep
            data={profile}
            onUpdate={setProfile}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case "goals":
        return (
          <HealthGoalsStep
            selectedGoals={selectedGoals}
            onUpdate={setSelectedGoals}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case "wearable":
        return (
          <WearableStep
            selected={selectedWearables}
            onSelect={setSelectedWearables}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case "complete":
        return (
          <CompleteStep
            profileName={profile.firstName}
            goalsCount={selectedGoals.length}
            devicesCount={
              selectedWearables.filter((w) => w.id !== "none").length
            }
            onFinish={handleFinish}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots (hidden on welcome & complete) */}
      {currentStep !== "welcome" && currentStep !== "complete" && (
        <View style={styles.progressWrap}>
          <ProgressDots
            current={currentIndex - 1} // offset since welcome isn't a "real" step
            total={STEP_ORDER.length - 2} // exclude welcome & complete
          />
        </View>
      )}

      {/* Step content */}
      <View style={styles.content}>{renderStep()}</View>
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
  progressWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 32,
  },
  dotInactive: {
    backgroundColor: Colors.border,
    width: 16,
  },
  dotCompleted: {
    backgroundColor: Colors.goldDark,
    width: 16,
  },
  content: {
    flex: 1,
  },
});
