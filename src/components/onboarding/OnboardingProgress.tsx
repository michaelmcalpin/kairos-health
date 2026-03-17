"use client";

import type { OnboardingStepId } from "@/lib/onboarding/types";
import { ONBOARDING_STEPS } from "@/lib/onboarding/types";

interface OnboardingProgressProps {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  const currentMeta = ONBOARDING_STEPS.find((s) => s.id === currentStep);
  const currentIndex = currentMeta?.index ?? 0;

  // Don't show progress bar on welcome or complete screens
  if (currentStep === "welcome" || currentStep === "complete") return null;

  // Steps 1-4 (excluding welcome and complete)
  const middleSteps = ONBOARDING_STEPS.filter(
    (s) => s.id !== "welcome" && s.id !== "complete"
  );

  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-3">
        {middleSteps.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = step.index < currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  isCurrent
                    ? "ring-2 ring-kairos-gold ring-offset-2 ring-offset-gray-900"
                    : ""
                }`}
                style={{
                  backgroundColor:
                    isCompleted || isPast
                      ? "rgb(var(--k-accent))"
                      : isCurrent
                        ? "rgb(var(--k-accent))"
                        : "rgba(55, 65, 81, 0.5)",
                  color:
                    isCompleted || isPast || isCurrent
                      ? "rgb(var(--k-primary))"
                      : "rgba(156, 163, 175, 0.5)",
                }}
              >
                {isCompleted || isPast ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="rgb(var(--k-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Connector line */}
              {idx < middleSteps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor:
                        isPast || isCompleted
                          ? "rgb(var(--k-accent))"
                          : "rgba(55, 65, 81, 0.5)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {middleSteps.map((step) => {
          const isCurrent = step.id === currentStep;
          return (
            <div
              key={step.id}
              className={`text-xs text-center ${
                isCurrent ? "text-kairos-gold font-semibold" : "text-gray-600"
              }`}
              style={{ width: `${100 / middleSteps.length}%` }}
            >
              {step.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
