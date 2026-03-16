// ─── Coach Operations Engine Tests ───────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import {
  seedCoachAlerts,
  listCoachAlerts,
  getCoachAlertStats,
  acknowledgeAlert,
  resolveCoachAlert,
  filterCoachAlerts,
  seedCoachFollowUps,
  listCoachFollowUps,
  getFollowUpStats,
  toggleFollowUpComplete,
  seedMarketplace,
  listProducts,
  toggleRecommendation,
  getMarketplaceStats,
  seedCoachProfile,
  getCoachProfile,
  updateCoachProfile,
  updateNotificationPreferences,
  resetCoachOpsStore,
} from "../engine";
import { resetCoachClientsStore } from "@/lib/coach-clients/engine";

const COACH_ID = "test-coach";

beforeEach(() => {
  resetCoachOpsStore();
  resetCoachClientsStore();
});

// ═════════════════════════════════════════════════════════════════
// ALERTS
// ═════════════════════════════════════════════════════════════════

describe("seedCoachAlerts", () => {
  it("populates 8 alerts", () => {
    seedCoachAlerts(COACH_ID);
    expect(listCoachAlerts(COACH_ID)).toHaveLength(8);
  });

  it("is idempotent", () => {
    seedCoachAlerts(COACH_ID);
    seedCoachAlerts(COACH_ID);
    expect(listCoachAlerts(COACH_ID)).toHaveLength(8);
  });
});

describe("listCoachAlerts", () => {
  it("auto-seeds and returns alerts with required fields", () => {
    const alerts = listCoachAlerts(COACH_ID);
    expect(alerts.length).toBe(8);
    const alert = alerts[0];
    expect(alert).toHaveProperty("id");
    expect(alert).toHaveProperty("clientName");
    expect(alert).toHaveProperty("clientInitials");
    expect(alert).toHaveProperty("title");
    expect(alert).toHaveProperty("message");
    expect(alert).toHaveProperty("priority");
    expect(alert).toHaveProperty("status");
    expect(alert).toHaveProperty("createdAt");
  });
});

describe("getCoachAlertStats", () => {
  it("returns correct counts", () => {
    const stats = getCoachAlertStats(COACH_ID);
    expect(stats.total).toBe(8);
    expect(stats.active).toBeGreaterThan(0);
    expect(stats.critical + stats.high + stats.medium + stats.low).toBeLessThanOrEqual(stats.active);
  });
});

describe("acknowledgeAlert", () => {
  it("changes active alert to acknowledged", () => {
    const alerts = listCoachAlerts(COACH_ID);
    const active = alerts.find((a) => a.status === "active");
    expect(active).toBeDefined();
    const result = acknowledgeAlert(COACH_ID, active!.id);
    expect(result).toBe(true);
    expect(active!.status).toBe("acknowledged");
  });

  it("returns false for non-active alert", () => {
    const alerts = listCoachAlerts(COACH_ID);
    const resolved = alerts.find((a) => a.status === "resolved");
    if (resolved) {
      expect(acknowledgeAlert(COACH_ID, resolved.id)).toBe(false);
    }
  });

  it("returns false for unknown alert", () => {
    listCoachAlerts(COACH_ID);
    expect(acknowledgeAlert(COACH_ID, "nonexistent")).toBe(false);
  });
});

describe("resolveCoachAlert", () => {
  it("resolves an alert", () => {
    const alerts = listCoachAlerts(COACH_ID);
    const active = alerts.find((a) => a.status === "active");
    expect(resolveCoachAlert(COACH_ID, active!.id)).toBe(true);
    expect(active!.status).toBe("resolved");
  });
});

