// ─── Admin Coaches Engine ────────────────────────────────────────
// In-memory store for admin coach management, platform dashboard
// KPIs, and activity feed.

import type {
  AdminCoach,
  CoachStatus,
  AdminCoachStats,
  PlatformActivity,
  AdminDashboardData,
  AdminDashboardKPI,
} from "./types";
import { SPECIALIZATIONS } from "./types";

// ─── Store ──────────────────────────────────────────────────────

const coachStore = new Map<string, AdminCoach>();

// ─── Seeded Random ──────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function seededFloat(seed: number, min: number, max: number): number {
  return Math.round((seededRandom(seed) * (max - min) + min) * 10) / 10;
}

function uid(): string {
  return `ac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Demo Data ──────────────────────────────────────────────────

const DEMO_COACHES = [
  { name: "Dr. Sarah Mitchell", spec: 0 },
  { name: "Dr. James Chen", spec: 1 },
  { name: "Dr. Emma Rodriguez", spec: 2 },
  { name: "Dr. Michael Torres", spec: 3 },
  { name: "Dr. Lisa Anderson", spec: 4 },
  { name: "Dr. David Kim", spec: 5 },
  { name: "Dr. Rachel Green", spec: 0 },
  { name: "Dr. Marcus Thompson", spec: 1 },
  { name: "Dr. Patricia Williams", spec: 3 },
  { name: "Dr. Christopher Lee", spec: 2 },
  { name: "Dr. Amanda Foster", spec: 4 },
  { name: "Dr. Nathan Price", spec: 5 },
];

// ─── Seed ───────────────────────────────────────────────────────

export function seedAdminCoaches(): void {
  if (coachStore.size > 0) return;

  DEMO_COACHES.forEach((demo, i) => {
    const id = `coach_${i + 1}`;
    const seed = i * 47 + 200;

    // Most are active, one on leave, one pending
    let status: CoachStatus = "Active";
    if (i === 8) status = "On Leave";
    if (i === 10) status = "Pending";

    const capacity = status === "Pending" ? 0 : seededInt(seed + 1, 12, 15);
    const assigned = status === "Active"
      ? seededInt(seed + 2, Math.max(6, capacity - 5), capacity)
      : 0;
    const revenue = status === "Active"
      ? seededInt(seed + 3, 28000, 55000)
      : 0;
    const avgHealth = status === "Active"
      ? seededFloat(seed + 4, 7.8, 9.2)
      : 0;
    const responseTime = status === "Active"
      ? seededInt(seed + 5, 5, 25)
      : 0;

    coachStore.set(id, {
      id,
      name: demo.name,
      specialization: SPECIALIZATIONS[demo.spec],
      status,
      clientsAssigned: assigned,
      clientCapacity: capacity,
      revenueGenerated: revenue,
      avgHealthScore: avgHealth,
      responseTimeMin: responseTime,
    });
  });
}

// ─── Queries ────────────────────────────────────────────────────

export function listAdminCoaches(): AdminCoach[] {
  seedAdminCoaches();
  return Array.from(coachStore.values());
}

export function getAdminCoach(coachId: string): AdminCoach | null {
  seedAdminCoaches();
  return coachStore.get(coachId) ?? null;
}

export function getAdminCoachStats(): AdminCoachStats {
  seedAdminCoaches();
  const coaches = Array.from(coachStore.values());
  const active = coaches.filter((c) => c.status === "Active");

  return {
    totalCoaches: coaches.length,
    activeCoaches: active.length,
    onLeaveCoaches: coaches.filter((c) => c.status === "On Leave").length,
    pendingCoaches: coaches.filter((c) => c.status === "Pending").length,
    totalClients: active.reduce((s, c) => s + c.clientsAssigned, 0),
    totalRevenue: active.reduce((s, c) => s + c.revenueGenerated, 0),
    avgHealthScore: active.length > 0
      ? Math.round((active.reduce((s, c) => s + c.avgHealthScore, 0) / active.length) * 10) / 10
      : 0,
  };
}

// ─── Filter ─────────────────────────────────────────────────────

export interface CoachFilterOptions {
  search?: string;
  status?: CoachStatus | "All";
}

export function filterAdminCoaches(filters: CoachFilterOptions = {}): AdminCoach[] {
  let coaches = listAdminCoaches();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    coaches = coaches.filter(
      (c) => c.name.toLowerCase().includes(q) || c.specialization.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== "All") {
    coaches = coaches.filter((c) => c.status === filters.status);
  }

  return coaches;
}

// ─── Admin Dashboard ────────────────────────────────────────────

export function getAdminDashboard(range: { startDate: string; endDate: string }): AdminDashboardData {
  seedAdminCoaches();
  const stats = getAdminCoachStats();
  const coaches = listAdminCoaches();
  const baseSeed = hashDateRange(range.startDate);

  // KPIs
  const kpis: AdminDashboardKPI[] = [
    {
      label: "Total Clients",
      value: stats.totalClients.toString(),
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 10, 3, 12)} this month`,
      icon: "users",
    },
    {
      label: "Active Coaches",
      value: stats.activeCoaches.toString(),
      icon: "user-circle",
    },
    {
      label: "Monthly Revenue",
      value: `$${(stats.totalRevenue / 1000).toFixed(1)}K`,
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 12, 8, 25)}%`,
      icon: "dollar",
      highlight: true,
    },
    {
      label: "Supplement Revenue",
      value: `$${seededFloat(baseSeed + 13, 4.0, 8.0)}K`,
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 14, 10, 20)}%`,
      icon: "trending",
    },
    {
      label: "Platform Health",
      value: `${seededFloat(baseSeed + 15, 99.2, 99.9)}`,
      icon: "shield",
    },
    {
      label: "Avg Health Score",
      value: Math.round(stats.avgHealthScore * 10).toString(),
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 16, 1, 5)} pts`,
      icon: "activity",
    },
  ];

  // Coach performance — top 5 by revenue
  const coachPerformance = [...coaches]
    .filter((c) => c.status === "Active")
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5);

  // Recent platform activity
  const activityTemplates = [
    { event: "New client onboarded", detailFn: (c: AdminCoach) => `Assigned to ${c.name}` },
    { event: "Protocol updated", detailFn: (c: AdminCoach) => `${c.name}'s client protocol` },
    { event: "Lab results imported", detailFn: (c: AdminCoach) => `Client of ${c.name}` },
    { event: "Coach milestone", detailFn: (c: AdminCoach) => `${c.name} reached ${c.clientsAssigned} clients` },
    { event: "Revenue milestone", detailFn: () => `$${(stats.totalRevenue / 1000).toFixed(0)}K monthly achieved` },
  ];

  const activeCoaches = coaches.filter((c) => c.status === "Active");
  const recentActivity: PlatformActivity[] = activityTemplates.map((tmpl, i) => {
    const coach = activeCoaches[seededInt(baseSeed + 30 + i, 0, activeCoaches.length - 1)];
    const hoursAgo = seededInt(baseSeed + 40 + i, 1, 48);
    const timeStr = hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
    return {
      id: uid(),
      event: tmpl.event,
      detail: tmpl.detailFn(coach),
      time: timeStr,
    };
  });

  return { kpis, coachPerformance, recentActivity };
}

// ─── Reset ──────────────────────────────────────────────────────

export function resetAdminCoachesStore(): void {
  coachStore.clear();
}

// ─── Helpers ────────────────────────────────────────────────────

function hashDateRange(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
