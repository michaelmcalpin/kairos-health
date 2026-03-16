// ─── Coach Client Management Engine ────────────────────────────
// In-memory store for coach-client relationships, health metrics,
// protocols, alerts, activity feeds, and notes.

import type {
  CoachClientSummary,
  CoachClientDetail,
  CoachRosterStats,
  ClientMetrics,
  ClientProtocol,
  ClientAlert,
  ClientActivity,
  CoachNote,
  ClientTier,
  ClientStatus,
  AlertPriority,
  AlertCategory,
  ActivityType,
} from "./types";
import {
  uid,
  getInitials,
  formatRelativeTime,
  deriveStatus,
  deriveTrend,
} from "./types";

// ─── Stores ────────────────────────────────────────────────────

const clientStore = new Map<string, CoachClientDetail>();
const noteStore = new Map<string, CoachNote[]>(); // clientId → notes

// ─── Seeded Random ─────────────────────────────────────────────

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

// ─── Demo Data ─────────────────────────────────────────────────

const DEMO_CLIENTS = [
  { name: "Michael McAlpin", email: "michael@example.com", tier: "tier1" as ClientTier },
  { name: "Sarah Kim", email: "sarah.kim@example.com", tier: "tier1" as ClientTier },
  { name: "James Torres", email: "james.t@example.com", tier: "tier1" as ClientTier },
  { name: "Lisa Park", email: "lisa.park@example.com", tier: "tier1" as ClientTier },
  { name: "David Chen", email: "david.chen@example.com", tier: "tier2" as ClientTier },
  { name: "Emma Wilson", email: "emma.w@example.com", tier: "tier2" as ClientTier },
  { name: "Alex Rivera", email: "alex.r@example.com", tier: "tier3" as ClientTier },
  { name: "Nina Patel", email: "nina.p@example.com", tier: "tier3" as ClientTier },
];

const PROTOCOL_NAMES = [
  "Metabolic Optimization Phase 2",
  "Sleep Architecture Reset",
  "Glucose Stabilization Protocol",
  "Athletic Performance Enhancement",
  "Hormonal Balance Recovery",
  "Longevity Foundation Program",
  "Weight Management Phase 1",
  "Stress Resilience Protocol",
];

const PROTOCOL_GOALS = [
  "Reduce fasting glucose to <100 mg/dL",
  "Optimize circadian rhythm sleep pattern",
  "Increase HRV by 15%",
  "Maintain adherence >90%",
  "Achieve 90% time-in-range for glucose",
  "Reach 7+ hours consistent sleep",
  "Complete 150+ minutes weekly exercise",
  "Reduce body fat to target range",
  "Optimize vitamin D levels >60 ng/mL",
  "Eliminate processed sugar from diet",
];

const ALERT_MESSAGES: Array<{ msg: string; cat: AlertCategory; pri: AlertPriority }> = [
  { msg: "Glucose levels elevated at 3 consecutive readings", cat: "glucose", pri: "high" },
  { msg: "Sleep duration below target (6.5 hours last night)", cat: "sleep", pri: "medium" },
  { msg: "Missed supplement protocol 3 days in a row", cat: "adherence", pri: "high" },
  { msg: "No workout logged in 5 days", cat: "activity", pri: "medium" },
  { msg: "Fasting glucose trending up over 2 weeks", cat: "glucose", pri: "high" },
  { msg: "Sleep consistency score dropped below 50", cat: "sleep", pri: "medium" },
  { msg: "Lab results need review (uploaded 2 days ago)", cat: "labs", pri: "low" },
  { msg: "Protocol milestone missed — weekly review needed", cat: "protocol", pri: "medium" },
  { msg: "HRV significantly below baseline (28ms vs 45ms avg)", cat: "activity", pri: "high" },
  { msg: "Check-in streak broken after 14 days", cat: "adherence", pri: "low" },
];

const ACTIVITY_ITEMS: Array<{ label: string; type: ActivityType }> = [
  { label: "Morning Check-in completed", type: "check-in" },
  { label: "Logged supplement: Omega-3, Magnesium", type: "supplement" },
  { label: "Completed 45-min strength training", type: "workout" },
  { label: "Sent message to coach", type: "message" },
  { label: "Lab results uploaded: Metabolic panel", type: "lab" },
  { label: "Updated goal: Sleep 7+ hours", type: "goal" },
  { label: "Completed 30-min Zone 2 cardio", type: "workout" },
  { label: "Evening Check-in completed", type: "check-in" },
  { label: "Logged all supplements for the day", type: "supplement" },
  { label: "Booked follow-up appointment", type: "appointment" },
];

// ─── Seed Demo Data ────────────────────────────────────────────

