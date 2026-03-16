import { describe, it, expect, beforeEach } from "vitest";
import {
  seedCoachClients,
  listCoachClients,
  getCoachClient,
  getRosterStats,
  filterCoachClients,
  resolveAlert,
  addCoachNote,
  getCoachNotes,
  pinNote,
  deleteNote,
  resetCoachClientsStore,
} from "../engine";
import {
  getInitials,
  formatRelativeTime,
  deriveStatus,
  deriveTrend,
} from "../types";

const COACH_ID = "test-coach";

beforeEach(() => {
  resetCoachClientsStore();
});

// ─── seedCoachClients ─────────────────────────────────────────

describe("seedCoachClients", () => {
  it("seeds 8 demo clients", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(clients).toHaveLength(8);
  });

  it("is idempotent — seeding twice does not duplicate", () => {
    seedCoachClients(COACH_ID);
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(clients).toHaveLength(8);
  });

  it("creates clients with required fields", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    for (const c of clients) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.initials).toHaveLength(2);
      expect(c.email).toContain("@");
      expect(["tier1", "tier2", "tier3"]).toContain(c.tier);
      expect(c.healthScore).toBeGreaterThanOrEqual(0);
      expect(c.healthScore).toBeLessThanOrEqual(100);
      expect(["up", "down", "flat"]).toContain(c.scoreTrend);
      expect(["stable", "attention", "critical"]).toContain(c.status);
      expect(c.adherence).toBeGreaterThanOrEqual(0);
      expect(c.adherence).toBeLessThanOrEqual(100);
    }
  });
});

// ─── listCoachClients ─────────────────────────────────────────

describe("listCoachClients", () => {
  it("returns summaries with all required fields", () => {
    const clients = listCoachClients(COACH_ID);
    expect(clients.length).toBeGreaterThan(0);
    const c = clients[0];
    expect(c).toHaveProperty("id");
    expect(c).toHaveProperty("name");
    expect(c).toHaveProperty("initials");
    expect(c).toHaveProperty("email");
    expect(c).toHaveProperty("tier");
    expect(c).toHaveProperty("healthScore");
    expect(c).toHaveProperty("scoreTrend");
    expect(c).toHaveProperty("activeAlerts");
    expect(c).toHaveProperty("adherence");
    expect(c).toHaveProperty("lastActive");
    expect(c).toHaveProperty("status");
    expect(c).toHaveProperty("memberSince");
  });

  it("has correct tier distribution (4 tier1, 2 tier2, 2 tier3)", () => {
    const clients = listCoachClients(COACH_ID);
    expect(clients.filter((c) => c.tier === "tier1")).toHaveLength(4);
    expect(clients.filter((c) => c.tier === "tier2")).toHaveLength(2);
    expect(clients.filter((c) => c.tier === "tier3")).toHaveLength(2);
  });
});

// ─── getCoachClient ───────────────────────────────────────────

describe("getCoachClient", () => {
  it("returns full detail for a valid client", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const detail = getCoachClient(clients[0].id);
    expect(detail).not.toBeNull();
    expect(detail!.metrics).toBeDefined();
    expect(detail!.protocol).toBeDefined();
    expect(detail!.alerts).toBeInstanceOf(Array);
    expect(detail!.recentActivity).toBeInstanceOf(Array);
  });

  it("returns null for unknown client", () => {
    seedCoachClients(COACH_ID);
    expect(getCoachClient("nonexistent")).toBeNull();
  });

  it("has valid metrics", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const detail = getCoachClient(clients[0].id);
    const m = detail!.metrics;
    expect(m.glucoseData).toHaveLength(7);
    expect(m.sleepData).toHaveLength(7);
    expect(m.weightData).toHaveLength(5);
    expect(m.adherence).toBeGreaterThanOrEqual(0);
    expect(m.adherence).toBeLessThanOrEqual(100);
    expect(m.checkInStreak).toBeGreaterThanOrEqual(0);
  });

  it("has valid protocol", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const detail = getCoachClient(clients[0].id);
    const p = detail!.protocol;
    expect(p.name).toBeTruthy();
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(100);
    expect(p.goals.length).toBeGreaterThanOrEqual(3);
    expect(["active", "paused", "completed"]).toContain(p.status);
  });

  it("has activity sorted by timestamp descending", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const detail = getCoachClient(clients[0].id);
    const activities = detail!.recentActivity;
    for (let i = 1; i < activities.length; i++) {
      expect(new Date(activities[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(activities[i].timestamp).getTime()
      );
    }
  });
});

