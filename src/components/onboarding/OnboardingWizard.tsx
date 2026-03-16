"use client";

import { useState, useCallback } from "react";
import type { OnboardingState, ProfileFormData, TierChoice, DeviceSelection } from "@/lib/onboarding/types";
import { createInitialOnboardingState } from "@/lib/onboarding/types";
import {
  advanceStep,
  goBackStep,
  updateProfile,
  toggleGoal,
  updateDevices,
  selectTier,
  completeOnboarding,
  canAdvance,
} from "@/lib/onboarding/machine";
import { OnboardingProgress } from "./OnboardingProgress";
import { WelcomeStep } from "./WelcomeStep";
import { ProfileStep } from "./ProfileStep";
import { HealthGoalsStep } from "./HealthGoalsStep";
import { DevicesStep } from "./DevicesStep";
import { TierSelectionStep } from "./TierSelectionStep";
import { CompleteStep } from "./CompleteStep";

interface OnboardingWizardProps {
  initialState?: OnboardingState;
  onComplete?: (state: OnboardingState) => void;
  onStepChange?: (state: OnboardingState) => void;
}

export function OnboardingWizard({
  initialState,
  onComplete,
  onStepChange,
}: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>(
    initialState ?? createInitialOnboardingState()
  );

  const updateState = useCallback(
    (newState: OnboardingState) => {
      setState(newState);
      onStepChange?.(newState);
    },
    [onStepChange]
  );

  function handleAdvance() {
    if (!canAdvance(state)) return;
    const next = advanceStep(state);
    updateState(next);
  }

  function handleBack() {
    const prev = goBackStep(state);
    updateState(prev);
  }

  function handleProfileChange(profile: Partial<ProfileFormData>) {
    updateState(updateProfile(state, profile));
  }

  function handleGoalToggle(goalId: string) {
    updateState(toggleGoal(state, goalId));
  }

  function handleDevicesUpdate(devices: DeviceSelection[]) {
    updateState(updateDevices(state, devices));
  }

  function handleTierSelect(tier: TierChoice) {
    updateState(selectTier(state, tier));
  }

  function handleFinish() {
    const completed = completeOnboarding(state);
    updateState(completed);
    onComplete?.(completed);
  }

  // Handle the advance from tier selection which should go to complete
  function handleTierContinue() {
    if (!canAdvance(state)) return;
    const next = advanceStep(state);
    const completed = completeOnboarding(next);
    updateState(completed);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0A0F1F 0%, #122055 100%)" }}>
      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-lg" style={{ color: "#D4AF37" }}>
            KAIROS
          </span>
        </div>
        {state.currentStep !== "welcome" && state.currentStep !== "complete" && (
          <span className="text-gray-600 text-sm">
            Step {(state.completedSteps.length || 0) + 1} of 6
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="px-6">
        <OnboardingProgress
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full animate-fade-in">
          {state.currentStep === "welcome" && (
            <WelcomeStep onContinue={handleAdvance} />
          )}

          {state.currentStep === "profile" && (
            <ProfileStep
              data={state.profile}
              onChange={handleProfileChange}
              onContinue={handleAdvance}
              onBack={handleBack}
            />
          )}

          {state.currentStep === "health_goals" && (
            <HealthGoalsStep
              selectedGoals={state.selectedGoals}
              onToggle={handleGoalToggle}
              onContinue={handleAdvance}
              onBack={handleBack}
            />
          )}

          {state.currentStep === "devices" && (
            <DevicesStep
              devices={state.devices}
              onUpdate={handleDevicesUpdate}
              onContinue={handleAdvance}
              onBack={handleBack}
            />
          )}

          {state.currentStep === "tier_selection" && (
            <TierSelectionStep
              selected={state.tierChoice}
              onSelect={handleTierSelect}
              onContinue={handleTierContinue}
              onBack={handleBack}
            />
          )}

          {state.currentStep === "complete" && (
            <CompleteStep state={state} onFinish={handleFinish} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full px-6 py-4 text-center">
        <p className="text-gray-700 text-xs">
          KAIROS Health Management Platform
        </p>
      </div>
    </div>
  );
}
