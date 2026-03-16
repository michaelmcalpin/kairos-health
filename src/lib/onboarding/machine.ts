// ─── Onboarding State Machine ───────────────────────────────────
// Manages step transitions, validation, and state updates

import type {
  OnboardingState,
  OnboardingStepId,
  ProfileFormData,
  TierChoice,
  DeviceSelection,
} from "./types";
import { ONBOARDING_STEPS } from "./types";

// ─── Validation ─────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProfile(profile: Partial<ProfileFormData>): ValidationResult {
  const errors: string[] = [];

  if (!profile.firstName?.trim()) errors.push("First name is required");
  if (!profile.lastName?.trim()) errors.push("Last name is required");

  if (!profile.dateOfBirth) {
    errors.push("Date of birth is required");
  } else {
    const dob = new Date(profile.dateOfBirth);
    const now = new Date();
    const ageDiff = now.getFullYear() - dob.getFullYear();
    if (ageDiff < 18) errors.push("You must be at least 18 years old");
    if (ageDiff > 120) errors.push("Please enter a valid date of birth");
  }

  if (!profile.gender) errors.push("Please select a gender");

  if (profile.heightFeet !== undefined) {
    if (profile.heightFeet < 3 || profile.heightFeet > 8) {
      errors.push("Please enter a valid height");
    }
  } else {
    errors.push("Height is required");
  }

  return { valid: errors.length === 0, errors };
}

export function validateGoals(selectedGoals: string[]): ValidationResult {
  const errors: string[] = [];

  if (selectedGoals.length === 0) {
    errors.push("Please select at least one health goal");
  }
  if (selectedGoals.length > 5) {
    errors.push("Please select at most 5 goals to focus on");
  }

  return { valid: errors.length === 0, errors };
}

export function validateTier(tierChoice: TierChoice | null): ValidationResult {
  const errors: string[] = [];

  if (!tierChoice) {
    errors.push("Please select a service tier");
  }

  return { valid: errors.length === 0, errors };
}

export function validateStep(step: OnboardingStepId, state: OnboardingState): ValidationResult {
  switch (step) {
    case "welcome":
      return { valid: true, errors: [] };
    case "profile":
      return validateProfile(state.profile);
    case "health_goals":
      return validateGoals(state.selectedGoals);
    case "devices":
      // Devices step is optional, always valid
      return { valid: true, errors: [] };
    case "tier_selection":
      return validateTier(state.tierChoice);
    case "complete":
      return { valid: true, errors: [] };
    default:
      return { valid: false, errors: ["Unknown step"] };
  }
}

// ─── Transitions ────────────────────────────────────────────────

export function getNextStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentMeta = ONBOARDING_STEPS.find((s) => s.id === currentStep);
  if (!currentMeta) return null;

  const nextIndex = currentMeta.index + 1;
  const nextMeta = ONBOARDING_STEPS.find((s) => s.index === nextIndex);
  return nextMeta ? nextMeta.id : null;
}

export function getPreviousStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentMeta = ONBOARDING_STEPS.find((s) => s.id === currentStep);
  if (!currentMeta || currentMeta.index === 0) return null;

  const prevIndex = currentMeta.index - 1;
  const prevMeta = ONBOARDING_STEPS.find((s) => s.index === prevIndex);
  return prevMeta ? prevMeta.id : null;
}

export function canAdvance(state: OnboardingState): boolean {
  const validation = validateStep(state.currentStep, state);
  return validation.valid;
}

// ─── State Updates ──────────────────────────────────────────────

export function advanceStep(state: OnboardingState): OnboardingState {
  if (!canAdvance(state)) return state;

  const nextStep = getNextStep(state.currentStep);
  if (!nextStep) return state;

  const completedSteps: OnboardingStepId[] = state.completedSteps.includes(state.currentStep)
    ? state.completedSteps
    : [...state.completedSteps, state.currentStep];

  return {
    ...state,
    currentStep: nextStep,
    completedSteps,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function goBackStep(state: OnboardingState): OnboardingState {
  const prevStep = getPreviousStep(state.currentStep);
  if (!prevStep) return state;

  return {
    ...state,
    currentStep: prevStep,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function updateProfile(
  state: OnboardingState,
  profile: Partial<ProfileFormData>,
): OnboardingState {
  return {
    ...state,
    profile: { ...state.profile, ...profile },
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function toggleGoal(state: OnboardingState, goalId: string): OnboardingState {
  const exists = state.selectedGoals.includes(goalId);
  const selectedGoals = exists
    ? state.selectedGoals.filter((g) => g !== goalId)
    : state.selectedGoals.length < 5
      ? [...state.selectedGoals, goalId]
      : state.selectedGoals;

  return {
    ...state,
    selectedGoals,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function updateDevices(
  state: OnboardingState,
  devices: DeviceSelection[],
): OnboardingState {
  return {
    ...state,
    devices,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function selectTier(state: OnboardingState, tier: TierChoice): OnboardingState {
  return {
    ...state,
    tierChoice: tier,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function completeOnboarding(state: OnboardingState): OnboardingState {
  const completedSteps: OnboardingStepId[] = state.completedSteps.includes("complete")
    ? state.completedSteps
    : [...state.completedSteps, "complete" as const];

  return {
    ...state,
    currentStep: "complete",
    completedSteps,
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ─── Serialization ──────────────────────────────────────────────

export function stateToDbFields(state: OnboardingState) {
  const step = ONBOARDING_STEPS.find((s) => s.id === state.currentStep);
  return {
    onboardingStep: step ? step.index + 1 : 1,
    onboardingCompleted: state.completedSteps.includes("complete"),
    goals: state.selectedGoals,
    tier: state.tierChoice ?? "tier3",
    dateOfBirth: state.profile.dateOfBirth ?? null,
    gender: state.profile.gender ?? null,
    heightInches: state.profile.heightFeet !== undefined
      ? (state.profile.heightFeet * 12) + (state.profile.heightInches ?? 0)
      : null,
  };
}

export function dbFieldsToStepId(onboardingStep: number): OnboardingStepId {
  const meta = ONBOARDING_STEPS.find((s) => s.index === onboardingStep - 1);
  return meta ? meta.id : "welcome";
}