// ─── getRosterStats ───────────────────────────────────────────

describe("getRosterStats", () => {
  it("returns correct totals", () => {
    const stats = getRosterStats(COACH_ID);
    expect(stats.totalClients).toBe(8);
    expect(stats.tier1Count).toBe(4);
    expect(stats.tier2Count).toBe(2);
    expect(stats.tier3Count).toBe(2);
    expect(stats.tier1Count + stats.tier2Count + stats.tier3Count).toBe(stats.totalClients);
  });

  it("status counts sum to total", () => {
    const stats = getRosterStats(COACH_ID);
    expect(stats.stableCount + stats.attentionCount + stats.criticalCount).toBe(stats.totalClients);
  });

  it("has valid averages", () => {
    const stats = getRosterStats(COACH_ID);
    expect(stats.avgHealthScore).toBeGreaterThan(0);
    expect(stats.avgHealthScore).toBeLessThanOrEqual(100);
    expect(stats.avgAdherence).toBeGreaterThan(0);
    expect(stats.avgAdherence).toBeLessThanOrEqual(100);
  });
});

// ─── filterCoachClients ───────────────────────────────────────

describe("filterCoachClients", () => {
  it("filters by search term (name)", () => {
    const results = filterCoachClients(COACH_ID, { search: "Sarah" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.name.toLowerCase().includes("sarah"))).toBe(true);
  });

  it("filters by search term (email)", () => {
    const results = filterCoachClients(COACH_ID, { search: "emma.w" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.email.toLowerCase().includes("emma.w"))).toBe(true);
  });

  it("filters by tier", () => {
    const results = filterCoachClients(COACH_ID, { tier: "tier1" });
    expect(results).toHaveLength(4);
    expect(results.every((c) => c.tier === "tier1")).toBe(true);
  });

  it("filters by status", () => {
    const stats = getRosterStats(COACH_ID);
    const results = filterCoachClients(COACH_ID, { status: "stable" });
    expect(results).toHaveLength(stats.stableCount);
    expect(results.every((c) => c.status === "stable")).toBe(true);
  });

  it("sorts by healthScore descending", () => {
    const results = filterCoachClients(COACH_ID, { sortBy: "healthScore", sortOrder: "desc" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].healthScore).toBeGreaterThanOrEqual(results[i].healthScore);
    }
  });

  it("sorts by name ascending", () => {
    const results = filterCoachClients(COACH_ID, { sortBy: "name", sortOrder: "asc" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].name.localeCompare(results[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it("returns empty for no match", () => {
    const results = filterCoachClients(COACH_ID, { search: "zzzznonexistentzzzz" });
    expect(results).toHaveLength(0);
  });

  it("combines tier and search", () => {
    const results = filterCoachClients(COACH_ID, { search: "a", tier: "tier1" });
    expect(results.every((c) => c.tier === "tier1")).toBe(true);
    expect(results.every((c) => c.name.toLowerCase().includes("a") || c.email.toLowerCase().includes("a"))).toBe(true);
  });
});

// ─── resolveAlert ─────────────────────────────────────────────

describe("resolveAlert", () => {
  it("resolves an alert and sets resolvedAt", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientWithAlerts = clients.find((c) => c.activeAlerts > 0);
    if (!clientWithAlerts) return; // skip if no alerts in seed data

    const detail = getCoachClient(clientWithAlerts.id)!;
    const unresolvedAlert = detail.alerts.find((a) => !a.resolved);
    if (!unresolvedAlert) return;

    const result = resolveAlert(clientWithAlerts.id, unresolvedAlert.id);
    expect(result).not.toBeNull();
    expect(result!.resolved).toBe(true);
    expect(result!.resolvedAt).toBeTruthy();
  });

  it("returns null for unknown client", () => {
    seedCoachClients(COACH_ID);
    expect(resolveAlert("nonexistent", "alert-1")).toBeNull();
  });

  it("returns null for unknown alert", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(resolveAlert(clients[0].id, "nonexistent-alert")).toBeNull();
  });

  it("updates client status after resolving", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientWithAlerts = clients.find((c) => c.activeAlerts > 0);
    if (!clientWithAlerts) return;

    const detailBefore = getCoachClient(clientWithAlerts.id)!;
    const unresolvedBefore = detailBefore.alerts.filter((a) => !a.resolved).length;

    const alert = detailBefore.alerts.find((a) => !a.resolved)!;
    resolveAlert(clientWithAlerts.id, alert.id);

    const detailAfter = getCoachClient(clientWithAlerts.id)!;
    const unresolvedAfter = detailAfter.alerts.filter((a) => !a.resolved).length;
    expect(unresolvedAfter).toBe(unresolvedBefore - 1);
  });
});

// ─── Coach Notes ──────────────────────────────────────────────

describe("addCoachNote / getCoachNotes", () => {
  it("adds a note and retrieves it", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientId = clients[0].id;

    const note = addCoachNote(clientId, COACH_ID, "Test note content");
    expect(note.content).toBe("Test note content");
    expect(note.pinned).toBe(false);
    expect(note.clientId).toBe(clientId);
    expect(note.coachId).toBe(COACH_ID);

    const notes = getCoachNotes(clientId);
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Test note content");
  });

  it("returns newest notes first", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientId = clients[0].id;

    addCoachNote(clientId, COACH_ID, "First");
    addCoachNote(clientId, COACH_ID, "Second");

    const notes = getCoachNotes(clientId);
    expect(notes[0].content).toBe("Second");
    expect(notes[1].content).toBe("First");
  });

  it("returns empty for client with no notes", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(getCoachNotes(clients[0].id)).toHaveLength(0);
  });
});

