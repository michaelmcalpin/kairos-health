// ─── Client Operations Engine ─────────────────────────────────────
// In-memory engines for client payments, labs, marketplace, and chat.

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
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function uid(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

// ─── Reset ────────────────────────────────────────────────────────

export function resetClientOpsStore(): void {
  paymentStore.clear();
  labStore.clear();
  productStore.clear();
  cartStore.clear();
  chatStore.clear();
}
