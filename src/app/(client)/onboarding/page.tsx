"use client";

import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { trpc } from "@/lib/trpc";
import type { OnboardingState } from "@/lib/onboarding/types";
import { createInitialOnboardingState } from "@/lib/onboarding/types";
import { dbFieldsToStepId, stateToDbFields } from "@/lib/onboarding/machine";

export default function OnboardingPage() {
  const router = useRouter();

  // ── Load saved onboarding state from DB ──────────────────────
  const { data: savedState, isLoading } = trpc.client.onboarding.getState.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // ── Mutations for persisting each step ───────────────────────
  const saveProfile = trpc.client.onboarding.saveProfile.useMutation();
  const saveGoals = trpc.client.onboarding.saveGoals.useMutation();
  const saveTier = trpc.client.onboarding.saveTier.useMutation();
  const completeOnboarding = trpc.client.onboarding.complete.useMutation();
  const updateStep = trpc.client.onboarding.updateStep.useMutation();

  // ── Persist state on each step change ────────────────────────
  function handleStepChange(state: OnboardingState) {
    const dbFields = stateToDbFields(state);

    // Persist step progress
    updateStep.mutate({ step: dbFields.onboardingStep });

    // Persist specific data based on which step was just completed
    const lastCompleted = state.completedSteps[state.completedSteps.length - 1];

    if (lastCompleted === "profile" && state.profile.firstName) {
      saveProfile.mutate({
        firstName: state.profile.firstName,
        lastName: state.profile.lastName ?? "",
        dateOfBirth: state.profile.dateOfBirth ?? undefined,
        gender: state.profile.gender ?? undefined,
        heightInches: dbFields.heightInches ?? undefined,
      });
    }

    if (lastCompleted === "health_goals" && state.selectedGoals.length > 0) {
      saveGoals.mutate({ goals: state.selectedGoals });
    }

    if (lastCompleted === "tier_selection" && state.tierChoice) {
      saveTier.mutate({ tier: state.tierChoice });
    }
  }

  // ── Complete and redirect to dashboard ───────────────────────
  function handleComplete(state: OnboardingState) {
    // Persist final state
    if (state.profile.firstName) {
      const dbFields = stateToDbFields(state);
      saveProfile.mutate({
        firstName: state.profile.firstName,
        lastName: state.profile.lastName ?? "",
        dateOfBirth: state.profile.dateOfBirth ?? undefined,
        gender: state.profile.gender ?? undefined,
        heightInches: dbFields.heightInches ?? undefined,
      });
    }
    if (state.selectedGoals.length > 0) {
      saveGoals.mutate({ goals: state.selectedGoals });
    }
    if (state.tierChoice) {
      saveTier.mutate({ tier: state.tierChoice });
    }

    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        router.push("/dashboard");
      },
    });
  }

  // ── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-kairos-gold/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="font-heading font-bold text-kairos-gold text-xl">K</span>
          </div>
          <p className="text-gray-500 text-sm">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  // ── Build initial state from DB if resuming ──────────────────
  let initialState = createInitialOnboardingState();

  if (savedState && savedState.step > 1) {
    initialState = {
      ...initialState,
      currentStep: dbFieldsToStepId(savedState.step),
      completedSteps: Array.from(
        { length: Math.max(0, savedState.step - 1) },
        (_, i) => dbFieldsToStepId(i + 1)
      ),
      selectedGoals: savedState.goals ?? [],
      tierChoice: (savedState.tier as "tier1" | "tier2" | "tier3") ?? null,
      profile: {
        ...initialState.profile,
        dateOfBirth: savedState.dateOfBirth ?? "",
        gender: (savedState.gender as "male" | "female" | "non_binary" | "prefer_not_to_say") ?? "",
        heightInches: savedState.heightInches ? Math.round(savedState.heightInches % 12) : 0,
        heightFeet: savedState.heightInches ? Math.floor(savedState.heightInches / 12) : undefined,
      },
    };
  }

  // Already completed — redirect to dashboard
  if (savedState?.completed) {
    router.push("/dashboard");
    return null;
  }

  return (
    <OnboardingWizard
      initialState={initialState}
      onStepChange={handleStepChange}
      onComplete={handleComplete}
    />
  );
}
