// ─── Client Operations Engine ─────────────────────────────────────
// In-memory engines for client payments, labs, marketplace, chat,
// alerts, and insights.

import type {
  ClientPaymentData,
  BillingStatus,
  ClientLabData,
  LabMarker,
  LabOrder,
  LabStats,
  ClientProduct,
  CartItem,
  ChatMessage,
  MessageSender,
  ClientAlert,
  ClientAlertPriority,
  ClientAlertStatus,
  ClientInsight,
  InsightCategory,
  InsightSummary,
  MealEntry,
  TodaysWorkout,
  WeeklyScheduleItem,
  HeartRateZone,
  ProtocolItem,
  TimeOfDay,
  SleepStageBlock,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function uid(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}


// ─── Stores ───────────────────────────────────────────────────────

const paymentStore = new Map<string, ClientPaymentData>();
const labStore = new Map<string, ClientLabData>();
const productStore = new Map<string, ClientProduct[]>();
const cartStore = new Map<string, CartItem[]>();
const chatStore = new Map<string, ChatMessage[]>();

// ═══════════════════════════════════════════════════════════════════
// PAYMENTS ENGINE
// ═══════════════════════════════════════════════════════════════════

export function seedClientPayments(clientId: string): void {
  if (paymentStore.has(clientId)) return;

  const billingHistory: ClientPaymentData["billingHistory"] = [];
  const baseDate = new Date();
  const descriptions = [
    "Coaching Package + Supplement Protocol + Lab Panel",
    "Monthly Subscriptions",
    "Monthly Subscriptions",
    "Monthly Subscriptions + Lab Panel",
    "Monthly Subscriptions",
    "Monthly Subscriptions",
    "Monthly Subscriptions + Lab Panel",
    "Monthly Subscriptions",
  ];
  const amounts = [775, 686, 686, 775, 686, 686, 775, 686];
  const statuses: BillingStatus[] = ["Paid", "Paid", "Paid", "Paid", "Paid", "Paid", "Pending", "Failed"];

  for (let i = 0; i < 8; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() - i);
    date.setDate(8);
    billingHistory.push({
      id: `bill_${i + 1}`,
      date: date.toISOString().split("T")[0],
      description: descriptions[i],
      amount: amounts[i],
      status: statuses[i],
    });
  }

  const nextBilling = new Date(baseDate);
  nextBilling.setMonth(nextBilling.getMonth() + 1);
  nextBilling.setDate(8);

  paymentStore.set(clientId, {
    currentPlan: {
      name: "Tier 1 — Private",
      monthlyTotal: 686,
      nextBillingDate: nextBilling.toISOString().split("T")[0],
      paymentMethod: "Visa •••• 4242",
      status: "Active",
    },
    subscriptions: [
      { id: "sub_1", name: "Coaching Package", amount: 499, frequency: "/month", status: "Active" },
      { id: "sub_2", name: "Supplement Protocol", amount: 187, frequency: "/month", status: "Active" },
      { id: "sub_3", name: "Lab Panel Package", amount: 89, frequency: "/quarter", status: "Active" },
    ],
    billingHistory,
    upcomingCharges: {
      estimatedTotal: 686,
      breakdown: [
        { name: "Coaching Package", amount: 499 },
        { name: "Supplement Protocol", amount: 187 },
      ],
    },
  });
}

export function getClientPayments(clientId: string): ClientPaymentData {
  seedClientPayments(clientId);
  return paymentStore.get(clientId)!;
}

// ═══════════════════════════════════════════════════════════════════
// LABS ENGINE
// ═══════════════════════════════════════════════════════════════════

