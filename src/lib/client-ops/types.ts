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

export const PRODUCT_CATEGORIES: Array<"All" | ProductCategory> = [
  "All", "longevity", "metabolic", "sleep", "cognitive", "immune",
];

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  longevity: "Longevity",
  metabolic: "Metabolic",
  sleep: "Sleep",
  cognitive: "Cognitive",
  immune: "Immune",
};

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

// ─── Client Alerts ───────────────────────────────────────────────

export type ClientAlertPriority = "critical" | "high" | "medium" | "low" | "info";
export type ClientAlertStatus = "active" | "acknowledged" | "resolved";

export interface ClientAlert {
  id: string;
  title: string;
  message: string;
  priority: ClientAlertPriority;
  status: ClientAlertStatus;
  category: string;
  createdAt: string;
  details?: string;
}

export const CLIENT_ALERT_PRIORITY_CONFIG: Record<ClientAlertPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: "text-red-400", bgColor: "bg-red-500/15", label: "Critical" },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/15", label: "High" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/15", label: "Medium" },
  low: { color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Low" },
  info: { color: "text-kairos-silver", bgColor: "bg-kairos-silver/10", label: "Info" },
};

// ─── Client Insights ────────────────────────────────────────────

export type InsightCategory = "Metabolic" | "Sleep" | "Recovery" | "Nutrition" | "Supplementation" | "Exercise" | "Stress";
export type InsightConfidence = "high" | "medium";

export interface ClientInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  confidence: InsightConfidence;
  recommendation: string;
  dataSource: string;
  timestamp: string;
}

export interface InsightSummary {
  score: string;
  trend: string;
}

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  "Metabolic", "Sleep", "Recovery", "Nutrition", "Supplementation", "Exercise", "Stress",
];

// ─── Nutrition (Meals) ───────────────────────────────────────────

export interface MealEntry {
  name: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ─── Workouts (Schedule) ────────────────────────────────────────

export interface TodaysWorkout {
  name: string;
  duration: number;
  targetZone: string;
  time: string;
}

export interface WeeklyScheduleItem {
  day: string;
  type: string;
  color: string;
}

export interface HeartRateZone {
  zone: string;
  name: string;
  description: string;
  hrRange: string;
  benefits: string;
}

// ─── Supplements (Protocol) ────────────────────────────────────

export type TimeOfDay = "morning" | "midday" | "evening" | "bedtime";

export interface ProtocolItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  timeOfDay: TimeOfDay;
  instructions: string;
  taken: boolean;
}

// ─── Sleep (Stages) ─────────────────────────────────────────────

export interface SleepStageBlock {
  stage: "deep" | "rem" | "light" | "awake";
  duration: number;
}

// ─── Dashboard Protocol ───────────────────────────────────────────

export interface DashboardProtocolItem {
  time: string;
  item: string;
  done: boolean;
}

// ─── Check-in ─────────────────────────────────────────────────────

export type CheckinStep = "mood" | "energy" | "sleep" | "symptoms" | "adherence" | "notes" | "complete";

export const CHECKIN_STEPS: CheckinStep[] = [
  "mood", "energy", "sleep", "symptoms", "adherence", "notes", "complete",
];

export const SYMPTOM_OPTIONS: string[] = [
  "Headache", "Brain fog", "Joint pain", "Bloating",
  "Anxiety", "Muscle soreness", "Nausea", "None",
];

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
