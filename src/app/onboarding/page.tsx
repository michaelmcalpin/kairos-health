"use client";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  function handleComplete() {
    // In production, this would call the tRPC mutation then redirect
    // For now, redirect to dashboard
    window.location.href = "/dashboard";
  }

  return (
    <OnboardingWizard
      onComplete={handleComplete}
    />
  );
}
