import { describe, it, expect } from "vitest";
import {
  TIER_PRICES,
  TIER_LABELS,
  estimateMrr,
  estimateFromClients,
  emptyRevenueEstimate,
  estimatedArpu,
  tierPrice,
  isRevenueTier,
} from "../estimate";

describe("TIER_PRICES / TIER_LABELS", () => {
  it("uses the canonical tier prices and labels", () => {
    expect(TIER_PRICES).toEqual({ tier1: 499, tier2: 249, tier3: 99 });
    expect(TIER_LABELS).toEqual({ tier1: "Private", tier2: "Associate", tier3: "AI-Guided" });
  });
});

describe("tierPrice", () => {
  it("returns the list price for known tiers", () => {
    expect(tierPrice("tier1")).toBe(499);
    expect(tierPrice("tier2")).toBe(249);
    expect(tierPrice("tier3")).toBe(99);
  });

  it("returns $0 for missing or unknown tiers (never an average)", () => {
    expect(tierPrice(null)).toBe(0);
    expect(tierPrice(undefined)).toBe(0);
    expect(tierPrice("none")).toBe(0);
    expect(tierPrice("tier4")).toBe(0);
  });

  it("isRevenueTier narrows only the three real tiers", () => {
    expect(isRevenueTier("tier2")).toBe(true);
    expect(isRevenueTier("Tier2")).toBe(false);
    expect(isRevenueTier(null)).toBe(false);
  });
});

describe("estimateMrr", () => {
  it("multiplies each tier count by its price", () => {
    const est = estimateMrr({ tier1: 2, tier2: 3, tier3: 4 });
    expect(est.mrr).toBe(2 * 499 + 3 * 249 + 4 * 99);
    expect(est.arr).toBe(est.mrr * 12);
    expect(est.clientCount).toBe(9);
    expect(est.untieredCount).toBe(0);
    expect(est.estimated).toBe(true);
  });

  it("always returns all three tiers in order, including empty ones", () => {
    const est = estimateMrr({ tier2: 1 });
    expect(est.byTier.map((t) => t.tier)).toEqual(["tier1", "tier2", "tier3"]);
    expect(est.byTier[0]).toEqual({ tier: "tier1", label: "Private", price: 499, clientCount: 0, mrr: 0 });
    expect(est.byTier[1]).toEqual({ tier: "tier2", label: "Associate", price: 249, clientCount: 1, mrr: 249 });
  });

  it("counts untiered clients at $0 but includes them in clientCount", () => {
    const est = estimateMrr({ tier1: 1, none: 3 });
    expect(est.mrr).toBe(499);
    expect(est.clientCount).toBe(4);
    expect(est.untieredCount).toBe(3);
  });

  it("does not add any supplement / lab / fee extras", () => {
    const est = estimateMrr({ tier3: 10 });
    expect(est.mrr).toBe(990);
    expect(est.byTier.reduce((s, t) => s + t.mrr, 0)).toBe(est.mrr);
  });

  it("ignores negative, fractional and non-numeric counts safely", () => {
    const est = estimateMrr({ tier1: -2, tier2: 1.9, tier3: Number.NaN });
    expect(est.mrr).toBe(249);
    expect(est.clientCount).toBe(1);
  });

  it("returns zeros for no clients", () => {
    const est = estimateMrr({});
    expect(est.mrr).toBe(0);
    expect(est.arr).toBe(0);
    expect(est.clientCount).toBe(0);
    expect(emptyRevenueEstimate()).toEqual(est);
  });
});

describe("estimateFromClients", () => {
  it("matches estimateMrr for the same tier mix", () => {
    const clients = [{ tier: "tier1" }, { tier: "tier1" }, { tier: "tier2" }, { tier: "tier3" }];
    expect(estimateFromClients(clients)).toEqual(estimateMrr({ tier1: 2, tier2: 1, tier3: 1 }));
  });

  it("counts clients with no tier at $0", () => {
    const est = estimateFromClients([{ tier: null }, { tier: undefined }, {}, { tier: "tier2" }]);
    expect(est.mrr).toBe(249);
    expect(est.clientCount).toBe(4);
    expect(est.untieredCount).toBe(3);
  });

  it("differs from the old clientCount × $249 shortcut when the mix is uneven", () => {
    const clients = [{ tier: "tier1" }, { tier: "tier3" }, { tier: "tier3" }];
    expect(estimateFromClients(clients).mrr).toBe(499 + 99 + 99);
    expect(estimateFromClients(clients).mrr).not.toBe(clients.length * 249);
  });
});

describe("estimatedArpu", () => {
  it("is mrr / active clients, rounded, in whole dollars", () => {
    expect(estimatedArpu(estimateMrr({ tier1: 1, tier3: 2 }))).toBe(Math.round((499 + 198) / 3));
  });

  it("is 0 with no clients", () => {
    expect(estimatedArpu(emptyRevenueEstimate())).toBe(0);
  });
});