export function seedCoachClients(coachId: string): void {
  if (clientStore.size > 0) return; // already seeded

  DEMO_CLIENTS.forEach((demo, i) => {
    const clientId = `client_${coachId}_${i}`;
    const seed = i * 37 + 100;

    // Generate metrics
    const glucoseData = Array.from({ length: 7 }, (_, j) => seededInt(seed + j * 3, 82, 125));
    const sleepData = Array.from({ length: 7 }, (_, j) => seededFloat(seed + j * 5 + 50, 5.5, 8.5));
    const weightData = Array.from({ length: 5 }, (_, j) => seededFloat(seed + j * 7 + 100, 140, 200));
    const healthScore = seededInt(seed + 200, 55, 95);
    const adherence = seededInt(seed + 201, 40, 98);
    const hrv = seededInt(seed + 202, 25, 65);
    const checkInStreak = seededInt(seed + 203, 0, 21);

    // Alerts
    const alertCount = seededInt(seed + 300, 0, 4);
    const alerts: ClientAlert[] = Array.from({ length: alertCount }, (_, j) => {
      const alertDef = ALERT_MESSAGES[seededInt(seed + 310 + j, 0, ALERT_MESSAGES.length - 1)];
      const hoursAgo = seededInt(seed + 320 + j, 1, 72);
      const ts = new Date(Date.now() - hoursAgo * 3600000).toISOString();
      return {
        id: uid(),
        clientId,
        priority: alertDef.pri,
        category: alertDef.cat,
        message: alertDef.msg,
        timestamp: ts,
        resolved: false,
        resolvedAt: null,
      };
    });

    // Protocol
    const protocolGoalCount = seededInt(seed + 400, 3, 5);
    const protocolGoals: string[] = [];
    const usedGoals = new Set<number>();
    for (let j = 0; j < protocolGoalCount; j++) {
      let idx = seededInt(seed + 410 + j, 0, PROTOCOL_GOALS.length - 1);
      while (usedGoals.has(idx)) idx = (idx + 1) % PROTOCOL_GOALS.length;
      usedGoals.add(idx);
      protocolGoals.push(PROTOCOL_GOALS[idx]);
    }

    const protocol: ClientProtocol = {
      id: uid(),
      name: PROTOCOL_NAMES[i % PROTOCOL_NAMES.length],
      startDate: new Date(Date.now() - seededInt(seed + 420, 14, 90) * 86400000).toISOString().split("T")[0],
      duration: `${seededInt(seed + 421, 8, 16)} weeks`,
      progress: seededInt(seed + 422, 15, 85),
      goals: protocolGoals,
      status: "active",
    };

    // Activity feed
    const activityCount = seededInt(seed + 500, 4, 8);
    const recentActivity: ClientActivity[] = Array.from({ length: activityCount }, (_, j) => {
      const actDef = ACTIVITY_ITEMS[seededInt(seed + 510 + j, 0, ACTIVITY_ITEMS.length - 1)];
      const hoursAgo = seededInt(seed + 520 + j, 1, 96);
      return {
        id: uid(),
        clientId,
        type: actDef.type,
        label: actDef.label,
        timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const status = deriveStatus(healthScore, alerts.length);
    const memberMonthsAgo = seededInt(seed + 600, 2, 24);
    const memberSince = new Date(Date.now() - memberMonthsAgo * 30 * 86400000).toISOString().split("T")[0];
    const lastActiveHours = seededInt(seed + 601, 1, 48);
    const lastActiveDate = new Date(Date.now() - lastActiveHours * 3600000).toISOString();

    const metrics: ClientMetrics = {
      avgGlucose: Math.round(glucoseData.reduce((a, b) => a + b, 0) / glucoseData.length),
      glucoseTrend: deriveTrend(glucoseData, "lower"),
      glucoseData,
      sleepScore: seededInt(seed + 210, 55, 90),
      sleepTrend: deriveTrend(sleepData, "higher"),
      sleepData,
      hrv,
      hrvTrend: seededRandom(seed + 211) > 0.5 ? "up" : "flat",
      weight: weightData[weightData.length - 1],
      weightData,
      bodyFat: seededFloat(seed + 212, 12, 28),
      adherence,
      checkInStreak,
    };

    const detail: CoachClientDetail = {
      id: clientId,
      name: demo.name,
      initials: getInitials(demo.name),
      email: demo.email,
      tier: demo.tier,
      healthScore,
      scoreTrend: seededRandom(seed + 220) > 0.6 ? "up" : seededRandom(seed + 221) > 0.4 ? "flat" : "down",
      status,
      memberSince,
      lastActive: formatRelativeTime(lastActiveDate),
      metrics,
      protocol,
      alerts,
      recentActivity,
    };

    clientStore.set(clientId, detail);
  });
}

// ─── Queries ───────────────────────────────────────────────────

export function listCoachClients(coachId: string): CoachClientSummary[] {
  seedCoachClients(coachId);

  const summaries: CoachClientSummary[] = [];
  for (const detail of Array.from(clientStore.values())) {
    summaries.push({
      id: detail.id,
      name: detail.name,
      initials: detail.initials,
      email: detail.email,
      tier: detail.tier,
      healthScore: detail.healthScore,
      scoreTrend: detail.scoreTrend,
      activeAlerts: detail.alerts.filter((a) => !a.resolved).length,
      adherence: detail.metrics.adherence,
      lastActive: detail.lastActive,
      lastActiveDate: detail.memberSince, // simplified
      status: detail.status,
      nextSession: detail.protocol.status === "active" ? null : null, // will be set from detail
      memberSince: detail.memberSince,
    });
  }

  return summaries;
}

export function getCoachClient(clientId: string): CoachClientDetail | null {
  return clientStore.get(clientId) ?? null;
}

export function getRosterStats(coachId: string): CoachRosterStats {
  seedCoachClients(coachId);
  const clients = Array.from(clientStore.values());

  return {
    totalClients: clients.length,
    tier1Count: clients.filter((c) => c.tier === "tier1").length,
    tier2Count: clients.filter((c) => c.tier === "tier2").length,
    tier3Count: clients.filter((c) => c.tier === "tier3").length,
    criticalCount: clients.filter((c) => c.status === "critical").length,
    attentionCount: clients.filter((c) => c.status === "attention").length,
    stableCount: clients.filter((c) => c.status === "stable").length,
    avgHealthScore: clients.length > 0
      ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length)
      : 0,
    avgAdherence: clients.length > 0
      ? Math.round(clients.reduce((s, c) => s + c.metrics.adherence, 0) / clients.length)
      : 0,
    totalAlerts: clients.reduce((s, c) => s + c.alerts.filter((a) => !a.resolved).length, 0),
  };
}

// ─── Mutations ─────────────────────────────────────────────────

export function resolveAlert(clientId: string, alertId: string): ClientAlert | null {
  const client = clientStore.get(clientId);
  if (!client) return null;

  const alert = client.alerts.find((a) => a.id === alertId);
  if (!alert || alert.resolved) return null;

  alert.resolved = true;
  alert.resolvedAt = new Date().toISOString();

  // Recalculate status
  const unresolvedAlerts = client.alerts.filter((a) => !a.resolved).length;
  client.status = deriveStatus(client.healthScore, unresolvedAlerts);

  return alert;
}

export function addCoachNote(clientId: string, coachId: string, content: string): CoachNote {
  const note: CoachNote = {
    id: uid(),
    clientId,
    coachId,
    content,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = noteStore.get(clientId) ?? [];
  noteStore.set(clientId, [note, ...existing]);
  return note;
}

export function getCoachNotes(clientId: string): CoachNote[] {
  return noteStore.get(clientId) ?? [];
}

export function pinNote(clientId: string, noteId: string): CoachNote | null {
  const notes = noteStore.get(clientId) ?? [];
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  return note;
}

export function deleteNote(clientId: string, noteId: string): boolean {
  const notes = noteStore.get(clientId) ?? [];
  const filtered = notes.filter((n) => n.id !== noteId);
  if (filtered.length === notes.length) return false;
  noteStore.set(clientId, filtered);
  return true;
}

// ─── Search & Filter ───────────────────────────────────────────

export interface ClientFilterOptions {
  search?: string;
  tier?: ClientTier | "all";
  status?: ClientStatus | "all";
  sortBy?: "name" | "healthScore" | "alerts" | "lastActive" | "adherence";
  sortOrder?: "asc" | "desc";
}

export function filterCoachClients(
  coachId: string,
  filters: ClientFilterOptions = {},
): CoachClientSummary[] {
  let clients = listCoachClients(coachId);

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    clients = clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }

  // Tier filter
  if (filters.tier && filters.tier !== "all") {
    clients = clients.filter((c) => c.tier === filters.tier);
  }

  // Status filter
  if (filters.status && filters.status !== "all") {
    clients = clients.filter((c) => c.status === filters.status);
  }

  // Sort
  const sortBy = filters.sortBy ?? "name";
  const sortOrder = filters.sortOrder ?? "asc";
  const mult = sortOrder === "asc" ? 1 : -1;

  clients.sort((a, b) => {
    switch (sortBy) {
      case "healthScore":
        return (a.healthScore - b.healthScore) * mult;
      case "alerts":
        return (a.activeAlerts - b.activeAlerts) * mult;
      case "adherence":
        return (a.adherence - b.adherence) * mult;
      case "lastActive":
        return a.lastActive.localeCompare(b.lastActive) * mult;
      default:
        return a.name.localeCompare(b.name) * mult;
    }
  });

  return clients;
}

// ─── Reset (testing) ───────────────────────────────────────────

export function resetCoachClientsStore(): void {
  clientStore.clear();
  noteStore.clear();
}
