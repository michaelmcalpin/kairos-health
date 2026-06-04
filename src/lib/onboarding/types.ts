// ─── Onboarding Types ───────────────────────────────────────────
// Multi-step onboarding flow for new EVERIST clients

export type OnboardingStepId =
  | "welcome"
  | "profile"
  | "health_goals"
  | "health_history"
  | "devices"
  | "tier_selection"
  | "complete";

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  index: number;
  title: string;
  subtitle: string;
  icon: string;
  optional: boolean;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    id: "welcome",
    index: 0,
    title: "Welcome to Everist.ai",
    subtitle: "Your journey to optimal health starts here",
    icon: "K",
    optional: false,
  },
  {
    id: "profile",
    index: 1,
    title: "Your Profile",
    subtitle: "Basic information to personalize your experience",
    icon: "P",
    optional: false,
  },
  {
    id: "health_goals",
    index: 2,
    title: "Health Goals",
    subtitle: "What matters most to you?",
    icon: "G",
    optional: false,
  },
  {
    id: "health_history",
    index: 3,
    title: "Health History",
    subtitle: "Help us understand your body and lifestyle",
    icon: "H",
    optional: false,
  },
  {
    id: "devices",
    index: 4,
    title: "Connect Devices",
    subtitle: "Link your wearables and health devices",
    icon: "D",
    optional: true,
  },
  {
    id: "tier_selection",
    index: 5,
    title: "Choose Your Plan",
    subtitle: "Select the service tier that fits your needs",
    icon: "T",
    optional: false,
  },
  {
    id: "complete",
    index: 6,
    title: "You're All Set!",
    subtitle: "Welcome to the Everist.ai community",
    icon: "✓",
    optional: false,
  },
];

// ─── Form Data ──────────────────────────────────────────────────

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: "male" | "female" | "non_binary" | "prefer_not_to_say";
  heightFeet: number;
  heightInches: number;
  timezone: string;
}

export interface HealthGoal {
  id: string;
  label: string;
  description: string;
  category: "longevity" | "performance" | "metabolic" | "recovery" | "body_composition";
}

export const AVAILABLE_HEALTH_GOALS: HealthGoal[] = [
  {
    id: "glucose_optimization",
    label: "Glucose Optimization",
    description: "Maintain stable blood sugar and improve metabolic health",
    category: "metabolic",
  },
  {
    id: "sleep_quality",
    label: "Sleep Quality",
    description: "Improve sleep duration, consistency, and recovery",
    category: "recovery",
  },
  {
    id: "body_composition",
    label: "Body Composition",
    description: "Optimize muscle-to-fat ratio and body weight",
    category: "body_composition",
  },
  {
    id: "cardiovascular",
    label: "Cardiovascular Health",
    description: "Improve heart rate variability and aerobic capacity",
    category: "performance",
  },
  {
    id: "longevity_markers",
    label: "Longevity Biomarkers",
    description: "Track and optimize key aging and longevity markers",
    category: "longevity",
  },
  {
    id: "stress_management",
    label: "Stress Management",
    description: "Reduce cortisol and improve stress resilience",
    category: "recovery",
  },
  {
    id: "nutrition_optimization",
    label: "Nutrition Optimization",
    description: "Fine-tune macros, micros, and meal timing",
    category: "metabolic",
  },
  {
    id: "supplement_protocol",
    label: "Supplement Protocol",
    description: "Build an evidence-based supplement stack",
    category: "longevity",
  },
  {
    id: "fasting_protocol",
    label: "Fasting Protocol",
    description: "Implement time-restricted eating or extended fasts",
    category: "metabolic",
  },
  {
    id: "athletic_performance",
    label: "Athletic Performance",
    description: "Maximize training output and recovery",
    category: "performance",
  },
];