const LAB_MARKER_DATA: Omit<LabMarker, "id">[] = [
  { name: "Fasting Glucose", category: "metabolic", currentValue: 92, unit: "mg/dL", referenceRange: "70-100", optimalRange: "70-85", status: "normal", trend: "flat", previousValue: 94, lastDrawDate: "2026-01-15" },
  { name: "HbA1c", category: "metabolic", currentValue: 5.6, unit: "%", referenceRange: "<5.7", optimalRange: "<5.4", status: "normal", trend: "down", previousValue: 5.8, lastDrawDate: "2026-01-15" },
  { name: "Total Cholesterol", category: "lipids", currentValue: 185, unit: "mg/dL", referenceRange: "<200", optimalRange: "<180", status: "normal", trend: "down", previousValue: 198, lastDrawDate: "2026-01-15" },
  { name: "LDL Cholesterol", category: "lipids", currentValue: 115, unit: "mg/dL", referenceRange: "<100", optimalRange: "<70", status: "borderline", trend: "up", previousValue: 112, lastDrawDate: "2026-01-15" },
  { name: "HDL Cholesterol", category: "lipids", currentValue: 52, unit: "mg/dL", referenceRange: ">40", optimalRange: ">60", status: "normal", trend: "flat", previousValue: 51, lastDrawDate: "2026-01-15" },
  { name: "Triglycerides", category: "lipids", currentValue: 98, unit: "mg/dL", referenceRange: "<150", optimalRange: "<100", status: "optimal", trend: "down", previousValue: 115, lastDrawDate: "2026-01-15" },
  { name: "Testosterone (Free)", category: "hormones", currentValue: 18.5, unit: "pg/mL", referenceRange: "8.7-25.1", optimalRange: "15-25", status: "optimal", trend: "up", previousValue: 16.2, lastDrawDate: "2026-01-15" },
  { name: "DHEA-S", category: "hormones", currentValue: 280, unit: "µg/dL", referenceRange: "59-452", optimalRange: "250-400", status: "optimal", trend: "flat", previousValue: 282, lastDrawDate: "2026-01-15" },
  { name: "TSH", category: "hormones", currentValue: 1.8, unit: "mIU/L", referenceRange: "0.4-4.0", optimalRange: "1.0-2.5", status: "optimal", trend: "flat", previousValue: 1.9, lastDrawDate: "2026-01-15" },
  { name: "Free T3", category: "hormones", currentValue: 3.2, unit: "pg/mL", referenceRange: "2.3-4.2", optimalRange: "3.0-4.0", status: "optimal", trend: "up", previousValue: 3.0, lastDrawDate: "2026-01-15" },
  { name: "CRP (hs)", category: "inflammation", currentValue: 0.8, unit: "mg/L", referenceRange: "<3.0", optimalRange: "<1.0", status: "normal", trend: "down", previousValue: 1.2, lastDrawDate: "2026-01-15" },
  { name: "Homocysteine", category: "inflammation", currentValue: 9.2, unit: "µmol/L", referenceRange: "<15", optimalRange: "<10", status: "normal", trend: "down", previousValue: 10.1, lastDrawDate: "2026-01-15" },
  { name: "Vitamin D (25-OH)", category: "vitamins", currentValue: 38, unit: "ng/mL", referenceRange: ">30", optimalRange: "40-60", status: "borderline", trend: "up", previousValue: 35, lastDrawDate: "2026-01-15" },
  { name: "Vitamin B12", category: "vitamins", currentValue: 625, unit: "pg/mL", referenceRange: ">200", optimalRange: ">500", status: "optimal", trend: "flat", previousValue: 628, lastDrawDate: "2026-01-15" },
  { name: "Ferritin", category: "vitamins", currentValue: 92, unit: "ng/mL", referenceRange: "30-400", optimalRange: "50-150", status: "optimal", trend: "down", previousValue: 108, lastDrawDate: "2026-01-15" },
  { name: "Fasting Insulin", category: "metabolic", currentValue: 8.2, unit: "mIU/L", referenceRange: "<12", optimalRange: "<5", status: "normal", trend: "down", previousValue: 9.5, lastDrawDate: "2026-01-15" },
];

const LAB_ORDER_DATA: Omit<LabOrder, "id">[] = [
  { date: "2026-03-01", labName: "Quest Diagnostics", panelType: "Annual Comprehensive Metabolic Panel", status: "results-ready" },
  { date: "2026-02-15", labName: "Quest Diagnostics", panelType: "Lipid Panel + Advanced Markers", status: "results-ready" },
  { date: "2026-04-01", labName: "Quest Diagnostics", panelType: "Hormone + Thyroid Panel", status: "scheduled" },
];

function computeLabStats(markers: LabMarker[]): LabStats {
  return {
    total: markers.length,
    inRange: markers.filter((m) => m.status !== "out-of-range").length,
    outOfRange: markers.filter((m) => m.status === "out-of-range").length,
    improved: markers.filter(
      (m) => (m.trend === "down" && m.status !== "optimal") || (m.trend === "up" && m.status === "optimal")
    ).length,
  };
}

export function seedClientLabs(clientId: string): void {
  if (labStore.has(clientId)) return;

  const markers: LabMarker[] = LAB_MARKER_DATA.map((m, i) => ({
    id: `marker_${i + 1}`,
    ...m,
  }));

  const orders: LabOrder[] = LAB_ORDER_DATA.map((o, i) => ({
    id: `order_${i + 1}`,
    ...o,
  }));

  labStore.set(clientId, {
    markers,
    orders,
    stats: computeLabStats(markers),
  });
}