describe("filterCoachAlerts", () => {
  it("returns all with no filters", () => {
    expect(filterCoachAlerts(COACH_ID, {})).toHaveLength(8);
  });

  it("filters by status", () => {
    const active = filterCoachAlerts(COACH_ID, { status: "active" });
    expect(active.every((a) => a.status === "active")).toBe(true);
  });

  it("filters by client name", () => {
    const alerts = listCoachAlerts(COACH_ID);
    const clientName = alerts[0].clientName;
    const filtered = filterCoachAlerts(COACH_ID, { client: clientName });
    expect(filtered.every((a) => a.clientName === clientName)).toBe(true);
  });

  it("combines status and client filters", () => {
    const alerts = listCoachAlerts(COACH_ID);
    const clientName = alerts[0].clientName;
    const filtered = filterCoachAlerts(COACH_ID, { status: "active", client: clientName });
    expect(filtered.every((a) => a.status === "active" && a.clientName === clientName)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// FOLLOW-UPS
// ═════════════════════════════════════════════════════════════════

describe("seedCoachFollowUps", () => {
  it("populates 10 follow-ups", () => {
    seedCoachFollowUps(COACH_ID);
    expect(listCoachFollowUps(COACH_ID)).toHaveLength(10);
  });

  it("is idempotent", () => {
    seedCoachFollowUps(COACH_ID);
    seedCoachFollowUps(COACH_ID);
    expect(listCoachFollowUps(COACH_ID)).toHaveLength(10);
  });
});

describe("listCoachFollowUps", () => {
  it("returns follow-ups with required fields", () => {
    const items = listCoachFollowUps(COACH_ID);
    const item = items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("clientName");
    expect(item).toHaveProperty("clientInitials");
    expect(item).toHaveProperty("description");
    expect(item).toHaveProperty("dueDate");
    expect(item).toHaveProperty("priority");
    expect(item).toHaveProperty("category");
    expect(item).toHaveProperty("completed");
  });

  it("has valid priority values", () => {
    const items = listCoachFollowUps(COACH_ID);
    const validPriorities = ["high", "medium", "low"];
    expect(items.every((f) => validPriorities.includes(f.priority))).toBe(true);
  });
});

describe("getFollowUpStats", () => {
  it("returns stat fields", () => {
    const stats = getFollowUpStats(COACH_ID);
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("overdue");
    expect(stats).toHaveProperty("dueToday");
    expect(stats).toHaveProperty("completedThisWeek");
    expect(stats.total).toBe(10);
  });
});

describe("toggleFollowUpComplete", () => {
  it("toggles completion status", () => {
    const items = listCoachFollowUps(COACH_ID);
    const first = items[0];
    const wasDone = first.completed;
    expect(toggleFollowUpComplete(COACH_ID, first.id)).toBe(true);
    expect(first.completed).toBe(!wasDone);
  });

  it("returns false for unknown id", () => {
    listCoachFollowUps(COACH_ID);
    expect(toggleFollowUpComplete(COACH_ID, "nonexistent")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═════════════════════════════════════════════════════════════════

describe("seedMarketplace", () => {
  it("populates 8 products", () => {
    seedMarketplace(COACH_ID);
    expect(listProducts(COACH_ID)).toHaveLength(8);
  });

  it("is idempotent", () => {
    seedMarketplace(COACH_ID);
    seedMarketplace(COACH_ID);
    expect(listProducts(COACH_ID)).toHaveLength(8);
  });
});

describe("listProducts", () => {
  it("returns products with required fields", () => {
    const products = listProducts(COACH_ID);
    const p = products[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("brand");
    expect(p).toHaveProperty("wholesale");
    expect(p).toHaveProperty("retail");
    expect(p).toHaveProperty("recommended");
  });

  it("retail > wholesale for all products", () => {
    const products = listProducts(COACH_ID);
    expect(products.every((p) => p.retail > p.wholesale)).toBe(true);
  });

  it("has some recommended by default", () => {
    const products = listProducts(COACH_ID);
    const recommended = products.filter((p) => p.recommended);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.length).toBeLessThan(products.length);
  });
});

describe("toggleRecommendation", () => {
  it("toggles recommendation status", () => {
    const products = listProducts(COACH_ID);
    const first = products[0];
    const wasRec = first.recommended;
    expect(toggleRecommendation(COACH_ID, first.id)).toBe(true);
    expect(first.recommended).toBe(!wasRec);
  });

  it("returns false for unknown id", () => {
    listProducts(COACH_ID);
    expect(toggleRecommendation(COACH_ID, "nonexistent")).toBe(false);
  });
});

describe("getMarketplaceStats", () => {
  it("returns correct stats", () => {
    const stats = getMarketplaceStats(COACH_ID);
    expect(stats.totalProducts).toBe(8);
    expect(stats.recommendedCount).toBeGreaterThan(0);
    expect(stats.avgMarkup).toBeGreaterThan(0);
    expect(stats.monthlyRevenue).toBeGreaterThan(0);
  });

  it("stats change after toggling recommendation", () => {
    const statsBefore = getMarketplaceStats(COACH_ID);
    const products = listProducts(COACH_ID);
    const recommended = products.find((p) => p.recommended);
    toggleRecommendation(COACH_ID, recommended!.id);
    const statsAfter = getMarketplaceStats(COACH_ID);
    expect(statsAfter.recommendedCount).toBe(statsBefore.recommendedCount - 1);
  });
});

// ═════════════════════════════════════════════════════════════════
// PROFILE
// ═════════════════════════════════════════════════════════════════

describe("seedCoachProfile", () => {
  it("creates a profile", () => {
    seedCoachProfile(COACH_ID);
    const profile = getCoachProfile(COACH_ID);
    expect(profile).toBeDefined();
    expect(profile.id).toBe(COACH_ID);
  });

  it("is idempotent", () => {
    seedCoachProfile(COACH_ID);
    seedCoachProfile(COACH_ID);
    expect(getCoachProfile(COACH_ID).id).toBe(COACH_ID);
  });
});

describe("getCoachProfile", () => {
  it("auto-seeds and returns required fields", () => {
    const profile = getCoachProfile(COACH_ID);
    expect(profile).toHaveProperty("name");
    expect(profile).toHaveProperty("initials");
    expect(profile).toHaveProperty("credentials");
    expect(profile).toHaveProperty("specializations");
    expect(profile).toHaveProperty("bio");
    expect(profile).toHaveProperty("education");
    expect(profile).toHaveProperty("certifications");
    expect(profile).toHaveProperty("email");
    expect(profile).toHaveProperty("notificationPreferences");
  });

  it("totalClients matches coach-clients roster", () => {
    const profile = getCoachProfile(COACH_ID);
    expect(profile.totalClients).toBeGreaterThan(0);
  });
});

describe("updateCoachProfile", () => {
  it("updates bio", () => {
    getCoachProfile(COACH_ID);
    const updated = updateCoachProfile(COACH_ID, { bio: "New bio text" });
    expect(updated.bio).toBe("New bio text");
    expect(getCoachProfile(COACH_ID).bio).toBe("New bio text");
  });

  it("updates numeric fields", () => {
    getCoachProfile(COACH_ID);
    const updated = updateCoachProfile(COACH_ID, { sessionDuration: 60 });
    expect(updated.sessionDuration).toBe(60);
  });
});

describe("updateNotificationPreferences", () => {
  it("toggles email notifications", () => {
    const profile = getCoachProfile(COACH_ID);
    const wasSms = profile.notificationPreferences.sms;
    const updated = updateNotificationPreferences(COACH_ID, "sms", !wasSms);
    expect(updated.notificationPreferences.sms).toBe(!wasSms);
  });

  it("preserves other preferences when toggling one", () => {
    const profile = getCoachProfile(COACH_ID);
    const origEmail = profile.notificationPreferences.email;
    updateNotificationPreferences(COACH_ID, "sms", true);
    const after = getCoachProfile(COACH_ID);
    expect(after.notificationPreferences.email).toBe(origEmail);
  });
});
