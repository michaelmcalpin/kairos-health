// ─── Admin Coaches & Dashboard Types ────────────────────────────

export type CoachStatus = "Active" | "On Leave" | "Pending";

export interface AdminCoach {
  id: string;
  name: string;
  specialization: string;
  status: CoachStatus;
  clientsAssigned: number;
  clientCapacity: number;
  revenueGenerated: number;
  avgHealthScore: number;
  responseTimeMin: number;
}

export interface AdminCoachStats {
  totalCoaches: number;
  activeCoaches: number;
  onLeaveCoaches: number;
  pendingCoaches: number;
  totalClients: number;
  totalRevenue: number;
  avgHealthScore: number;
}

export interface PlatformActivity {
  id: string;
  event: string;
  detail: string;
  time: string;
}

export interface AdminDashboardKPI {
  label: string;
  value: string;
  trend?: "up" | "down";
  trendValue?: string;
  icon: string;
  highlight?: boolean;
}

export interface AdminDashboardData {
  kpis: AdminDashboardKPI[];
  coachPerformance: AdminCoach[];
  recentActivity: PlatformActivity[];
}

export const STATUS_COLORS: Record<CoachStatus, string> = {
  Active: "bg-green-900 text-green-200",
  "On Leave": "bg-yellow-900 text-yellow-200",
  Pending: "bg-blue-900 text-blue-200",
};

export const SPECIALIZATIONS = [
  "Longevity Medicine",
  "Metabolic Health",
  "Sleep Optimization",
  "Functional Medicine",
  "Nutrition Science",
  "Performance Medicine",
];
