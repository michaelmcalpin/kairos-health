// ─── User & Auth Types ───
export type UserRole = "client" | "trainer" | "company_admin" | "super_admin";
export type ClientTier = "tier1" | "tier2" | "tier3";

export type UserProfile = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  avatarUrl: string | null;
};

// ─── KPI Types ───
export type KPIData = {
  glucose: { value: number; unit: string; timestamp: Date } | null;
  heartRate: { value: number; timestamp: Date } | null;
  hrv: { value: number; timestamp: Date } | null;
  sleep: { duration: number; quality: number | null; timestamp: Date } | null;
  unreadAlerts: number;
  checkedInToday: boolean;
  healthScore: number | null;
};

// ─── Alert Types ───
export type AlertPriority = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertCategory =
  | "glucose"
  | "heart_rate"
  | "hrv"
  | "sleep"
  | "adherence"
  | "labs"
  | "checkin"
  | "system"
  | "coach"
  | "ai";

export type Alert = {
  id: string;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  category: AlertCategory;
  createdAt: Date;
};

// ─── Protocol Types ───
export type ProtocolStatus = "active" | "paused" | "completed" | "draft";

export type ProtocolItem = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  instructions: string | null;
};

// ─── Biometric Types ───
export type TrendDirection = "up" | "down" | "flat";

export type BiometricReading = {
  value: number;
  unit: string;
  recordedAt: Date;
  source: string;
};

// ─── Coach Types ───
export type CoachClient = {
  id: string;
  userId: string;
  name: string;
  tier: ClientTier;
  healthScore: number | null;
  activeAlerts: number;
  lastActivity: Date | null;
};

// ─── Transfer Types ───
export type TransferStatus = "pending" | "accepted" | "rejected";

export type ClientTransfer = {
  id: string;
  clientId: string;
  fromCoachId: string;
  toCoachId: string;
  status: TransferStatus;
  revenueSharePercent: number;
  rejectionReason: string | null;
  createdAt: Date;
};
