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
