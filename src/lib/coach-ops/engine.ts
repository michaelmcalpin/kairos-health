// ─── Coach Operations Engine ─────────────────────────────────────
// In-memory engines for coach alerts, follow-ups, supplement
// marketplace, and coach profile. All derived from coach-clients
// where applicable, with seeded random for deterministic demo data.

import type {
  CoachAlert,
  AlertPriority,
  AlertStatus,
  CoachAlertStats,
  FollowUp,
  FollowUpPriority,
  FollowUpStats,
  SupplementProduct,
  MarketplaceStats,
  CoachProfileData,
} from "./types";
import { FOLLOWUP_CATEGORIES } from "./types";
import { listCoachClients, seedCoachClients } from "@/lib/coach-clients/engine";

// ─── Seeded Random ───────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function uid(): string {
  return `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Stores ──────────────────────────────────────────────────────

const alertStore = new Map<string, CoachAlert[]>();
const followUpStore = new Map<string, FollowUp[]>();
const productStore = new Map<string, SupplementProduct[]>();
const profileStore = new Map<string, CoachProfileData>();

// ═══════════════════════════════════════════════════════════════════
// ALERTS ENGINE
// ═══════════════════════════════════════════════════════════════════

const ALERT_TEMPLATES: { title: string; message: string; priority: AlertPriority; details?: string }[] = [
  { title: "Critical: Glucose spike — {v} mg/dL", message: "Post-meal glucose exceeded critical threshold of 180 mg/dL.", priority: "critical", details: "Glucose peaked at {v} mg/dL after lunch. This is the third critical spike this week. Consider adjusting meal timing protocol." },
  { title: "Adherence dropping — 3-day trend", message: "Supplement adherence dropped from 85% to {v}% over 3 days.", priority: "high", details: "Client has missed evening supplements for 3 consecutive days. Magnesium and ashwagandha doses are being skipped." },
  { title: "Sleep quality declining", message: "Sleep score dropped below {v} for two consecutive nights.", priority: "high", details: "Deep sleep reduced by 35%. Wake events increased. Late screen time and irregular bedtime reported." },
  { title: "Missed check-in — {v} days", message: "No daily check-in completed since last contact.", priority: "medium" },
  { title: "HRV below baseline", message: "7-day HRV average dropped from 52ms to {v}ms.", priority: "medium", details: "Possible stress or overtraining. Current recovery score is low." },
  { title: "Lab results ready", message: "Metabolic panel results available from Quest Diagnostics.", priority: "low" },
  { title: "Fasting streak — {v} days", message: "Successfully completed consecutive 16:8 fasts.", priority: "info" },
  { title: "Health score improved", message: "Overall health score increased from {v} to {v2} over 2 weeks.", priority: "info" },
];

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function seedCoachAlerts(coachId: string): void {
  if (alertStore.has(coachId)) return;
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);
  const alerts: CoachAlert[] = [];

  const statuses: AlertStatus[] = ["active", "active", "active", "active", "acknowledged", "active", "resolved", "resolved"];
  const timeLabels = ["30 min ago", "2 hours ago", "4 hours ago", "6 hours ago", "1 day ago", "1 day ago", "2 days ago", "3 days ago"];

  for (let i = 0; i < 8; i++) {
    const seed = i * 31 + 100;
    const client = clients[i % clients.length];
    const tmpl = ALERT_TEMPLATES[i];
    const v = seededInt(seed, 40, 192);
    const v2 = seededInt(seed + 1, 85, 95);
    const title = tmpl.title.replace("{v}", v.toString()).replace("{v2}", v2.toString());
    const message = tmpl.message.replace("{v}", v.toString());
    const details = tmpl.details?.replace("{v}", v.toString());

    alerts.push({
      id: uid(),
      clientName: client.name,
      clientInitials: getInitials(client.name),
      title,
      message,
      priority: tmpl.priority,
      status: statuses[i],
      createdAt: timeLabels[i],
      details,
    });
  }

  alertStore.set(coachId, alerts);
}

export function listCoachAlerts(coachId: string): CoachAlert[] {
  seedCoachAlerts(coachId);
  return alertStore.get(coachId) ?? [];
}

export function getCoachAlertStats(coachId: string): CoachAlertStats {
  const alerts = listCoachAlerts(coachId);
  const active = alerts.filter((a) => a.status === "active");
  return {
    total: alerts.length,
    active: active.length,
    critical: active.filter((a) => a.priority === "critical").length,
    high: active.filter((a) => a.priority === "high").length,
    medium: active.filter((a) => a.priority === "medium").length,
    low: active.filter((a) => a.priority === "low").length,
  };
}

export function acknowledgeAlert(coachId: string, alertId: string): boolean {
  const alerts = alertStore.get(coachId);
  if (!alerts) return false;
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert || alert.status !== "active") return false;
  alert.status = "acknowledged";
  return true;
}

export function resolveCoachAlert(coachId: string, alertId: string): boolean {
  const alerts = alertStore.get(coachId);
  if (!alerts) return false;
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return false;
  alert.status = "resolved";
  return true;
}

export function filterCoachAlerts(
  coachId: string,
  filters: { status?: AlertStatus | "all"; client?: string }
): CoachAlert[] {
  let alerts = listCoachAlerts(coachId);
  if (filters.status && filters.status !== "all") {
    alerts = alerts.filter((a) => a.status === filters.status);
  }
  if (filters.client && filters.client !== "all") {
    alerts = alerts.filter((a) => a.clientName === filters.client);
  }
  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// FOLLOW-UPS ENGINE
// ═══════════════════════════════════════════════════════════════════

const FOLLOWUP_DESCRIPTIONS: string[] = [
  "Review latest blood work results and discuss lipid levels",
  "Prescription renewal for cardiovascular support protocol",
  "Monthly check-in call to review progress and adjust nutrition plan",
  "Protocol compliance check - verify supplement adherence",
  "Schedule and conduct biometric assessment",
  "Review genetic testing results and personalized recommendations",
  "Quarterly wellness review and goal setting session",
  "Follow up on insulin sensitivity protocol modifications",
  "Prescription renewal for sleep optimization medication",
  "Lab review - metabolic panel and inflammation markers",
];

export function seedCoachFollowUps(coachId: string): void {
  if (followUpStore.has(coachId)) return;
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);
  const followUps: FollowUp[] = [];

  const priorities: FollowUpPriority[] = ["high", "high", "medium", "medium", "low", "high", "medium", "medium", "low", "high"];
  const today = new Date();

  for (let i = 0; i < 10; i++) {
    const seed = i * 37 + 200;
    const client = clients[i % clients.length];
    const category = FOLLOWUP_CATEGORIES[seededInt(seed, 0, FOLLOWUP_CATEGORIES.length - 1)];

    // Spread due dates around today: some overdue, some today, some upcoming
    const dayOffset = i < 2 ? -(seededInt(seed + 1, 1, 3)) : // overdue
                      i < 4 ? 0 : // due today
                      seededInt(seed + 2, 2, 12); // upcoming
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + dayOffset);

    const createdDate = new Date(dueDate);
    createdDate.setDate(createdDate.getDate() - seededInt(seed + 3, 3, 14));

    followUps.push({
      id: uid(),
      clientName: client.name,
      clientInitials: getInitials(client.name),
      description: FOLLOWUP_DESCRIPTIONS[i],
      dueDate: dueDate.toISOString().split("T")[0],
      priority: priorities[i],
      category,
      completed: i === 6, // One completed
      createdAt: createdDate.toISOString().split("T")[0],
    });
  }

  followUpStore.set(coachId, followUps);
}

export function listCoachFollowUps(coachId: string): FollowUp[] {
  seedCoachFollowUps(coachId);
  return followUpStore.get(coachId) ?? [];
}

export function getFollowUpStats(coachId: string): FollowUpStats {
  const items = listCoachFollowUps(coachId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    total: items.length,
    pending: items.filter((f) => !f.completed && f.dueDate >= todayStr).length,
    overdue: items.filter((f) => !f.completed && f.dueDate < todayStr).length,
    dueToday: items.filter((f) => !f.completed && f.dueDate === todayStr).length,
    completedThisWeek: items.filter((f) => f.completed && f.createdAt >= weekAgo.toISOString().split("T")[0]).length,
  };
}

export function toggleFollowUpComplete(coachId: string, followUpId: string): boolean {
  const items = followUpStore.get(coachId);
  if (!items) return false;
  const item = items.find((f) => f.id === followUpId);
  if (!item) return false;
  item.completed = !item.completed;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE ENGINE
// ═══════════════════════════════════════════════════════════════════

const SUPPLEMENT_CATALOG: { name: string; brand: string; wholesale: number; retail: number }[] = [
  { name: "NMN 500mg", brand: "NAD+ Labs", wholesale: 35, retail: 65 },
  { name: "Omega-3 Ultra", brand: "Pure Marine", wholesale: 22, retail: 45 },
  { name: "Magnesium Threonate", brand: "NeuroMag", wholesale: 28, retail: 52 },
  { name: "Vitamin D3+K2", brand: "Sunlight Labs", wholesale: 18, retail: 38 },
  { name: "CoQ10 Ubiquinol", brand: "Mitochondria Plus", wholesale: 29, retail: 55 },
  { name: "Berberine HCl", brand: "Metabolic Health", wholesale: 20, retail: 42 },
  { name: "Ashwagandha KSM-66", brand: "Stress Adapt", wholesale: 24, retail: 48 },
  { name: "Resveratrol", brand: "Anti-Age Labs", wholesale: 30, retail: 58 },
];

export function seedMarketplace(coachId: string): void {
  if (productStore.has(coachId)) return;
  const defaultRecommended = [0, 1, 3, 6]; // indices that are recommended by default
  const products: SupplementProduct[] = SUPPLEMENT_CATALOG.map((item, i) => ({
    id: `prod_${i + 1}`,
    name: item.name,
    brand: item.brand,
    wholesale: item.wholesale,
    retail: item.retail,
    recommended: defaultRecommended.includes(i),
  }));
  productStore.set(coachId, products);
}

export function listProducts(coachId: string): SupplementProduct[] {
  seedMarketplace(coachId);
  return productStore.get(coachId) ?? [];
}

export function toggleRecommendation(coachId: string, productId: string): boolean {
  const products = productStore.get(coachId);
  if (!products) return false;
  const product = products.find((p) => p.id === productId);
  if (!product) return false;
  product.recommended = !product.recommended;
  return true;
}

export function getMarketplaceStats(coachId: string): MarketplaceStats {
  const products = listProducts(coachId);
  const recommended = products.filter((p) => p.recommended);
  const recommendedCount = recommended.length;

  const avgMarkup = recommendedCount > 0
    ? Math.round((recommended.reduce((s, p) => s + ((p.retail - p.wholesale) / p.wholesale) * 100, 0) / recommendedCount) * 100) / 100
    : 0;

  const monthlyRevenue = Math.round(
    recommended.reduce((s, p) => s + (p.retail - p.wholesale) * 3, 0) // 3 orders/month assumed
  );

  return {
    totalProducts: products.length,
    recommendedCount,
    avgMarkup,
    monthlyRevenue,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE ENGINE
// ═══════════════════════════════════════════════════════════════════

export function seedCoachProfile(coachId: string): void {
  if (profileStore.has(coachId)) return;
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);

  profileStore.set(coachId, {
    id: coachId,
    name: "Dr. Marcus Chen",
    initials: "MC",
    credentials: ["MD", "Board Certified"],
    specializations: ["Longevity Medicine", "Preventive Care", "Metabolic Health"],
    bio: "Dr. Chen is a board-certified physician specializing in longevity medicine with over 15 years of clinical experience. He focuses on evidence-based interventions for healthy aging and optimal wellness.",
    education: [
      "MD from Johns Hopkins University School of Medicine",
      "Residency in Internal Medicine at Mayo Clinic",
      "Fellowship in Preventive Medicine at Stanford University",
    ],
    certifications: [
      "American Board of Internal Medicine",
      "Certified Longevity & Functional Medicine Practitioner",
      "Advanced Health Coach Certification",
    ],
    yearsExperience: 15,
    availableHours: "Monday - Friday, 9AM - 5PM PST",
    sessionDuration: 45,
    maxClientCapacity: 20,
    email: "marcus@kairos.health",
    phone: "+1 (415) 555-0123",
    totalClients: clients.length,
    activeProtocols: clients.length + 4, // slightly more than clients
    avgRating: 4.9,
    yearsOnPlatform: 3,
    notificationPreferences: {
      email: true,
      sms: false,
      inApp: true,
    },
  });
}

export function getCoachProfile(coachId: string): CoachProfileData {
  seedCoachProfile(coachId);
  return profileStore.get(coachId)!;
}

export function updateCoachProfile(coachId: string, updates: Partial<CoachProfileData>): CoachProfileData {
  const profile = getCoachProfile(coachId);
  const updated = { ...profile, ...updates };
  profileStore.set(coachId, updated);
  return updated;
}

export function updateNotificationPreferences(
  coachId: string,
  type: "email" | "sms" | "inApp",
  value: boolean
): CoachProfileData {
  const profile = getCoachProfile(coachId);
  const updated = {
    ...profile,
    notificationPreferences: {
      ...profile.notificationPreferences,
      [type]: value,
    },
  };
  profileStore.set(coachId, updated);
  return updated;
}

// ─── Reset ───────────────────────────────────────────────────────

export function resetCoachOpsStore(): void {
  alertStore.clear();
  followUpStore.clear();
  productStore.clear();
  profileStore.clear();
}
