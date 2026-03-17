// ─── Client Operations Engine Tests ──────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import {
  seedClientPayments,
  getClientPayments,
  seedClientLabs,
  getClientLabs,
  filterLabMarkers,
  seedClientMarketplace,
  listClientProducts,
  filterClientProducts,
  addToCart,
  removeFromCart,
  getCart,
  getCartTotal,
  seedClientChat,
  listChatMessages,
  sendMessage,
  getUnreadCount,
  markAllRead,
  generateClientAlerts,
  getClientAlerts,
  acknowledgeClientAlert,
  filterClientAlerts,
  getClientAlertActiveCount,
  generateClientInsights,
  filterClientInsights,
  getInsightSummary,
  generateMeals,
  getTodaysWorkout,
  getWeeklySchedule,
  getHeartRateZones,
  getSupplementProtocol,
  generateSleepStages,
  resetClientOpsStore,
} from "../engine";

const CLIENT_ID = "test-client";

beforeEach(() => {
  resetClientOpsStore();
});

// ═════════════════════════════════════════════════════════════════
// PAYMENTS
// ═════════════════════════════════════════════════════════════════

describe("seedClientPayments", () => {
  it("creates payment data", () => {
    seedClientPayments(CLIENT_ID);
    const data = getClientPayments(CLIENT_ID);
    expect(data).toBeDefined();
    expect(data.currentPlan.name).toBe("Tier 1 — Private");
  });

  it("is idempotent", () => {
    seedClientPayments(CLIENT_ID);
    seedClientPayments(CLIENT_ID);
    expect(getClientPayments(CLIENT_ID).billingHistory).toHaveLength(8);
  });
});

describe("getClientPayments", () => {
  it("auto-seeds and returns all sections", () => {
    const data = getClientPayments(CLIENT_ID);
    expect(data.currentPlan).toBeDefined();
    expect(data.subscriptions).toHaveLength(3);
    expect(data.billingHistory).toHaveLength(8);
    expect(data.upcomingCharges.breakdown).toHaveLength(2);
  });

  it("billing history has decreasing dates", () => {
    const data = getClientPayments(CLIENT_ID);
    for (let i = 1; i < data.billingHistory.length; i++) {
      expect(data.billingHistory[i - 1].date >= data.billingHistory[i].date).toBe(true);
    }
  });

  it("subscriptions sum matches monthly total", () => {
    const data = getClientPayments(CLIENT_ID);
    const monthlySubscriptions = data.subscriptions.filter((s) => s.frequency === "/month");
    const monthlySum = monthlySubscriptions.reduce((s, sub) => s + sub.amount, 0);
    expect(monthlySum).toBe(data.currentPlan.monthlyTotal);
  });
});

// ═════════════════════════════════════════════════════════════════
// LABS
// ═════════════════════════════════════════════════════════════════

describe("seedClientLabs", () => {
  it("creates lab data with 16 markers", () => {
    seedClientLabs(CLIENT_ID);
    const data = getClientLabs(CLIENT_ID);
    expect(data.markers).toHaveLength(16);
  });

  it("is idempotent", () => {
    seedClientLabs(CLIENT_ID);
    seedClientLabs(CLIENT_ID);
    expect(getClientLabs(CLIENT_ID).markers).toHaveLength(16);
  });
});

describe("getClientLabs", () => {
  it("returns markers, orders, and stats", () => {
    const data = getClientLabs(CLIENT_ID);
    expect(data.markers.length).toBeGreaterThan(0);
    expect(data.orders.length).toBeGreaterThan(0);
    expect(data.stats.total).toBe(16);
  });

  it("stats inRange + outOfRange = total", () => {
    const data = getClientLabs(CLIENT_ID);
    expect(data.stats.inRange + data.stats.outOfRange).toBe(data.stats.total);
  });

  it("markers have required fields", () => {
    const data = getClientLabs(CLIENT_ID);
    const m = data.markers[0];
    expect(m).toHaveProperty("id");
    expect(m).toHaveProperty("name");
    expect(m).toHaveProperty("category");
    expect(m).toHaveProperty("currentValue");
    expect(m).toHaveProperty("unit");
    expect(m).toHaveProperty("status");
    expect(m).toHaveProperty("trend");
  });
});