describe("pinNote", () => {
  it("toggles pin on a note", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientId = clients[0].id;
    const note = addCoachNote(clientId, COACH_ID, "Pin test");

    const pinned = pinNote(clientId, note.id);
    expect(pinned!.pinned).toBe(true);

    const unpinned = pinNote(clientId, note.id);
    expect(unpinned!.pinned).toBe(false);
  });

  it("returns null for unknown note", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(pinNote(clients[0].id, "nonexistent")).toBeNull();
  });
});

describe("deleteNote", () => {
  it("deletes a note", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    const clientId = clients[0].id;
    const note = addCoachNote(clientId, COACH_ID, "Delete me");

    expect(deleteNote(clientId, note.id)).toBe(true);
    expect(getCoachNotes(clientId)).toHaveLength(0);
  });

  it("returns false for unknown note", () => {
    seedCoachClients(COACH_ID);
    const clients = listCoachClients(COACH_ID);
    expect(deleteNote(clients[0].id, "nonexistent")).toBe(false);
  });
});

// ─── Type Helpers ─────────────────────────────────────────────

describe("getInitials", () => {
  it("extracts two-letter initials", () => {
    expect(getInitials("Michael McAlpin")).toBe("MM");
    expect(getInitials("Sarah Kim")).toBe("SK");
    expect(getInitials("A B C")).toBe("AB");
  });

  it("handles single name", () => {
    expect(getInitials("Madonna")).toBe("M");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'Just now' for recent times", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("Just now");
  });

  it("returns minutes for <60 min", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();
    const result = formatRelativeTime(thirtyMinAgo);
    expect(result).toMatch(/\d+m ago/);
  });

  it("returns hours for <24 hrs", () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString();
    const result = formatRelativeTime(fiveHoursAgo);
    expect(result).toMatch(/\d+h ago/);
  });

  it("returns days for <7 days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toMatch(/\d+d ago/);
  });
});

describe("deriveStatus", () => {
  it("returns critical for low score", () => {
    expect(deriveStatus(50, 0)).toBe("critical");
  });

  it("returns critical for many alerts", () => {
    expect(deriveStatus(90, 4)).toBe("critical");
  });

  it("returns attention for moderate score", () => {
    expect(deriveStatus(70, 1)).toBe("attention");
  });

  it("returns attention for 2+ alerts", () => {
    expect(deriveStatus(90, 2)).toBe("attention");
  });

  it("returns stable for good score and few alerts", () => {
    expect(deriveStatus(85, 1)).toBe("stable");
  });
});

describe("deriveTrend", () => {
  it("returns up for increasing values (higher is better)", () => {
    expect(deriveTrend([50, 55, 60], "higher")).toBe("up");
  });

  it("returns down for decreasing values (higher is better)", () => {
    expect(deriveTrend([60, 55, 50], "higher")).toBe("down");
  });

  it("returns up for decreasing values (lower is better)", () => {
    expect(deriveTrend([120, 110, 100], "lower")).toBe("up");
  });

  it("returns flat for small changes", () => {
    expect(deriveTrend([100, 100, 101], "higher")).toBe("flat");
  });

  it("returns flat for single value", () => {
    expect(deriveTrend([100])).toBe("flat");
  });
});
