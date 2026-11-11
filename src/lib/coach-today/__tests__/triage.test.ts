import { describe, it, expect } from "vitest";
import { buildTiles, primaryAction, rankTriage, type TriageCandidate } from "../triage";

const c = (over: Partial<TriageCandidate>): TriageCandidate => ({
  id: over.name ?? "x", name: "x", initials: "XX", core: 70, status: "stable", reason: "On track",
  trend: "flat", openAlerts: 0, waiting: null, ...over,
});

describe("rankTriage", () => {
  it("keeps only clients who need action, critical before attention", () => {
    const rows = rankTriage([
      c({ name: "Stable", status: "stable" }),
      c({ name: "NoData", status: "insufficient_data", core: null }),
      c({ name: "Att", status: "attention", core: 40 }),
      c({ name: "Crit", status: "critical", core: 80 }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Crit", "Att"]);
  });
  it("within a group: more alerts, then lower LifeScore, unscored last, then longest wait", () => {
    const rows = rankTriage([
      c({ name: "Unscored", status: "critical", core: null }),
      c({ name: "Low", status: "critical", core: 30 }),
      c({ name: "Alerts", status: "critical", core: 90, openAlerts: 4 }),
      c({ name: "Mid", status: "critical", core: 45 }),
      c({ name: "MidWaiting", status: "critical", core: 45, waiting: { conversationId: "conv", hours: 30 } }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Alerts", "Low", "MidWaiting", "Mid", "Unscored"]);
  });
  it("keeps the LifeScore reason as given", () => {
    const [row] = rankTriage([c({ name: "A", status: "attention", reason: "Time asleep low (42/100)" })]);
    expect(row.reason).toBe("Time asleep low (42/100)");
  });
});

describe("primaryAction", () => {
  it("waiting message → Reply", () => {
    expect(primaryAction({ id: "a", openAlerts: 3, waiting: { conversationId: "conv1", hours: 5 } }))
      .toEqual({ kind: "message", label: "Reply", href: "/trainer/messages?conversationId=conv1" });
  });
  it("open alerts → Review alert(s) in the Inbox for that client", () => {
    expect(primaryAction({ id: "a", openAlerts: 1, waiting: null })).toMatchObject({ kind: "alert", label: "Review alert", href: "/trainer/inbox?category=health&client=a" });
    expect(primaryAction({ id: "a", openAlerts: 2, waiting: null }).label).toBe("Review alerts");
  });
  it("otherwise → Open client", () => {
    expect(primaryAction({ id: "a", openAlerts: 0, waiting: null })).toEqual({ kind: "open", label: "Open client", href: "/trainer/clients/a" });
  });
});

describe("buildTiles", () => {
  it("counts from the same lists the page shows; cancelled sessions don't count", () => {
    const triage = rankTriage([
      c({ name: "A", status: "critical" }), c({ name: "B", status: "attention" }), c({ name: "C", status: "attention" }),
    ]);
    expect(buildTiles(triage, [2, 50], [{ status: "confirmed" }, { status: "cancelled" }, { status: "pending" }]))
      .toEqual({ critical: 1, attention: 2, unanswered: 2, oldestWaitingHours: 50, sessions: 2 });
    expect(buildTiles([], [], [])).toEqual({ critical: 0, attention: 0, unanswered: 0, oldestWaitingHours: null, sessions: 0 });
  });
});
