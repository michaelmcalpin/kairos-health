/**
 * First-run checklist for the client Today screen: what to connect or log
 * first. Each step is "done" only from real data, never assumed.
 */

export interface FirstRunFacts {
  /** Any device / logged daily metric in the last 30 days. */
  hasHealthData: boolean;
  /** LifeScore labs part has a score (at least one lab result). */
  hasLabs: boolean;
  /** An active coach relationship exists. */
  hasCoach: boolean;
  /** At least one LifeScore mental rating in the window. */
  hasCheckin: boolean;
  /** Onboarding / health profile finished; null when unknown. */
  profileComplete: boolean | null;
}

export interface FirstRunStep {
  key: "device" | "labs" | "coach" | "checkin" | "profile";
  title: string;
  why: string;
  href: string;
  cta: string;
  done: boolean;
}

export function firstRunSteps(f: FirstRunFacts): FirstRunStep[] {
  const steps: FirstRunStep[] = [
    {
      key: "device", title: "Connect your ring or watch",
      why: "Oura, Apple Health, WHOOP, Garmin and others fill in sleep, heart and activity automatically.",
      href: "/settings?tab=integrations", cta: "Connect a device", done: f.hasHealthData,
    },
    {
      key: "labs", title: "Upload your latest labs",
      why: "Lab results are part of your Physical score.",
      href: "/labs", cta: "Add labs", done: f.hasLabs,
    },
    {
      key: "coach", title: "Meet your coach",
      why: "Your coach builds your plan and follows your progress.",
      href: "/care-team", cta: "See your care team", done: f.hasCoach,
    },
    {
      key: "checkin", title: "Do your first LifeScore check-in",
      why: "A one-minute rating of mind, purpose, relationships and work sets your Mental score.",
      href: "/lifescore", cta: "Check in", done: f.hasCheckin,
    },
  ];
  if (f.profileComplete === false) {
    steps.unshift({
      key: "profile", title: "Finish your health profile",
      why: "Goals and health history help your coach tailor your plan.",
      href: "/onboarding", cta: "Continue", done: false,
    });
  }
  return steps;
}

/** True when the client has nothing at all yet (show the first-run card first). */
export function isBrandNew(f: FirstRunFacts): boolean {
  return !f.hasHealthData && !f.hasLabs && !f.hasCheckin;
}
