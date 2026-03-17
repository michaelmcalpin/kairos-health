"use client";

import { AVAILABLE_HEALTH_GOALS } from "@/lib/onboarding/types";

interface HealthGoalsStepProps {
  selectedGoals: string[];
  onToggle: (goalId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  longevity: "rgb(var(--k-accent))",
  performance: "rgb(16, 185, 129)",
  metabolic: "rgb(59, 130, 246)",
  recovery: "rgb(139, 92, 246)",
  body_composition: "rgb(245, 158, 11)",
};

export function HealthGoalsStep({ selectedGoals, onToggle, onContinue, onBack }: HealthGoalsStepProps) {
  const canContinue = selectedGoals.length >= 1 && selectedGoals.length <= 5;

  return (
    <div className="max-w-lg mx-auto w-full">
      <h2 className="text-2xl font-heading font-bold text-white mb-2">Health Goals</h2>
      <p className="text-gray-400 mb-2">
        Select up to 5 goals that matter most to you. We&apos;ll use these to
        personalize your insights and recommendations.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        {selectedGoals.length}/5 selected
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_HEALTH_GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          const isDisabled = !isSelected && selectedGoals.length >= 5;
          const accentColor = CATEGORY_COLORS[goal.category] ?? "rgb(var(--k-accent))";

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => !isDisabled && onToggle(goal.id)}
              disabled={isDisabled}
              className={`text-left p-4 rounded-lg border transition-all ${
                isSelected
                  ? "border-kairos-gold bg-kairos-gold/5"
                  : isDisabled
                    ? "border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    isSelected ? "border-kairos-gold bg-kairos-gold/20" : "border-gray-600"
                  }`}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{goal.label}</div>
                  <div className="text-gray-500 text-xs mt-1">{goal.description}</div>
                  <div
                    className="inline-block text-xs mt-2 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  >
                    {goal.category.replace("_", " ")}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-2 rounded-lg font-semibold transition ${
            canContinue
              ? "kairos-btn-gold hover:scale-105"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
