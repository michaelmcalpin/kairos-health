// ─── Client Operations Types ──────────────────────────────────────
// Types for client payments, labs, marketplace, and chat engines.

// ─── Payments ─────────────────────────────────────────────────────

export type BillingStatus = "Paid" | "Pending" | "Failed";

export interface CurrentPlan {
  name: string;
  monthlyTotal: number;
  nextBillingDate: string;
  paymentMethod: string;
  status: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  status: string;
}

export interface BillingEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: BillingStatus;
}

export interface UpcomingCharge {
  name: string;
  amount: number;
}

export interface ClientPaymentData {
  currentPlan: CurrentPlan;
  subscriptions: Subscription[];
  billingHistory: BillingEntry[];
  upcomingCharges: { estimatedTotal: number; breakdown: UpcomingCharge[] };
}

// ─── Labs ─────────────────────────────────────────────────────────

export type LabCategory = "metabolic" | "lipids" | "hormones" | "inflammation" | "vitamins";
export type MarkerStatus = "optimal" | "normal" | "borderline" | "out-of-range";
export type MarkerTrend = "up" | "down" | "flat";
export type OrderStatus = "results-ready" | "pending" | "scheduled";

export interface LabMarker {
  id: string;
  name: string;
  category: LabCategory;
  currentValue: number;
  unit: string;
  referenceRange: string;
  optimalRange: string;
  status: MarkerStatus;
  trend: MarkerTrend;
  previousValue: number;
  lastDrawDate: string;
}

export interface LabOrder {
  id: string;
  date: string;
  labName: string;
  panelType: string;
  status: OrderStatus;
}

export interface LabStats {
  total: number;
  inRange: number;
  outOfRange: number;
  improved: number;
}

export interface ClientLabData {
  markers: LabMarker[];
  orders: LabOrder[];
  stats: LabStats;
}

export const LAB_CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "metabolic", label: "Metabolic" },
  { id: "lipids", label: "Lipids" },
  { id: "hormones", label: "Hormones" },
  { id: "inflammation", label: "Inflammation" },
  { id: "vitamins", label: "Vitamins" },
];

// ─── Client Marketplace ───────────────────────────────────────────

export type ProductCategory = "longevity" | "metabolic" | "sleep" | "cognitive" | "immune";

export interface ClientProduct {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  description: string;
  rating: number;
  inProtocol: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

// ─── Chat ─────────────────────────────────────────────────────────

export type MessageSender = "client" | "coach" | "system";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}
