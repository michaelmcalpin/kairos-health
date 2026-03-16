"use client";

import type { TierChoice } from "@/lib/onboarding/types";
import { TIER_OPTIONS } from "@/lib/onboarding/types";

interface TierSelectionStepProps {
  selected: TierChoice | null;
  onSelect: (tier: TierChoice) => void;
  onContinue: () => void;
  onBack: () => void;
}

const TIER_COLORS: Record<TierChoice, string> = {
  tier1: "#D4AF37",
  tier2: "#3B82F6",
  tier3: "#9CA3AF",
};

export function TierSelectionStep({ selected, onSelect, onContinue, onBack }: TierSelectionStepProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-gray-400">
          Select the service tier that best fits your health optimization goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIER_OPTIONS.map((tier) => {
          const isSelected = selected === tier.id;
          const accentColor = TIER_COLORS[tier.id];

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(tier.id)}
              className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                isSelected
                  ? "scale-[1.02] shadow-lg"
                  : "hover:scale-[1.01]"
              }`}
              style={{
                borderColor: isSelected ? accentColor : "rgba(55, 65, 81, 0.5)",
                background: isSelected
                  ? `linear-gradient(180deg, ${accentColor}08 0%, transparent 100%)`
                  : "rgba(17, 24, 39, 0.8)",
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-heading font-bold text-white text-lg">{tier.name}</h3>
                <p className="text-gray-500 text-xs mt-1">{tier.tagline}</p>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-bold" style={{ color: accentColor }}>
                  ${tier.price}
                </span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <circle cx="8" cy="8" r="7" stroke={accentColor} strokeWidth="1.5" opacity="0.4" />
                      <path d="M5 8L7 10L11 6" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <div
                className={`w-full py-2 rounded-lg text-center text-sm font-semibold transition ${
                  isSelected ? "text-black" : "text-gray-300"
                }`}
                style={{
                  backgroundColor: isSelected ? accentColor : "rgba(55, 65, 81, 0.5)",
                }}
              >
                {isSelected ? "Selected" : "Select Plan"}
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
          disabled={!selected}
          className={`px-8 py-2 rounded-lg font-semibold transition ${
            selected
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
