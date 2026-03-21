"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Droplets, Moon, Pill, ArrowRight, CheckCircle } from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";

const STEPS = [
  {
    title: "Health Profile",
    description: "Tell us about your goals, medical history, and current health status.",
    icon: Heart,
  },
  {
    title: "Connect Devices",
    description: "Link your CGM, wearable, or smart ring to start tracking automatically.",
    icon: Droplets,
  },
  {
    title: "Sleep & Recovery",
    description: "Set your sleep goals and recovery targets for personalized insights.",
    icon: Moon,
  },
  {
    title: "Protocols",
    description: "Review your supplement, fasting, and workout protocols from your trainer.",
    icon: Pill,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  function completeStep(stepIdx: number) {
    if (!completedSteps.includes(stepIdx)) {
      setCompletedSteps([...completedSteps, stepIdx]);
    }
    if (stepIdx < STEPS.length - 1) {
      setCurrentStep(stepIdx + 1);
    }
  }

  function finishOnboarding() {
    router.push("/dashboard");
  }

  const allComplete = completedSteps.length === STEPS.length;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center mb-10">
        <div className="mb-6">
          {isWhiteLabel ? (
            <div className="flex items-center justify-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-kairos flex items-center justify-center text-white font-heading font-bold text-xl"
                style={{ backgroundColor: brand.brandColor }}
              >
                {brand.name.charAt(0)}
              </div>
            </div>
          ) : null}
          <h1
            className="font-heading font-bold text-3xl mb-2"
            style={{ color: accentColor || undefined }}
          >
            {isWhiteLabel ? (
              <span style={{ color: accentColor }}>{brand.name}</span>
            ) : (
              <span className="text-kairos-gold">Welcome to KAIROS</span>
            )}
          </h1>
          <p className="font-body text-kairos-silver-dark text-lg">
            {isWhiteLabel
              ? `Let's set up your ${brand.name} health profile`
              : "Let's set up your precision health profile"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 justify-center mb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-16 rounded-full transition-all duration-300"
              style={{
                backgroundColor: completedSteps.includes(i)
                  ? (accentColor || "rgb(var(--k-accent))")
                  : i === currentStep
                    ? (accentColor ? accentColor + "60" : "rgba(var(--k-accent), 0.4)")
                    : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
        <p className="text-xs font-body text-kairos-silver-dark">
          {completedSteps.length} of {STEPS.length} steps complete
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(i);
          const isCurrent = i === currentStep;

          return (
            <div
              key={i}
              className={`kairos-card p-6 transition-all duration-200 ${
                isCurrent ? "border-kairos-gold/30 ring-1 ring-kairos-gold/10" : ""
              } ${isCompleted ? "opacity-75" : ""}`}
              style={isCurrent && accentColor ? { borderColor: accentColor + "50" } : undefined}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-green-500/20"
                      : isCurrent
                        ? "bg-kairos-gold/20"
                        : "bg-gray-800/50"
                  }`}
                  style={isCurrent && accentColor ? { backgroundColor: accentColor + "20" } : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle size={24} className="text-green-400" />
                  ) : (
                    <Icon
                      size={24}
                      className={isCurrent ? "text-kairos-gold" : "text-gray-500"}
                      style={isCurrent && accentColor ? { color: accentColor } : undefined}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-heading font-bold text-lg text-white">
                      {step.title}
                    </h3>
                    {isCompleted && (
                      <span className="text-xs text-green-400 font-heading font-semibold">Complete</span>
                    )}
                  </div>
                  <p className="font-body text-sm text-kairos-silver-dark leading-relaxed mb-4">
                    {step.description}
                  </p>
                  {isCurrent && !isCompleted && (
                    <button
                      onClick={() => completeStep(i)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm transition-colors"
                      style={{
                        backgroundColor: accentColor || "rgb(var(--k-accent))",
                        color: "#fff",
                      }}
                    >
                      Complete Step <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Finish */}
      {allComplete && (
        <div className="mt-8 text-center animate-fade-in">
          <div className="kairos-card p-8 border-kairos-gold/20">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl text-white mb-2">You&apos;re All Set!</h3>
            <p className="font-body text-kairos-silver-dark mb-6">
              {isWhiteLabel
                ? `Your ${brand.name} health profile is ready. Let's explore your dashboard.`
                : "Your KAIROS health profile is ready. Let's explore your dashboard."}
            </p>
            <button
              onClick={finishOnboarding}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-kairos font-heading font-bold text-sm transition-colors"
              style={{
                backgroundColor: accentColor || "rgb(var(--k-accent))",
                color: "#fff",
              }}
            >
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Powered by */}
      {isWhiteLabel && (
        <div className="text-center mt-8">
          <p className="text-[10px] text-kairos-silver-dark font-body">
            Powered by <span className="text-kairos-gold font-semibold">KAIROS</span>
          </p>
        </div>
      )}
    </div>
  );
}
