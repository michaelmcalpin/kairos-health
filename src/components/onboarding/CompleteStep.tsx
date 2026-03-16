"use client";

import type { OnboardingState } from "@/lib/onboarding/types";
import { TIER_OPTIONS, AVAILABLE_HEALTH_GOALS } from "@/lib/onboarding/types";

interface CompleteStepProps {
  state: OnboardingState;
  onFinish: () => void;
}

export function CompleteStep({ state, onFinish }: CompleteStepProps) {
  const tier = TIER_OPTIONS.find((t) => t.id === state.tierChoice);
  const goalLabels = state.selectedGoals
    .map((id) => AVAILABLE_HEALTH_GOALS.find((g) => g.id === id)?.label)
    .filter(Boolean);
  const deviceCount = state.devices.filter((d) => d.connected).length;

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      {/* Success Animation */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-fade-in"
        style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-3xl font-heading font-bold text-white mb-3">
        You&apos;re All Set!
      </h1>

      <p className="text-gray-400 text-lg mb-8">
        Welcome to KAIROS, {state.profile.firstName}. Your personalized health
        management journey begins now.
      </p>

      {/* Summary Cards */}
      <div className="w-full space-y-3 mb-8">
        {/* Tier */}
        {tier && (
          <div className="kairos-card p-4 flex items-center justify-between">
            <div className="text-left">
              <div className="text-gray-500 text-xs uppercase tracking-wider">Plan</div>
              <div className="text-white font-semibold">{tier.name}</div>
            </div>
            <div className="text-right">
              <span className="text-[#D4AF37] font-bold text-lg">${tier.price}</span>
              <span className="text-gray-500 text-sm">/mo</span>
            </div>
          </div>
        )}

        {/* Goals */}
        <div className="kairos-card p-4 text-left">
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Your Goals</div>
          <div className="flex flex-wrap gap-2">
            {goalLabels.map((label) => (
              <span key={label} className="px-2 py-1 rounded-full text-xs bg-[#D4AF37]/10 text-[#D4AF37]">
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="kairos-card p-4 flex items-center justify-between">
          <div className="text-left">
            <div className="text-gray-500 text-xs uppercase tracking-wider">Devices Connected</div>
            <div className="text-white font-semibold">
              {deviceCount > 0 ? `${deviceCount} device${deviceCount > 1 ? "s" : ""}` : "None yet"}
            </div>
          </div>
          {deviceCount === 0 && (
            <span className="text-gray-500 text-xs">You can add these anytime</span>
          )}
        </div>
      </div>

      {/* What's Next */}
      <div className="w-full kairos-card p-5 text-left mb-8">
        <h3 className="font-heading font-semibold text-white mb-3">What&apos;s Next</h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Complete your first daily check-in", time: "2 min" },
            { step: "2", text: "Log your first glucose reading or meal", time: "1 min" },
            { step: "3", text: "Review your AI-generated insights", time: "5 min" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ backgroundColor: "#D4AF37", color: "#122055" }}>
                {item.step}
              </div>
              <div className="flex-1 text-gray-300 text-sm">{item.text}</div>
              <div className="text-gray-600 text-xs">{item.time}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onFinish}
        className="kairos-btn-gold px-12 py-3 rounded-lg font-semibold text-lg transition-all hover:scale-105"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
