// ─── Admin Revenue Engine ─────────────────────────────────────────
// Deterministic revenue data for the admin revenue dashboard.

import type {
  RevenueKPI,
  RevenueClient,
  CoachPayout,
  TierBreakdownMonth,
  RevenueSourceItem,
  AdminRevenueData,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function currency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── KPIs ─────────────────────────────────────────────────────────

export function getRevenueKPIs(seed = 1): RevenueKPI[] {
  const baseMRR = 1800000 + Math.round(seededRandom(seed) * 200000); // ~$18,000–$20,000
  const arr = baseMRR * 12;
  const arpu = Math.round(baseMRR / 120); // ~120 users
  return [
    { label: "Platform MRR", value: currency(baseMRR), iconKey: "dollar" },
    { label: "Total ARR", value: currency(arr), iconKey: "trending" },
    { label: "Avg Revenue Per User", value: currency(arpu), iconKey: "users" },
    { label: "Coach Payout Rate", value: "70%", iconKey: "percent" },
    { label: "Platform Take Rate", value: "30%", iconKey: "percent" },
  ];
}

// ─── Top Revenue Clients ──────────────────────────────────────────

const CLIENT_NAMES = [
  "Elite Wellness Inc",
  "Peak Performance Co",
  "Holistic Health Hub",
  "Vitality Coaching",
  "Longevity Labs",
  "Wellness Warriors",
  "Health Optimize",
  "Biohacking Brothers",
];

const CLIENT_TIERS = ["Tier 3", "Tier 3", "Tier 2", "Tier 2", "Tier 3", "Tier 2", "Tier 1", "Tier 2"];
const CLIENT_MONTHLY_BASE = [284000, 245000, 168000, 154000, 212000, 129000, 89000, 145000];

export function getTopRevenueClients(seed = 1): RevenueClient[] {
  return CLIENT_NAMES.map((name, i) => {
    const jitter = Math.round(seededRandom(seed + i) * 10000);
    const monthly = CLIENT_MONTHLY_BASE[i] + jitter;
    const months = 8 + Math.round(seededRandom(seed + i + 100) * 16);
    return {
      name,
      tier: CLIENT_TIERS[i],
      monthly: currency(monthly),
      lifetime: currency(monthly * months),
    };
  });
}

// ─── Recent Payouts ───────────────────────────────────────────────

const COACH_NAMES = [
  "Sarah Mitchell",
  "Dr. James Chen",
  "Amanda Foster",
  "Marcus Rodriguez",
  "Elena Volkov",
  "Thomas Park",
];

export function getRecentPayouts(seed = 1): CoachPayout[] {
  const baseDate = new Date(2026, 2, 1); // Mar 1 2026
  return COACH_NAMES.map((coach, i) => {
    const amount = 190000 + Math.round(seededRandom(seed + i + 200) * 240000);
    const daysAgo = Math.floor(i / 2);
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      coach,
      amount: currency(amount),
      date: dateStr,
      status: i < 3 || i === 5 ? "Paid" : "Pending",
    };
  });
}

// ─── Tier Breakdown (6 months) ────────────────────────────────────

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const TIER1_BASE = [1200000, 1400000, 1300000, 1600000, 1500000, 1700000];
const TIER2_BASE = [1800000, 1900000, 2100000, 2300000, 2200000, 2400000];
const TIER3_BASE = [2800000, 3100000, 3500000, 3800000, 4000000, 4200000];

export function getRevenueBreakdown(seed = 1): TierBreakdownMonth[] {
  return MONTHS.map((month, i) => ({
    month,
    tier1: TIER1_BASE[i] + Math.round(seededRandom(seed + i + 300) * 100000),
    tier2: TIER2_BASE[i] + Math.round(seededRandom(seed + i + 400) * 100000),
    tier3: TIER3_BASE[i] + Math.round(seededRandom(seed + i + 500) * 100000),
  }));
}

// ─── Revenue By Source ────────────────────────────────────────────

export function getRevenueSources(seed = 1): RevenueSourceItem[] {
  const baseMRR = 1800000 + Math.round(seededRandom(seed) * 200000);
  return [
    { source: "Coaching Fees", percentage: 60, amount: currency(Math.round(baseMRR * 0.6)) },
    { source: "Supplement Markup", percentage: 25, amount: currency(Math.round(baseMRR * 0.25)) },
    { source: "Lab Orders", percentage: 10, amount: currency(Math.round(baseMRR * 0.1)) },
    { source: "Platform Fee", percentage: 5, amount: currency(Math.round(baseMRR * 0.05)) },
  ];
}

// ─── All-in-one ───────────────────────────────────────────────────

export function getAdminRevenueData(seed = 1): AdminRevenueData {
  return {
    kpis: getRevenueKPIs(seed),
    topClients: getTopRevenueClients(seed),
    recentPayouts: getRecentPayouts(seed),
    breakdown: getRevenueBreakdown(seed),
    sources: getRevenueSources(seed),
  };
}