export interface HealthHistoryData {
  currentWeight: string;
  targetWeight: string;
  medicalConditions: string[];
  medications: string;
  exerciseFrequency: string;
  exerciseTypes: string[];
  dietType: string;
  healthConcerns: string;
  injuries: string;
}

export const MEDICAL_CONDITIONS = [
  "Anxiety", "Depression", "Diabetes", "Pre-diabetes", "Heart condition",
  "High blood pressure", "High cholesterol", "Thyroid disorder", "Asthma",
  "Arthritis", "Autoimmune condition", "Cancer (history)", "Chronic fatigue",
  "Digestive issues (IBS/GERD)", "Sleep apnea", "Back pain", "Joint pain",
  "Obesity", "Food allergies", "None of the above",
];

export const EXERCISE_TYPES = [
  "Walking", "Running", "Weight lifting", "Swimming", "Yoga",
  "Cycling/Spin", "HIIT", "Pilates", "Sports", "Martial arts", "None",
];

export const DIET_TYPES = [
  "No specific diet", "Low carb", "Keto", "Paleo", "Mediterranean",
  "Vegetarian", "Vegan", "Gluten free", "Intermittent fasting", "Clean eating",
];

export interface DeviceSelection {
  providerId: string;
  providerName: string;
  connected: boolean;
}

export type TierChoice = "tier1" | "tier2" | "tier3";

export interface TierInfo {
  id: TierChoice;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

export const TIER_OPTIONS: TierInfo[] = [
  {
    id: "tier1",
    name: "Private",
    price: 499,
    tagline: "Dedicated 1:1 coaching with full concierge service",
    features: [
      "Dedicated health coach",
      "Unlimited messaging",
      "Weekly 1:1 video calls",
      "Custom supplement protocols",
      "Priority lab ordering",
      "AI-powered insights",
      "Quarterly executive health review",
    ],
    highlighted: false,
  },
  {
    id: "tier2",
    name: "Associate",
    price: 249,
    tagline: "Shared coaching with personalized guidance",
    features: [
      "Shared health coach (1:4 ratio)",
      "Bi-weekly check-ins",
      "Monthly video calls",
      "Supplement recommendations",
      "Lab result analysis",
      "AI-powered insights",
    ],
    highlighted: true,
  },
  {
    id: "tier3",
    name: "AI-Guided",
    price: 99,
    tagline: "Self-directed with AI-powered health optimization",
    features: [
      "AI health insights engine",
      "Automated weekly reports",
      "Community forum access",
      "Device integrations",
      "Basic supplement guidance",
    ],
    highlighted: false,
  },
];

// ─── Onboarding State ───────────────────────────────────────────

export interface OnboardingState {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  profile: Partial<ProfileFormData>;
  selectedGoals: string[];
  healthHistory: Partial<HealthHistoryData>;
  devices: DeviceSelection[];
  tierChoice: TierChoice | null;
  startedAt: string;
  lastUpdatedAt: string;
}

export function createInitialOnboardingState(): OnboardingState {
  const now = new Date().toISOString();
  return {
    currentStep: "welcome",
    completedSteps: [],
    profile: {},
    selectedGoals: [],
    healthHistory: {},
    devices: [],
    tierChoice: null,
    startedAt: now,
    lastUpdatedAt: now,
  };
}

export interface OnboardingProgress {
  currentStepIndex: number;
  totalSteps: number;
  percentComplete: number;
  isComplete: boolean;
}

export function calculateProgress(state: OnboardingState): OnboardingProgress {
  const totalSteps = ONBOARDING_STEPS.length;
  const currentMeta = ONBOARDING_STEPS.find((s) => s.id === state.currentStep);
  const currentStepIndex = currentMeta ? currentMeta.index : 0;
  const percentComplete = Math.round((currentStepIndex / (totalSteps - 1)) * 100);

  return {
    currentStepIndex,
    totalSteps,
    percentComplete,
    isComplete: state.currentStep === "complete" && state.completedSteps.includes("complete"),
  };
}
