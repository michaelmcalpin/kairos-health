import { describe, it, expect } from "vitest";
import {
  validateProfile,
  validateGoals,
  validateTier,
  validateStep,
  getNextStep,
  getPreviousStep,
  advanceStep,
  goBackStep,
  updateProfile,
  toggleGoal,
  updateDevices,
  selectTier,
  completeOnboarding,
  stateToDbFields,
  dbFieldsToStepId,
} from "../machine";
import { createInitialOnboardingState } from "../types";
import type { OnboardingState, ProfileFormData } from "../types";

// ─── Helpers ────────────────────────────────────────────────────

function validProfile(): Partial<ProfileFormData> {
  return {
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1985-03-15",
    gender: "male",
    heightFeet: 5,
    heightInches: 10,
    timezone: "America/New_York",
  };
}

function stateAt(step: OnboardingState["currentStep"], overrides?: Partial<OnboardingState>): OnboardingState {
  return {
    ...createInitialOnboardingState(),
    currentStep: step,
    ...overrides,
  };
}

// ─── Validation Tests ───────────────────────────────────────────

describe("validateProfile", () => {
  it("accepts a valid profile", () => {
    const result = validateProfile(validProfile());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires first name", () => {
    const result = validateProfile({ ...validProfile(), firstName: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("First name is required");
  });

  it("requires last name", () => {
    const result = validateProfile({ ...validProfile(), lastName: undefined });
    expect(result.valid).toBe(false);
  });

  it("requires date of birth", () => {
    const result = validateProfile({ ...validProfile(), dateOfBirth: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Date of birth is required");
  });

  it("rejects minors (age < 18)", () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const result = validateProfile({
      ...validProfile(),
      dateOfBirth: twoYearsAgo.toISOString().split("T")[0],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("You must be at least 18 years old");
  });

  it("requires height", () => {
    const result = validateProfile({ ...validProfile(), heightFeet: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Height is required");
  });

  it("validates height range", () => {
    const result = validateProfile({ ...validProfile(), heightFeet: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Please enter a valid height");
  });

  it("requires gender", () => {
    const result = validateProfile({ ...validProfile(), gender: undefined });
    expect(result.valid).toBe(false);
  });
});

describe("validateGoals", () => {
  it("accepts 1-5 goals", () => {
    expect(validateGoals(["a"]).valid).toBe(true);
    expect(validateGoals(["a", "b", "c", "d", "e"]).valid).toBe(true);
  });

  it("rejects empty goals", () => {
    const result = validateGoals([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Please select at least one health goal");
  });

  it("rejects more than 5 goals", () => {
    const result = validateGoals(["a", "b", "c", "d", "e", "f"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Please select at most 5 goals to focus on");
  });
});

describe("validateTier", () => {
  it("accepts a tier choice", () => {
    expect(validateTier("tier1").valid).toBe(true);
    expect(validateTier("tier2").valid).toBe(true);
    expect(validateTier("tier3").valid).toBe(true);
  });

  it("rejects null", () => {
    const result = validateTier(null);
    expect(result.valid).toBe(false);
  });
});

describe("validateStep", () => {
  it("welcome is always valid", () => {
    expect(validateStep("welcome", stateAt("welcome")).valid).toBe(true);
  });

  it("devices is always valid (optional step)", () => {
    expect(validateStep("devices", stateAt("devices")).valid).toBe(true);
  });

  it("profile validates profile data", () => {
    const state = stateAt("profile", { profile: validProfile() });
    expect(validateStep("profile", state).valid).toBe(true);
  });

  it("health_goals validates selections", () => {
    const state = stateAt("health_goals", { selectedGoals: ["glucose_optimization"] });
    expect(validateStep("health_goals", state).valid).toBe(true);
  });

  it("tier_selection validates tier", () => {
    const state = stateAt("tier_selection", { tierChoice: "tier2" });
    expect(validateStep("tier_selection", state).valid).toBe(true);
  });
});

// ─── Navigation Tests ───────────────────────────────────────────

describe("getNextStep / getPreviousStep", () => {
  it("welcome → profile", () => {
    expect(getNextStep("welcome")).toBe("profile");
  });

  it("profile → health_goals", () => {
    expect(getNextStep("profile")).toBe("health_goals");
  });

  it("health_goals → devices", () => {
    expect(getNextStep("health_goals")).toBe("devices");
  });

  it("devices → tier_selection", () => {
    expect(getNextStep("devices")).toBe("tier_selection");
  });

  it("tier_selection → complete", () => {
    expect(getNextStep("tier_selection")).toBe("complete");
  });

  it("complete has no next", () => {
    expect(getNextStep("complete")).toBe(null);
  });

  it("welcome has no previous", () => {
    expect(getPreviousStep("welcome")).toBe(null);
  });

  it("profile → welcome", () => {
    expect(getPreviousStep("profile")).toBe("welcome");
  });
});

// ─── State Machine Tests ────────────────────────────────────────

describe("advanceStep", () => {
  it("advances from welcome to profile", () => {
    const state = stateAt("welcome");
    const next = advanceStep(state);
    expect(next.currentStep).toBe("profile");
    expect(next.completedSteps).toContain("welcome");
  });

  it("does not advance if validation fails", () => {
    // profile step with empty profile
    const state = stateAt("profile", { profile: {} });
    const next = advanceStep(state);
    expect(next.currentStep).toBe("profile");
  });

  it("advances profile when valid", () => {
    const state = stateAt("profile", { profile: validProfile() });
    const next = advanceStep(state);
    expect(next.currentStep).toBe("health_goals");
    expect(next.completedSteps).toContain("profile");
  });
});

describe("goBackStep", () => {
  it("goes back from profile to welcome", () => {
    const state = stateAt("profile");
    const prev = goBackStep(state);
    expect(prev.currentStep).toBe("welcome");
  });

  it("does nothing on welcome", () => {
    const state = stateAt("welcome");
    const prev = goBackStep(state);
    expect(prev.currentStep).toBe("welcome");
  });
});

describe("updateProfile", () => {
  it("merges profile data", () => {
    const state = stateAt("profile");
    const updated = updateProfile(state, { firstName: "Jane" });
    expect(updated.profile.firstName).toBe("Jane");

    const updated2 = updateProfile(updated, { lastName: "Smith" });
    expect(updated2.profile.firstName).toBe("Jane");
    expect(updated2.profile.lastName).toBe("Smith");
  });
});

describe("toggleGoal", () => {
  it("adds a goal", () => {
    const state = stateAt("health_goals");
    const updated = toggleGoal(state, "sleep_quality");
    expect(updated.selectedGoals).toContain("sleep_quality");
  });

  it("removes a goal", () => {
    const state = stateAt("health_goals", { selectedGoals: ["sleep_quality"] });
    const updated = toggleGoal(state, "sleep_quality");
    expect(updated.selectedGoals).not.toContain("sleep_quality");
  });

  it("caps at 5 goals", () => {
    const state = stateAt("health_goals", {
      selectedGoals: ["a", "b", "c", "d", "e"],
    });
    const updated = toggleGoal(state, "f");
    expect(updated.selectedGoals).toHaveLength(5);
    expect(updated.selectedGoals).not.toContain("f");
  });
});

describe("selectTier", () => {
  it("sets tier choice", () => {
    const state = stateAt("tier_selection");
    const updated = selectTier(state, "tier1");
    expect(updated.tierChoice).toBe("tier1");
  });
});

describe("updateDevices", () => {
  it("sets device list", () => {
    const state = stateAt("devices");
    const devices = [
      { providerId: "oura", providerName: "Oura Ring", connected: true },
    ];
    const updated = updateDevices(state, devices);
    expect(updated.devices).toHaveLength(1);
    expect(updated.devices[0].providerId).toBe("oura");
  });
});

describe("completeOnboarding", () => {
  it("marks complete step as done", () => {
    const state = stateAt("tier_selection", {
      tierChoice: "tier2",
      completedSteps: ["welcome", "profile", "health_goals", "devices", "tier_selection"],
    });
    const completed = completeOnboarding(state);
    expect(completed.currentStep).toBe("complete");
    expect(completed.completedSteps).toContain("complete");
  });
});

// ─── Serialization Tests ────────────────────────────────────────

describe("stateToDbFields", () => {
  it("converts state to DB-compatible fields", () => {
    const state = stateAt("health_goals", {
      profile: validProfile(),
      selectedGoals: ["sleep_quality", "glucose_optimization"],
      tierChoice: "tier1",
    });
    const fields = stateToDbFields(state);
    expect(fields.onboardingStep).toBe(3); // health_goals is index 2, so step 3
    expect(fields.onboardingCompleted).toBe(false);
    expect(fields.goals).toEqual(["sleep_quality", "glucose_optimization"]);
    expect(fields.tier).toBe("tier1");
    expect(fields.heightInches).toBe(70); // 5*12 + 10
    expect(fields.gender).toBe("male");
  });

  it("handles null tier gracefully", () => {
    const state = stateAt("welcome");
    const fields = stateToDbFields(state);
    expect(fields.tier).toBe("tier3");
  });
});

describe("dbFieldsToStepId", () => {
  it("converts step numbers to IDs", () => {
    expect(dbFieldsToStepId(1)).toBe("welcome");
    expect(dbFieldsToStepId(2)).toBe("profile");
    expect(dbFieldsToStepId(3)).toBe("health_goals");
    expect(dbFieldsToStepId(4)).toBe("devices");
    expect(dbFieldsToStepId(5)).toBe("tier_selection");
    expect(dbFieldsToStepId(6)).toBe("complete");
  });

  it("defaults to welcome for unknown step", () => {
    expect(dbFieldsToStepId(99)).toBe("welcome");
  });
});
