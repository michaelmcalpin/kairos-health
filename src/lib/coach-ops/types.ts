// ─── Coach Operations Types ──────────────────────────────────────
// Types for coach alerts, follow-ups, supplement marketplace,
// and coach profile engines.

// ─── Alerts ──────────────────────────────────────────────────────

export type AlertPriority = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface CoachAlert {
  id: string;
  clientName: string;
  clientInitials: string;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  createdAt: string;
  details?: string;
}

export interface CoachAlertStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const PRIORITY_CONFIG: Record<AlertPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: "text-red-400", bgColor: "bg-red-500/15", label: "Critical" },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/15", label: "High" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/15", label: "Medium" },
  low: { color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Low" },
  info: { color: "text-kairos-silver", bgColor: "bg-kairos-silver/10", label: "Info" },
};

// ─── Follow-ups ──────────────────────────────────────────────────

export type FollowUpPriority = "high" | "medium" | "low";
export type FollowUpCategory = "Lab Review" | "Prescription Renewal" | "Check-in Call" | "Protocol Check" | "Assessment";

export interface FollowUp {
  id: string;
  clientName: string;
  clientInitials: string;
  description: string;
  dueDate: string;
  priority: FollowUpPriority;
  category: FollowUpCategory;
  completed: boolean;
  createdAt: string;
}

export interface FollowUpStats {
  total: number;
  pending: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}

export const FOLLOWUP_CATEGORIES: FollowUpCategory[] = [
  "Lab Review",
  "Prescription Renewal",
  "Check-in Call",
  "Protocol Check",
  "Assessment",
];

export const PRIORITY_COLORS: Record<FollowUpPriority, { text: string; bg: string }> = {
  high: { text: "text-red-400", bg: "bg-red-900 bg-opacity-30" },
  medium: { text: "text-kairos-gold", bg: "bg-yellow-900 bg-opacity-20" },
  low: { text: "text-kairos-silver-dark", bg: "bg-gray-700 bg-opacity-20" },
};

// ─── Marketplace ─────────────────────────────────────────────────

export interface SupplementProduct {
  id: string;
  name: string;
  brand: string;
  wholesale: number;
  retail: number;
  recommended: boolean;
}

export interface MarketplaceStats {
  recommendedCount: number;
  avgMarkup: number;
  monthlyRevenue: number;
  totalProducts: number;
}

// ─── Coach Profile ───────────────────────────────────────────────

export interface CoachProfileData {
  id: string;
  name: string;
  initials: string;
  credentials: string[];
  specializations: string[];
  bio: string;
  education: string[];
  certifications: string[];
  yearsExperience: number;
  availableHours: string;
  sessionDuration: number;
  maxClientCapacity: number;
  email: string;
  phone: string;
  totalClients: number;
  activeProtocols: number;
  avgRating: number;
  yearsOnPlatform: number;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}
