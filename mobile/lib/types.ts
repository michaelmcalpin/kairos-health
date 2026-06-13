/**
 * Shared TypeScript types for the Everist.ai mobile app.
 */

/** ------------------------------------------------------------------ */
/** Navigation / Screen params                                         */
/** ------------------------------------------------------------------ */

export type RootStackParamList = {
  "(tabs)": undefined;
  "sign-in": undefined;
  "sign-up": undefined;
  "onboarding": undefined;
  "+not-found": undefined;
};

export type TabParamList = {
  index: undefined;
  health: undefined;
  protocols: undefined;
  chat: undefined;
  profile: undefined;
};

/** ------------------------------------------------------------------ */
/** User / Auth                                                        */
/** ------------------------------------------------------------------ */

export interface AppUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: string;
}

/** ------------------------------------------------------------------ */
/** Health / Biometrics                                                 */
/** ------------------------------------------------------------------ */

export type BiometricCategory =
  | "cardiovascular"
  | "metabolic"
  | "hormonal"
  | "inflammatory"
  | "nutritional"
  | "organ_function"
  | "hematologic";

export interface BiomarkerReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: BiometricCategory;
  status: "optimal" | "normal" | "borderline" | "critical";
  referenceRange: { low: number; high: number };
  measuredAt: string;
}

export interface HealthScore {
  overall: number;
  cardiovascular: number;
  metabolic: number;
  inflammatory: number;
  hormonal: number;
}

/** ------------------------------------------------------------------ */
/** Protocols                                                          */
/** ------------------------------------------------------------------ */

export type ProtocolStatus = "active" | "paused" | "completed" | "upcoming";

export interface Protocol {
  id: string;
  name: string;
  description: string;
  status: ProtocolStatus;
  category: string;
  adherence: number; // 0-100
  startDate: string;
  endDate?: string;
  tasks: ProtocolTask[];
}

export interface ProtocolTask {
  id: string;
  title: string;
  completed: boolean;
  scheduledTime?: string;
  frequency: "daily" | "weekly" | "monthly" | "as_needed";
}

/** ------------------------------------------------------------------ */
/** Chat / AI                                                          */
/** ------------------------------------------------------------------ */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ChatConversation {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messageCount: number;
}

/** ------------------------------------------------------------------ */
/** UI helpers                                                         */
/** ------------------------------------------------------------------ */

export type StatusVariant = "success" | "warning" | "danger" | "info" | "default";

export interface EmptyStateConfig {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