export function getClientLabs(clientId: string): ClientLabData {
  seedClientLabs(clientId);
  return labStore.get(clientId)!;
}

export function filterLabMarkers(clientId: string, category: string): LabMarker[] {
  const data = getClientLabs(clientId);
  if (category === "all") return data.markers;
  return data.markers.filter((m) => m.category === category);
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT MARKETPLACE ENGINE
// ═══════════════════════════════════════════════════════════════════

const PRODUCT_CATALOG: Omit<ClientProduct, "id">[] = [
  { name: "NMN 500mg", brand: "NAD+ Labs", category: "longevity", price: 65, description: "Nicotinamide mononucleotide for cellular energy", rating: 4.8, inProtocol: true },
  { name: "Omega-3 Ultra", brand: "Pure Marine", category: "metabolic", price: 45, description: "High-potency fish oil with EPA/DHA", rating: 4.7, inProtocol: true },
  { name: "Magnesium Threonate", brand: "NeuroMag", category: "cognitive", price: 52, description: "Brain-bioavailable magnesium for sleep and cognition", rating: 4.9, inProtocol: true },
  { name: "Vitamin D3+K2", brand: "Sunlight Labs", category: "immune", price: 38, description: "Synergistic vitamin D and K2 for bone and immune health", rating: 4.6, inProtocol: true },
  { name: "CoQ10 Ubiquinol", brand: "Mitochondria Plus", category: "longevity", price: 55, description: "Active form of CoQ10 for mitochondrial support", rating: 4.7, inProtocol: false },
  { name: "Berberine HCl", brand: "Metabolic Health", category: "metabolic", price: 42, description: "Plant alkaloid for glucose and lipid metabolism", rating: 4.5, inProtocol: false },
  { name: "Ashwagandha KSM-66", brand: "Stress Adapt", category: "cognitive", price: 48, description: "Adaptogenic herb for stress resilience", rating: 4.8, inProtocol: false },
  { name: "Resveratrol", brand: "Anti-Age Labs", category: "longevity", price: 58, description: "Polyphenol activating longevity pathways", rating: 4.4, inProtocol: false },
];

export function seedClientMarketplace(clientId: string): void {
  if (productStore.has(clientId)) return;
  const products: ClientProduct[] = PRODUCT_CATALOG.map((p, i) => ({
    id: `cprod_${i + 1}`,
    ...p,
  }));
  productStore.set(clientId, products);
  cartStore.set(clientId, []);
}

export function listClientProducts(clientId: string): ClientProduct[] {
  seedClientMarketplace(clientId);
  return productStore.get(clientId) ?? [];
}

export function filterClientProducts(clientId: string, category: string): ClientProduct[] {
  const products = listClientProducts(clientId);
  if (category === "all") return products;
  return products.filter((p) => p.category === category);
}

export function getCart(clientId: string): CartItem[] {
  seedClientMarketplace(clientId);
  return cartStore.get(clientId) ?? [];
}

export function addToCart(clientId: string, productId: string): boolean {
  seedClientMarketplace(clientId);
  const cart = cartStore.get(clientId)!;
  const products = productStore.get(clientId)!;
  if (!products.find((p) => p.id === productId)) return false;
  const existing = cart.find((c) => c.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  return true;
}

export function removeFromCart(clientId: string, productId: string): boolean {
  seedClientMarketplace(clientId);
  const cart = cartStore.get(clientId)!;
  const idx = cart.findIndex((c) => c.productId === productId);
  if (idx === -1) return false;
  cart.splice(idx, 1);
  return true;
}

export function getCartTotal(clientId: string): number {
  const cart = getCart(clientId);
  const products = listClientProducts(clientId);
  return cart.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT ENGINE
// ═══════════════════════════════════════════════════════════════════

export function seedClientChat(clientId: string): void {
  if (chatStore.has(clientId)) return;

  const now = new Date();
  const messages: ChatMessage[] = [
    {
      id: uid(),
      sender: "system" as MessageSender,
      senderName: "KAIROS",
      content: "Welcome to your secure messaging portal. Messages are reviewed by your coaching team within 24 hours.",
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: uid(),
      sender: "coach" as MessageSender,
      senderName: "Dr. Marcus Chen",
      content: "Hi Michael! I've reviewed your latest biometrics. Your glucose levels are looking great — the fasting protocol adjustments seem to be working well. Let's discuss your sleep optimization plan at our next session.",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: uid(),
      sender: "client" as MessageSender,
      senderName: "You",
      content: "Thanks Dr. Chen! I've been noticing better energy levels in the mornings. Quick question — should I adjust my magnesium timing? Currently taking it with dinner.",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      read: true,
    },
    {
      id: uid(),
      sender: "coach" as MessageSender,
      senderName: "Dr. Marcus Chen",
      content: "Great question. I'd recommend moving magnesium to 30 minutes before bed instead — magnesium threonate works best when taken closer to sleep time. It supports both deep sleep and morning cognitive function.",
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: uid(),
      sender: "client" as MessageSender,
      senderName: "You",
      content: "Will do! Also, my latest lab results came back — should I be concerned about the LDL trending up slightly?",
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: uid(),
      sender: "coach" as MessageSender,
      senderName: "Dr. Marcus Chen",
      content: "I saw those results. The slight LDL increase is within acceptable bounds and could be related to dietary changes. Let's add an ApoB test to your next panel for a more detailed picture. Your HDL/triglyceride ratio is excellent which is a strong positive indicator.",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
  ];

  chatStore.set(clientId, messages);
}

export function listChatMessages(clientId: string): ChatMessage[] {
  seedClientChat(clientId);
  return chatStore.get(clientId) ?? [];
}

export function sendMessage(clientId: string, content: string): ChatMessage {
  seedClientChat(clientId);
  const messages = chatStore.get(clientId)!;
  const msg: ChatMessage = {
    id: uid(),
    sender: "client",
    senderName: "You",
    content,
    timestamp: new Date().toISOString(),
    read: true,
  };
  messages.push(msg);
  return msg;
}

export function getUnreadCount(clientId: string): number {
  const messages = listChatMessages(clientId);
  return messages.filter((m) => !m.read && m.sender !== "client").length;
}

export function markAllRead(clientId: string): void {
  const messages = listChatMessages(clientId);
  for (const msg of messages) {
    msg.read = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT ALERTS ENGINE (date-range based, deterministic)
// ═══════════════════════════════════════════════════════════════════

const ALERT_TEMPLATES: { title: string; message: string; priority: ClientAlertPriority; category: string; details?: string }[] = [
  { title: "Glucose spike detected — {v} mg/dL", message: "Post-dinner glucose exceeded 160 mg/dL threshold.", priority: "high", category: "glucose", details: "Your glucose peaked above your personalized threshold of 160 mg/dL. Consider reducing carbohydrate intake at dinner or adding a post-meal walk." },
  { title: "Sleep quality declining — {n}-night trend", message: "Average sleep score dropped over the last few nights.", priority: "medium", category: "sleep", details: "Deep sleep has decreased and wake events increased. Possible contributing factors: later bedtime and screen time before bed." },
  { title: "Weekly check-in due", message: "Your weekly symptom assessment is due.", priority: "low", category: "checkin" },
  { title: "Lab results available", message: "Your metabolic panel results are ready for review.", priority: "medium", category: "labs" },
  { title: "HRV trending upward", message: "Your 7-day HRV average improved. Great progress!", priority: "info", category: "hrv" },
  { title: "Missed morning supplements", message: "No adherence logged for AM protocol items.", priority: "medium", category: "adherence" },
  { title: "Fasting window completed", message: "Fast completed successfully. Ketone levels estimated optimal.", priority: "info", category: "fasting" },
  { title: "Elevated resting heart rate", message: "Resting HR is 8 bpm above your 30-day average.", priority: "high", category: "heart" },
  { title: "Supplement protocol updated", message: "Your coach has updated your evening supplement protocol.", priority: "low", category: "protocol" },
  { title: "Low hydration detected", message: "Water intake is below target for the day.", priority: "medium", category: "hydration" },
];

// Store for acknowledged alerts (keyed by clientId, stores acknowledged alert ids)
const acknowledgedAlertStore = new Map<string, Set<string>>();

export function generateClientAlerts(startDate: Date, endDate: Date): ClientAlert[] {
  const alerts: ClientAlert[] = [];
  const dayMs = 86400000;
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / dayMs));
  const baseSeed = startDate.getTime() / dayMs;
  const count = Math.min(15, Math.max(3, Math.round(days * 1.5)));
  const statuses: ClientAlertStatus[] = ["active", "acknowledged", "resolved"];

  for (let i = 0; i < count; i++) {
    const tplIdx = Math.floor(seededRandom(baseSeed + i * 7) * ALERT_TEMPLATES.length);
    const tpl = ALERT_TEMPLATES[tplIdx];
    const statusIdx = Math.floor(seededRandom(baseSeed + i * 13) * 3);
    const daysAgo = Math.floor(seededRandom(baseSeed + i * 17) * days);
    const hoursAgo = Math.floor(seededRandom(baseSeed + i * 19) * 24);
    const totalHoursAgo = daysAgo * 24 + hoursAgo;

    let createdAt: string;
    if (totalHoursAgo < 1) createdAt = "just now";
    else if (totalHoursAgo < 24) createdAt = `${totalHoursAgo}h ago`;
    else createdAt = `${daysAgo}d ago`;

    const glucoseVal = Math.round(155 + seededRandom(baseSeed + i * 23) * 30);
    const nightTrend = Math.round(2 + seededRandom(baseSeed + i * 29) * 4);

    alerts.push({
      id: `alert-${i}`,
      title: tpl.title.replace("{v}", String(glucoseVal)).replace("{n}", String(nightTrend)),
      message: tpl.message,
      priority: tpl.priority,
      status: statuses[statusIdx],
      category: tpl.category,
      createdAt,
      details: tpl.details,
    });
  }
  return alerts;
}

export function getClientAlerts(clientId: string, startDate: Date, endDate: Date): ClientAlert[] {
  const base = generateClientAlerts(startDate, endDate);
  const acked = acknowledgedAlertStore.get(clientId);
  if (!acked) return base;
  return base.map((a) => acked.has(a.id) ? { ...a, status: "acknowledged" as ClientAlertStatus } : a);
}

export function acknowledgeClientAlert(clientId: string, alertId: string): void {
  if (!acknowledgedAlertStore.has(clientId)) {
    acknowledgedAlertStore.set(clientId, new Set());
  }
  acknowledgedAlertStore.get(clientId)!.add(alertId);
}

export function filterClientAlerts(clientId: string, startDate: Date, endDate: Date, status: "all" | ClientAlertStatus): ClientAlert[] {
  const alerts = getClientAlerts(clientId, startDate, endDate);
  if (status === "all") return alerts;
  return alerts.filter((a) => a.status === status);
}

export function getClientAlertActiveCount(clientId: string, startDate: Date, endDate: Date): number {
  return getClientAlerts(clientId, startDate, endDate).filter((a) => a.status === "active").length;
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT INSIGHTS ENGINE (date-range based, deterministic)
// ═══════════════════════════════════════════════════════════════════

const INSIGHT_TEMPLATES: { category: InsightCategory; title: string; description: string; confidence: "high" | "medium"; recommendation: string; dataSource: string }[] = [
  { category: "Metabolic", title: "Glucose Stability Improvement", description: "Your post-meal glucose spikes have decreased by {pct}% this period compared to the previous period.", confidence: "high", recommendation: "Continue your current meal timing and protein intake patterns—they are working well for metabolic stability.", dataSource: "Based on {n} glucose measurements" },
  { category: "Sleep", title: "Sleep Quality & Recovery Link", description: "Your sleep quality improves {pct}% on days you complete evening magnesium supplementation.", confidence: "high", recommendation: "Maintain consistent evening magnesium intake around 8 PM for optimal sleep architecture.", dataSource: "Based on {n} sleep records" },
  { category: "Exercise", title: "Post-Dinner Walk Effect", description: "Post-dinner walks reduce your glucose spikes by an average of {v} mg/dL compared to resting.", confidence: "high", recommendation: "Incorporate a 10-15 minute walk within 30 minutes after dinner on most days.", dataSource: "Based on {n} glucose-activity correlations" },
  { category: "Recovery", title: "HRV Trend Rising", description: "Your Heart Rate Variability shows an upward trend, indicating improved parasympathetic tone and recovery capacity.", confidence: "medium", recommendation: "Your recovery metrics are trending positively. Consider adding one additional rest day to further optimize.", dataSource: "Based on {n} days of HRV data" },
  { category: "Nutrition", title: "Fiber Intake Optimization", description: "You are meeting {pct}% of your daily fiber targets. This correlates with stable energy levels throughout the day.", confidence: "high", recommendation: "Aim for consistent daily fiber intake of 30-35g. Add one serving of vegetables or whole grains to one meal.", dataSource: "Based on {n} days of nutrition logs" },
  { category: "Stress", title: "Cortisol Patterns Emerging", description: "Morning cortisol levels are highest on days with high stress scores. Consider morning meditation or movement.", confidence: "medium", recommendation: "Try 10 minutes of breathwork or light stretching within 30 minutes of waking on high-stress days.", dataSource: "Based on stress logs and biomarker data" },
  { category: "Supplementation", title: "Supplement Compliance Strong", description: "Your supplement adherence is {pct}% this period. Consistent intake is supporting your health goals.", confidence: "high", recommendation: "Maintain your current supplement schedule. Consider setting a calendar reminder for your evening protocol.", dataSource: "Based on supplement logs" },
  { category: "Sleep", title: "Sleep Duration Consistency", description: "Consistent sleep schedule correlates with {pct}% better next-day cognitive performance.", confidence: "high", recommendation: "Maintain your current sleep and wake times within 30 minutes even on weekends for optimal circadian alignment.", dataSource: "Based on {n} nights of sleep data" },
  { category: "Metabolic", title: "Fasting Window Optimization", description: "Your metabolic markers improve by {pct}% when fasting windows exceed 14 hours.", confidence: "high", recommendation: "Extend your fasting window to 14-16 hours on most days for optimal metabolic benefits.", dataSource: "Based on {n} fasting sessions" },
  { category: "Exercise", title: "Zone 2 Training Progress", description: "Your aerobic base is improving. VO2 max estimate has increased by {pct}% over this period.", confidence: "medium", recommendation: "Continue Zone 2 cardio sessions 3-4 times per week for sustained aerobic development.", dataSource: "Based on {n} workout sessions" },
];

export function generateClientInsights(startDate: Date, endDate: Date): ClientInsight[] {
  const baseSeed = startDate.getTime() / 86400000;
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const count = Math.min(INSIGHT_TEMPLATES.length, Math.max(4, Math.round(days / 2)));
  const insights: ClientInsight[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(seededRandom(baseSeed + i * 11) * INSIGHT_TEMPLATES.length);
    while (used.has(idx)) idx = (idx + 1) % INSIGHT_TEMPLATES.length;
    used.add(idx);

    const tpl = INSIGHT_TEMPLATES[idx];
    const pct = Math.round(10 + seededRandom(baseSeed + i * 13) * 30);
    const n = Math.round(7 + seededRandom(baseSeed + i * 17) * days * 3);
    const v = Math.round(20 + seededRandom(baseSeed + i * 19) * 25);
    const hoursAgo = Math.round(seededRandom(baseSeed + i * 23) * days * 24);
    const timestamp = hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`;

    insights.push({
      id: `insight-${i}`,
      category: tpl.category,
      title: tpl.title,
      description: tpl.description.replace("{pct}", String(pct)).replace("{v}", String(v)),
      confidence: tpl.confidence,
      recommendation: tpl.recommendation,
      dataSource: tpl.dataSource.replace("{n}", String(n)),
      timestamp,
    });
  }
  return insights;
}

export function filterClientInsights(startDate: Date, endDate: Date, category: InsightCategory | null): ClientInsight[] {
  const insights = generateClientInsights(startDate, endDate);
  if (!category) return insights;
  return insights.filter((i) => i.category === category);
}

export function getInsightSummary(startDate: Date): InsightSummary {
  const baseSeed = startDate.getTime() / 86400000;
  return {
    score: (7 + seededRandom(baseSeed + 99) * 2.5).toFixed(1),
    trend: (seededRandom(baseSeed + 100) * 1.5 - 0.3).toFixed(1),
  };
}

// ═══════════════════════════════════════════════════════════════════
// NUTRITION MEALS ENGINE (date-based, deterministic)
// ═══════════════════════════════════════════════════════════════════

const MEAL_TEMPLATES: { name: string; items: string[][]; cals: number[]; protein: number[]; carbs: number[]; fat: number[] }[] = [
  { name: "Breakfast", items: [["Greek yogurt with berries", "Handful of almonds", "Green tea"], ["Omelette with spinach & feta", "Avocado toast", "Black coffee"], ["Overnight oats with chia seeds", "Mixed berries", "Matcha latte"], ["Smoked salmon on rye", "Cream cheese & capers", "Herbal tea"]], cals: [420, 480, 390, 510], protein: [28, 34, 18, 32], carbs: [32, 28, 48, 22], fat: [18, 26, 14, 28] },
  { name: "Lunch", items: [["Grilled salmon", "Roasted broccoli", "Sweet potato"], ["Chicken Caesar salad", "Parmesan crisps", "Sparkling water"], ["Mediterranean bowl with hummus", "Grilled chicken", "Tabbouleh"], ["Grass-fed burger (no bun)", "Mixed greens", "Sweet potato fries"]], cals: [580, 520, 560, 610], protein: [46, 42, 38, 48], carbs: [38, 18, 42, 32], fat: [22, 28, 24, 30] },
  { name: "Dinner", items: [["Grass-fed beef steak", "Mixed green salad with olive oil", "Asparagus"], ["Baked cod with lemon", "Quinoa pilaf", "Steamed green beans"], ["Lamb chops with rosemary", "Roasted root vegetables", "Kale salad"], ["Pan-seared duck breast", "Wild rice", "Sautéed mushrooms"]], cals: [520, 480, 560, 540], protein: [52, 44, 48, 46], carbs: [16, 34, 22, 28], fat: [28, 18, 32, 24] },
  { name: "Snacks", items: [["Macadamia nuts", "Grass-fed beef jerky"], ["Apple slices with almond butter"], ["Dark chocolate (85%)", "Walnuts"], ["Cottage cheese with pumpkin seeds"]], cals: [160, 210, 180, 200], protein: [16, 8, 6, 22], carbs: [6, 22, 12, 8], fat: [9, 14, 14, 10] },
];

export function generateMeals(dateRef: Date): MealEntry[] {
  const seed = dateRef.getFullYear() * 10000 + (dateRef.getMonth() + 1) * 100 + dateRef.getDate();
  return MEAL_TEMPLATES.map((tpl, mi) => {
    const variantIdx = Math.floor(seededRandom(seed + mi * 7) * tpl.items.length);
    return {
      name: tpl.name,
      items: tpl.items[variantIdx],
      calories: tpl.cals[variantIdx],
      protein: tpl.protein[variantIdx],
      carbs: tpl.carbs[variantIdx],
      fat: tpl.fat[variantIdx],
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// WORKOUT SCHEDULE ENGINE
// ═══════════════════════════════════════════════════════════════════

const WORKOUT_TYPES: { name: string; duration: number; zone: string; time: string }[] = [
  { name: "Zone 2 Aerobic Base", duration: 45, zone: "Zone 2 (120-140 bpm)", time: "6:00 AM - 6:45 AM" },
  { name: "Upper Body Strength", duration: 55, zone: "Zone 3 (140-155 bpm)", time: "6:00 AM - 6:55 AM" },
  { name: "Rest & Recovery", duration: 20, zone: "Zone 1 (<120 bpm)", time: "7:00 AM - 7:20 AM" },
  { name: "HIIT Intervals", duration: 30, zone: "Zone 4-5 (155-180 bpm)", time: "6:00 AM - 6:30 AM" },
  { name: "Zone 2 Cardio", duration: 45, zone: "Zone 2 (120-140 bpm)", time: "6:00 AM - 6:45 AM" },
  { name: "Yoga & Mobility", duration: 40, zone: "Zone 1 (<120 bpm)", time: "7:00 AM - 7:40 AM" },
  { name: "Lower Body Strength", duration: 55, zone: "Zone 3 (140-155 bpm)", time: "6:00 AM - 6:55 AM" },
];

const WEEKLY_SCHEDULE_DATA: WeeklyScheduleItem[] = [
  { day: "Mon", type: "Zone 2 Cardio", color: "bg-blue-900/40" },
  { day: "Tue", type: "Strength Training", color: "bg-orange-900/40" },
  { day: "Wed", type: "Rest", color: "bg-gray-900/40" },
  { day: "Thu", type: "HIIT", color: "bg-red-900/40" },
  { day: "Fri", type: "Zone 2 Cardio", color: "bg-blue-900/40" },
  { day: "Sat", type: "Yoga/Mobility", color: "bg-purple-900/40" },
  { day: "Sun", type: "Strength Training", color: "bg-orange-900/40" },
];

const HR_ZONES: HeartRateZone[] = [
  { zone: "Zone 1", name: "Recovery", description: "Light activity, active recovery", hrRange: "50-70% max HR", benefits: "Promotes blood flow and adaptation" },
  { zone: "Zone 2", name: "Aerobic Base", description: "Sustainable steady-state training", hrRange: "70-80% max HR", benefits: "Builds aerobic capacity and mitochondrial function" },
  { zone: "Zone 3", name: "Tempo", description: "Comfortably hard, conversation difficult", hrRange: "80-90% max HR", benefits: "Improves lactate threshold" },
  { zone: "Zone 4", name: "Threshold", description: "Hard effort, breathing elevated", hrRange: "90-95% max HR", benefits: "Strengthens anaerobic capacity" },
  { zone: "Zone 5", name: "VO2 Max", description: "Maximum sustainable effort", hrRange: "95-100% max HR", benefits: "Maximizes cardiovascular power" },
];

export function getTodaysWorkout(dateRef: Date): TodaysWorkout {
  const dow = dateRef.getDay(); // 0=Sun..6=Sat
  const idx = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6
  const wt = WORKOUT_TYPES[idx];
  return { name: wt.name, duration: wt.duration, targetZone: wt.zone, time: wt.time };
}

export function getWeeklySchedule(): WeeklyScheduleItem[] {
  return WEEKLY_SCHEDULE_DATA;
}

export function getHeartRateZones(): HeartRateZone[] {
  return HR_ZONES;
}

// ═══════════════════════════════════════════════════════════════════
// SUPPLEMENT PROTOCOL ENGINE
// ═══════════════════════════════════════════════════════════════════

const PROTOCOL_DATA: Omit<ProtocolItem, "id" | "taken">[] = [
  { name: "Vitamin D3", dosage: "5,000 IU", timing: "7:00 AM", timeOfDay: "morning" as TimeOfDay, instructions: "Take with fatty meal" },
  { name: "Omega-3 Fish Oil", dosage: "2g EPA/DHA", timing: "7:00 AM", timeOfDay: "morning" as TimeOfDay, instructions: "Take with breakfast" },
  { name: "Vitamin K2 (MK-7)", dosage: "200 mcg", timing: "7:00 AM", timeOfDay: "morning" as TimeOfDay, instructions: "Take with Vitamin D" },
  { name: "Magnesium Glycinate", dosage: "400 mg", timing: "12:00 PM", timeOfDay: "midday" as TimeOfDay, instructions: "Can take with or without food" },
  { name: "NAC", dosage: "600 mg", timing: "12:00 PM", timeOfDay: "midday" as TimeOfDay, instructions: "Take on empty stomach" },
  { name: "CoQ10 (Ubiquinol)", dosage: "200 mg", timing: "12:00 PM", timeOfDay: "midday" as TimeOfDay, instructions: "Take with fatty meal" },
  { name: "Ashwagandha (KSM-66)", dosage: "600 mg", timing: "8:00 PM", timeOfDay: "evening" as TimeOfDay, instructions: "Take with dinner" },
  { name: "Magnesium L-Threonate", dosage: "144 mg", timing: "9:30 PM", timeOfDay: "bedtime" as TimeOfDay, instructions: "Take 30 min before bed" },
  { name: "Melatonin", dosage: "0.5 mg", timing: "9:30 PM", timeOfDay: "bedtime" as TimeOfDay, instructions: "Low dose, sublingual" },
];

export function getSupplementProtocol(): ProtocolItem[] {
  return PROTOCOL_DATA.map((p, i) => ({
    id: `supp_${i + 1}`,
    ...p,
    taken: i < 3, // first 3 morning supps marked as taken by default
  }));
}

// ═══════════════════════════════════════════════════════════════════
// SLEEP STAGES ENGINE (date-based, deterministic)
// ═══════════════════════════════════════════════════════════════════

const BASE_STAGES: SleepStageBlock[] = [
  { stage: "light", duration: 25 }, { stage: "deep", duration: 35 },
  { stage: "light", duration: 15 }, { stage: "rem", duration: 20 },
  { stage: "light", duration: 10 }, { stage: "awake", duration: 5 },
  { stage: "light", duration: 20 }, { stage: "deep", duration: 40 },
  { stage: "light", duration: 15 }, { stage: "rem", duration: 25 },
  { stage: "light", duration: 20 }, { stage: "deep", duration: 30 },
  { stage: "rem", duration: 20 }, { stage: "light", duration: 30 },
  { stage: "awake", duration: 5 }, { stage: "light", duration: 20 },
  { stage: "rem", duration: 25 }, { stage: "light", duration: 25 },
  { stage: "awake", duration: 5 }, { stage: "light", duration: 20 },
];

export function generateSleepStages(dateRef: Date): SleepStageBlock[] {
  const seed = dateRef.getFullYear() * 10000 + (dateRef.getMonth() + 1) * 100 + dateRef.getDate();
  return BASE_STAGES.map((block, i) => {
    const jitter = Math.round((seededRandom(seed + i * 3) - 0.5) * 10);
    return { stage: block.stage, duration: Math.max(2, block.duration + jitter) };
  });
}

// ─── Reset ────────────────────────────────────────────────────────

export function resetClientOpsStore(): void {
  paymentStore.clear();
  labStore.clear();
  productStore.clear();
  cartStore.clear();
  chatStore.clear();
  acknowledgedAlertStore.clear();
}
