import { describe, it, expect, beforeEach } from "vitest";
import {
  getFeatureFlags,
  isFeatureEnabled,
  setFeatureFlag,
  resetFeatureFlags,
  isTierFeatureEnabled,
  TIER_FEATURES,
} from "../env";

describe("Feature Flags", () => {
  beforeEach(() => {
    resetFeatureFlags();
  });

  it("returns all feature flags", () => {
    const flags = getFeatureFlags();
    expect(typeof flags.demoMode).toBe("boolean");
    expect(typeof flags.realtime).toBe("boolean");
    expect(typeof flags.deviceSync).toBe("boolean");
  });

  it("checks individual flags", () => {
    expect(typeof isFeatureEnabled("demoMode")).toBe("boolean");
    expect(typeof isFeatureEnabled("exportData")).toBe("boolean");
  });

  it("sets and resets flags", () => {
    setFeatureFlag("aiInsights", true);
    expect(isFeatureEnabled("aiInsights")).toBe(true);

    resetFeatureFlags();
    expect(isFeatureEnabled("aiInsights")).toBe(false);
  });

  it("returns a copy, not the original", () => {
    const flags1 = getFeatureFlags();
    flags1.demoMode = !flags1.demoMode;
    const flags2 = getFeatureFlags();
    expect(flags2.demoMode).not.toBe(flags1.demoMode);
  });
});

describe("Tier Feature Matrix", () => {
  it("tier1 has all features enabled", () => {
    const tier1 = TIER_FEATURES.tier1;
    expect(tier1.deviceSync).toBe(true);
    expect(tier1.labOrdering).toBe(true);
    expect(tier1.coachMessaging).toBe(true);
    expect(tier1.aiInsights).toBe(true);
  });

  it("tier3 has limited features", () => {
    const tier3 = TIER_FEATURES.tier3;
    expect(tier3.labOrdering).toBe(false);
    expect(tier3.coachMessaging).toBe(false);
    expect(tier3.aiInsights).toBe(false);
    expect(tier3.exportData).toBe(false);
  });

  it("checks tier-specific feature availability", () => {
    // Enable feature globally first
    setFeatureFlag("deviceSync", true);
    expect(isTierFeatureEnabled("tier1", "deviceSync")).toBe(true);
    expect(isTierFeatureEnabled("tier3", "deviceSync")).toBe(true);

    // Lab ordering: only tier1 and tier2
    setFeatureFlag("labOrdering", true);
    expect(isTierFeatureEnabled("tier1", "labOrdering")).toBe(true);
    expect(isTierFeatureEnabled("tier3", "labOrdering")).toBe(false);
  });

  it("respects global flag override", () => {
    // Even if tier supports it, global flag must be on
    setFeatureFlag("deviceSync", false);
    expect(isTierFeatureEnabled("tier1", "deviceSync")).toBe(false);
  });
});