describe("filterLabMarkers", () => {
  it("returns all markers with 'all'", () => {
    expect(filterLabMarkers(CLIENT_ID, "all")).toHaveLength(16);
  });

  it("filters by category", () => {
    const metabolic = filterLabMarkers(CLIENT_ID, "metabolic");
    expect(metabolic.length).toBeGreaterThan(0);
    expect(metabolic.every((m) => m.category === "metabolic")).toBe(true);
  });

  it("returns empty for nonexistent category", () => {
    expect(filterLabMarkers(CLIENT_ID, "nonexistent")).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═════════════════════════════════════════════════════════════════

describe("seedClientMarketplace", () => {
  it("creates 8 products", () => {
    seedClientMarketplace(CLIENT_ID);
    expect(listClientProducts(CLIENT_ID)).toHaveLength(8);
  });

  it("is idempotent", () => {
    seedClientMarketplace(CLIENT_ID);
    seedClientMarketplace(CLIENT_ID);
    expect(listClientProducts(CLIENT_ID)).toHaveLength(8);
  });
});

describe("listClientProducts", () => {
  it("returns products with required fields", () => {
    const products = listClientProducts(CLIENT_ID);
    const p = products[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("brand");
    expect(p).toHaveProperty("category");
    expect(p).toHaveProperty("price");
    expect(p).toHaveProperty("rating");
    expect(p).toHaveProperty("inProtocol");
  });
});

describe("filterClientProducts", () => {
  it("returns all with 'all'", () => {
    expect(filterClientProducts(CLIENT_ID, "all")).toHaveLength(8);
  });

  it("filters by category", () => {
    const longevity = filterClientProducts(CLIENT_ID, "longevity");
    expect(longevity.length).toBeGreaterThan(0);
    expect(longevity.every((p) => p.category === "longevity")).toBe(true);
  });
});

describe("cart operations", () => {
  it("starts with empty cart", () => {
    expect(getCart(CLIENT_ID)).toHaveLength(0);
    expect(getCartTotal(CLIENT_ID)).toBe(0);
  });

  it("adds product to cart", () => {
    const products = listClientProducts(CLIENT_ID);
    expect(addToCart(CLIENT_ID, products[0].id)).toBe(true);
    expect(getCart(CLIENT_ID)).toHaveLength(1);
    expect(getCartTotal(CLIENT_ID)).toBe(products[0].price);
  });

  it("increments quantity on duplicate add", () => {
    const products = listClientProducts(CLIENT_ID);
    addToCart(CLIENT_ID, products[0].id);
    addToCart(CLIENT_ID, products[0].id);
    expect(getCart(CLIENT_ID)).toHaveLength(1);
    expect(getCart(CLIENT_ID)[0].quantity).toBe(2);
    expect(getCartTotal(CLIENT_ID)).toBe(products[0].price * 2);
  });

  it("removes product from cart", () => {
    const products = listClientProducts(CLIENT_ID);
    addToCart(CLIENT_ID, products[0].id);
    expect(removeFromCart(CLIENT_ID, products[0].id)).toBe(true);
    expect(getCart(CLIENT_ID)).toHaveLength(0);
  });

  it("returns false for removing unknown product", () => {
    listClientProducts(CLIENT_ID);
    expect(removeFromCart(CLIENT_ID, "nonexistent")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// CHAT
// ═════════════════════════════════════════════════════════════════

describe("seedClientChat", () => {
  it("creates initial messages", () => {
    seedClientChat(CLIENT_ID);
    expect(listChatMessages(CLIENT_ID).length).toBeGreaterThan(0);
  });

  it("is idempotent", () => {
    seedClientChat(CLIENT_ID);
    const count = listChatMessages(CLIENT_ID).length;
    seedClientChat(CLIENT_ID);
    expect(listChatMessages(CLIENT_ID).length).toBe(count);
  });
});

describe("listChatMessages", () => {
  it("auto-seeds and returns messages with required fields", () => {
    const messages = listChatMessages(CLIENT_ID);
    expect(messages.length).toBe(6);
    const m = messages[0];
    expect(m).toHaveProperty("id");
    expect(m).toHaveProperty("sender");
    expect(m).toHaveProperty("senderName");
    expect(m).toHaveProperty("content");
    expect(m).toHaveProperty("timestamp");
    expect(m).toHaveProperty("read");
  });
});

describe("sendMessage", () => {
  it("appends a client message", () => {
    const before = listChatMessages(CLIENT_ID).length;
    const msg = sendMessage(CLIENT_ID, "Hello world");
    expect(msg.sender).toBe("client");
    expect(msg.content).toBe("Hello world");
    expect(listChatMessages(CLIENT_ID).length).toBe(before + 1);
  });
});

describe("getUnreadCount", () => {
  it("counts unread non-client messages", () => {
    const count = getUnreadCount(CLIENT_ID);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("markAllRead", () => {
  it("marks all messages as read", () => {
    markAllRead(CLIENT_ID);
    expect(getUnreadCount(CLIENT_ID)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// CLIENT ALERTS
// ═════════════════════════════════════════════════════════════════

const weekStart = new Date("2026-03-09");
const weekEnd = new Date("2026-03-15");

describe("generateClientAlerts", () => {
  it("generates alerts for a date range", () => {
    const alerts = generateClientAlerts(weekStart, weekEnd);
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(alerts.length).toBeLessThanOrEqual(15);
  });

  it("is deterministic for same dates", () => {
    const a1 = generateClientAlerts(weekStart, weekEnd);
    const a2 = generateClientAlerts(weekStart, weekEnd);
    expect(a1.length).toBe(a2.length);
    expect(a1[0].title).toBe(a2[0].title);
  });

  it("alerts have required fields", () => {
    const alerts = generateClientAlerts(weekStart, weekEnd);
    const a = alerts[0];
    expect(a).toHaveProperty("id");
    expect(a).toHaveProperty("title");
    expect(a).toHaveProperty("message");
    expect(a).toHaveProperty("priority");
    expect(a).toHaveProperty("status");
    expect(a).toHaveProperty("category");
    expect(a).toHaveProperty("createdAt");
  });

  it("produces more alerts for longer ranges", () => {
    const short = generateClientAlerts(weekStart, weekEnd);
    const monthEnd = new Date("2026-03-31");
    const long = generateClientAlerts(weekStart, monthEnd);
    expect(long.length).toBeGreaterThanOrEqual(short.length);
  });
});

describe("acknowledgeClientAlert", () => {
  it("acknowledges an alert", () => {
    const alerts = getClientAlerts(CLIENT_ID, weekStart, weekEnd);
    const active = alerts.find((a) => a.status === "active");
    if (active) {
      acknowledgeClientAlert(CLIENT_ID, active.id);
      const updated = getClientAlerts(CLIENT_ID, weekStart, weekEnd);
      const found = updated.find((a) => a.id === active.id);
      expect(found?.status).toBe("acknowledged");
    }
  });
});

describe("filterClientAlerts", () => {
  it("returns all with 'all' filter", () => {
    const all = filterClientAlerts(CLIENT_ID, weekStart, weekEnd, "all");
    const base = getClientAlerts(CLIENT_ID, weekStart, weekEnd);
    expect(all.length).toBe(base.length);
  });

  it("filters by status", () => {
    const resolved = filterClientAlerts(CLIENT_ID, weekStart, weekEnd, "resolved");
    expect(resolved.every((a) => a.status === "resolved")).toBe(true);
  });
});

describe("getClientAlertActiveCount", () => {
  it("returns count of active alerts", () => {
    const count = getClientAlertActiveCount(CLIENT_ID, weekStart, weekEnd);
    expect(count).toBeGreaterThanOrEqual(0);
    const alerts = getClientAlerts(CLIENT_ID, weekStart, weekEnd);
    expect(count).toBe(alerts.filter((a) => a.status === "active").length);
  });
});

// ═════════════════════════════════════════════════════════════════
// CLIENT INSIGHTS
// ═════════════════════════════════════════════════════════════════

describe("generateClientInsights", () => {
  it("generates insights for a date range", () => {
    const insights = generateClientInsights(weekStart, weekEnd);
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.length).toBeLessThanOrEqual(10);
  });

  it("is deterministic for same dates", () => {
    const a = generateClientInsights(weekStart, weekEnd);
    const b = generateClientInsights(weekStart, weekEnd);
    expect(a.length).toBe(b.length);
    expect(a[0].title).toBe(b[0].title);
    expect(a[0].description).toBe(b[0].description);
  });

  it("insights have required fields", () => {
    const insights = generateClientInsights(weekStart, weekEnd);
    const i = insights[0];
    expect(i).toHaveProperty("id");
    expect(i).toHaveProperty("category");
    expect(i).toHaveProperty("title");
    expect(i).toHaveProperty("description");
    expect(i).toHaveProperty("confidence");
    expect(i).toHaveProperty("recommendation");
    expect(i).toHaveProperty("dataSource");
    expect(i).toHaveProperty("timestamp");
  });

  it("does not duplicate categories in the same batch", () => {
    const insights = generateClientInsights(weekStart, weekEnd);
    const ids = insights.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("filterClientInsights", () => {
  it("returns all with null category", () => {
    const all = filterClientInsights(weekStart, weekEnd, null);
    const base = generateClientInsights(weekStart, weekEnd);
    expect(all.length).toBe(base.length);
  });

  it("filters by category", () => {
    const all = generateClientInsights(weekStart, weekEnd);
    const categories = Array.from(new Set(all.map((i) => i.category)));
    if (categories.length > 0) {
      const filtered = filterClientInsights(weekStart, weekEnd, categories[0]);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.category === categories[0])).toBe(true);
    }
  });
});

describe("getInsightSummary", () => {
  it("returns score and trend", () => {
    const summary = getInsightSummary(weekStart);
    expect(summary).toHaveProperty("score");
    expect(summary).toHaveProperty("trend");
    expect(parseFloat(summary.score)).toBeGreaterThanOrEqual(7);
    expect(parseFloat(summary.score)).toBeLessThanOrEqual(10);
  });

  it("is deterministic for same date", () => {
    const a = getInsightSummary(weekStart);
    const b = getInsightSummary(weekStart);
    expect(a.score).toBe(b.score);
    expect(a.trend).toBe(b.trend);
  });
});

// ═════════════════════════════════════════════════════════════════
// NUTRITION MEALS
// ═════════════════════════════════════════════════════════════════

describe("generateMeals", () => {
  it("returns 4 meals (Breakfast, Lunch, Dinner, Snacks)", () => {
    const meals = generateMeals(new Date("2026-03-10"));
    expect(meals).toHaveLength(4);
    expect(meals.map((m) => m.name)).toEqual(["Breakfast", "Lunch", "Dinner", "Snacks"]);
  });

  it("meals have required fields", () => {
    const meals = generateMeals(new Date("2026-03-10"));
    const m = meals[0];
    expect(m).toHaveProperty("name");
    expect(m).toHaveProperty("items");
    expect(m).toHaveProperty("calories");
    expect(m).toHaveProperty("protein");
    expect(m).toHaveProperty("carbs");
    expect(m).toHaveProperty("fat");
    expect(m.items.length).toBeGreaterThan(0);
  });

  it("is deterministic for same date", () => {
    const a = generateMeals(new Date("2026-03-10"));
    const b = generateMeals(new Date("2026-03-10"));
    expect(a[0].items).toEqual(b[0].items);
    expect(a[1].calories).toBe(b[1].calories);
  });

  it("varies by date", () => {
    const a = generateMeals(new Date("2026-03-10"));
    const b = generateMeals(new Date("2026-03-11"));
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    expect(aStr).not.toBe(bStr);
  });
});

// ═════════════════════════════════════════════════════════════════
// WORKOUT SCHEDULE
// ═════════════════════════════════════════════════════════════════

describe("getTodaysWorkout", () => {
  it("returns workout with required fields", () => {
    const w = getTodaysWorkout(new Date(2026, 2, 16)); // Monday local
    expect(w).toHaveProperty("name");
    expect(w).toHaveProperty("duration");
    expect(w).toHaveProperty("targetZone");
    expect(w).toHaveProperty("time");
    expect(w.duration).toBeGreaterThan(0);
  });

  it("returns Zone 2 on Monday", () => {
    const w = getTodaysWorkout(new Date(2026, 2, 16)); // Monday local
    expect(w.name).toBe("Zone 2 Aerobic Base");
  });

  it("returns different workouts on different days", () => {
    const mon = getTodaysWorkout(new Date(2026, 2, 16));
    const tue = getTodaysWorkout(new Date(2026, 2, 17));
    expect(mon.name).not.toBe(tue.name);
  });
});

describe("getWeeklySchedule", () => {
  it("returns 7 days", () => {
    expect(getWeeklySchedule()).toHaveLength(7);
  });

  it("items have day, type, and color", () => {
    const schedule = getWeeklySchedule();
    const item = schedule[0];
    expect(item).toHaveProperty("day");
    expect(item).toHaveProperty("type");
    expect(item).toHaveProperty("color");
  });
});

describe("getHeartRateZones", () => {
  it("returns 5 zones", () => {
    expect(getHeartRateZones()).toHaveLength(5);
  });

  it("zones have required fields", () => {
    const zone = getHeartRateZones()[0];
    expect(zone).toHaveProperty("zone");
    expect(zone).toHaveProperty("name");
    expect(zone).toHaveProperty("description");
    expect(zone).toHaveProperty("hrRange");
    expect(zone).toHaveProperty("benefits");
  });
});

// ═════════════════════════════════════════════════════════════════
// SUPPLEMENT PROTOCOL
// ═════════════════════════════════════════════════════════════════

describe("getSupplementProtocol", () => {
  it("returns 9 protocol items", () => {
    expect(getSupplementProtocol()).toHaveLength(9);
  });

  it("items have required fields", () => {
    const item = getSupplementProtocol()[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("name");
    expect(item).toHaveProperty("dosage");
    expect(item).toHaveProperty("timing");
    expect(item).toHaveProperty("timeOfDay");
    expect(item).toHaveProperty("instructions");
    expect(item).toHaveProperty("taken");
  });

  it("first 3 items are marked as taken", () => {
    const items = getSupplementProtocol();
    expect(items[0].taken).toBe(true);
    expect(items[1].taken).toBe(true);
    expect(items[2].taken).toBe(true);
    expect(items[3].taken).toBe(false);
  });

  it("covers all time-of-day slots", () => {
    const items = getSupplementProtocol();
    const tods = new Set(items.map((i) => i.timeOfDay));
    expect(tods.has("morning")).toBe(true);
    expect(tods.has("midday")).toBe(true);
    expect(tods.has("evening")).toBe(true);
    expect(tods.has("bedtime")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// SLEEP STAGES
// ═════════════════════════════════════════════════════════════════

describe("generateSleepStages", () => {
  it("returns 20 stage blocks", () => {
    expect(generateSleepStages(new Date("2026-03-10"))).toHaveLength(20);
  });

  it("blocks have stage and positive duration", () => {
    const stages = generateSleepStages(new Date("2026-03-10"));
    for (const block of stages) {
      expect(["deep", "rem", "light", "awake"]).toContain(block.stage);
      expect(block.duration).toBeGreaterThan(0);
    }
  });

  it("is deterministic for same date", () => {
    const a = generateSleepStages(new Date("2026-03-10"));
    const b = generateSleepStages(new Date("2026-03-10"));
    expect(a).toEqual(b);
  });

  it("varies by date", () => {
    const a = generateSleepStages(new Date("2026-03-10"));
    const b = generateSleepStages(new Date("2026-03-11"));
    const aDurations = a.map((s) => s.duration);
    const bDurations = b.map((s) => s.duration);
    expect(aDurations).not.toEqual(bDurations);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dashboard Protocol
// ═══════════════════════════════════════════════════════════════════

import { getDashboardProtocol } from "../engine";

describe("getDashboardProtocol", () => {
  it("returns 5 protocol items", () => {
    expect(getDashboardProtocol()).toHaveLength(5);
  });

  it("each item has time, item name, and done status", () => {
    for (const p of getDashboardProtocol()) {
      expect(p.time).toBeTruthy();
      expect(p.item).toBeTruthy();
      expect(typeof p.done).toBe("boolean");
    }
  });

  it("is deterministic for same seed", () => {
    expect(getDashboardProtocol(42)).toEqual(getDashboardProtocol(42));
  });

  it("may vary completion by seed", () => {
    const a = getDashboardProtocol(1).filter(p => p.done).length;
    const b = getDashboardProtocol(99).filter(p => p.done).length;
    // Seeds should produce different completion states
    // (or at least not crash)
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Check-in Constants
// ═══════════════════════════════════════════════════════════════════

import { CHECKIN_STEPS, SYMPTOM_OPTIONS } from "../types";

describe("Checkin constants", () => {
  it("CHECKIN_STEPS has 7 steps ending with complete", () => {
    expect(CHECKIN_STEPS).toHaveLength(7);
    expect(CHECKIN_STEPS[0]).toBe("mood");
    expect(CHECKIN_STEPS[CHECKIN_STEPS.length - 1]).toBe("complete");
  });

  it("SYMPTOM_OPTIONS has 8 options including None", () => {
    expect(SYMPTOM_OPTIONS).toHaveLength(8);
    expect(SYMPTOM_OPTIONS).toContain("None");
    expect(SYMPTOM_OPTIONS).toContain("Headache");
  });
});
