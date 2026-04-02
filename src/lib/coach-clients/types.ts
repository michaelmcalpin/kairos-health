// ─── Coach Client Management Types ─────────────────────────────
// Types for the coach's view of their client roster, health metrics,
// protocols, alerts, and activity feeds.

import crypto from "crypto";

export function uid(): string {
  return `cc_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

// ─── Client Tier & Status ──────────────────────────────────────

export type ClientTier = "tier1" | "tier2" | "tier3";
export type ClientStatus = "stable" | "attention" | "critical";
export type ScoreTrend = "up" | "down" | "flat";

// ─── Coach Client Summary (list view) ──────────────────────────

export interface CoachClientSummary {
  id: string;
  name: string;
  initials: string;
  email: string;
  tier: ClientTier;
  healthScore: number;
  scoreTrend: ScoreTrend;
  activeAlerts: number;
  adherence: number; // 0-100
  lastActive: string; // relative time string
  lastActiveDate: string; // ISO date
  status: ClientStatus;
  nextSession: string | null;
  memberSince: string; // ISO date
}

// ─── Client Health Metrics ─────────────────────────────────────

export interface ClientMetrics {
  avgGlucose: number | null;
  glucoseTrend: ScoreTrend;
  glucoseData: number[]; // last 7 values
  sleepScore: number | null;
  sleepTrend: ScoreTrend;
  sleepData: number[]; // hours, last 7 nights
  hrv: number | null;
  hrvTrend: ScoreTrend;
  weight: number | null;
  weightData: number[]; // last 5 weigh-ins
  bodyFat: number | null;
  adherence: number;
  checkInStreak: number;
}

// ─── Client Protocol ───────────────────────────────────────────

export interface ClientProtocol {
  id: string;
  name: string;
  startDate: string;
  duration: string;
  progress: number; // 0-100
  goals: string[];
  status: "active" | "paused" | "completed";
}

// ─── Client Alert ──────────────────────────────────────────────

export type AlertPriority = "high" | "medium" | "low";
export type AlertCategory = "glucose" | "sleep" | "adherence" | "activity" | "labs" | "protocol";

export interface ClientAlert {
  id: string;
  clientId: string;
  priority: AlertPriority;
  category: AlertCategory;
  message: string;
  timestamp: string; // ISO
  resolved: boolean;
  resolvedAt: string | null;
}

// ─── Activity Feed ─────────────────────────────────────────────

export type ActivityType = "check-in" | "supplement" | "workout" | "message" | "lab" | "goal" | "appointment";

export interface ClientActivity {
  id: string;
  clientId: string;
  type: ActivityType;
  label: string;
  timestamp: string; // ISO
}

// ─── Full Client Detail ────────────────────────────────────────

export interface CoachClientDetail {
  id: string;
  name: string;
  initials: string;
  email: string;
  tier: ClientTier;
  healthScore: number;
  scoreTrend: ScoreTrend;
  status: ClientStatus;
  memberSince: string;
  lastActive: string;
  metrics: ClientMetrics;
  protocol: ClientProtocol;
  alerts: ClientAlert[];
  recentActivity: ClientActivity[];
}

// ─── Coach Roster Stats ────────────────────────────────────────

export interface CoachRosterStats {
  totalClients: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  criticalCount: number;
  attentionCount: number;
  stableCount: number;
  avgHealthScore: number;
  avgAdherence: number;
  totalAlerts: number;
}

// ─── Notes & Tags ──────────────────────────────────────────────

export interface CoachNote {
  id: string;
  clientId: string;
  coachId: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ─────────────────────────────────────────────────

export const TIER_LABELS: Record<ClientTier, string> = {
  tier1: "Private",
  tier2: "Associate",
  tier3: "AI-Guided",
};

export const TIER_COLORS: Record<ClientTier, string> = {
  tier1: "text-kairos-gold",
  tier2: "text-blue-400",
  tier3: "text-purple-400",
};

export const TIER_BADGE_COLORS: Record<ClientTier, string> = {
  tier1: "bg-kairos-gold/20 text-kairos-gold border-kairos-gold/30",
  tier2: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tier3: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export const STATUS_LABELS: Record<ClientStatus, string> = {
  stable: "Stable",
  attention: "Needs Attention",
  critical: "Critical",
};

export const STATUS_COLORS: Record<ClientStatus, string> = {
  stable: "text-green-400",
  attention: "text-yellow-400",
  critical: "text-red-400",
};

export const STATUS_DOT_COLORS: Record<ClientStatus, string> = {
  stable: "bg-green-400",
  attention: "bg-yellow-400",
  critical: "bg-red-400",
};

export const ALERT_PRIORITY_COLORS: Record<AlertPriority, string> = {
  high: "border-orange-400 bg-orange-400/10",
  medium: "border-yellow-400 bg-yellow-400/10",
  low: "border-blue-400 bg-blue-400/10",
};

// ─── Helpers ───────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function deriveStatus(healthScore: number, activeAlerts: number): ClientStatus {
  if (healthScore < 60 || activeAlerts >= 4) return "critical";
  if (healthScore < 75 || activeAlerts >= 2) return "attention";
  return "stable";
}

export function deriveTrend(values: number[], direction: "higher" | "lower" = "higher"): ScoreTrend {
  if (values.length < 2) return "flat";
  const recent = values.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const change = ((last - first) / Math.max(1, Math.abs(first))) * 100;
  if (Math.abs(change) < 2) return "flat";
  if (direction === "higher") return change > 0 ? "up" : "down";
  return change < 0 ? "up" : "down";
}
