/**
 * KAIROS Lab Integration Types
 *
 * Unified types for lab order management, result parsing,
 * and biomarker tracking from providers like LabCorp, Quest,
 * and direct-to-consumer panels.
 */

// ─── Lab Providers ──────────────────────────────────────────────────────────

export type LabProvider = "labcorp" | "quest" | "custom";

export interface LabProviderConfig {
  id: LabProvider;
  name: string;
  apiBaseUrl: string;
  supportsElectronicOrdering: boolean;
  supportsResultsApi: boolean;
  supportedPanels: string[];
}

// ─── Lab Panels ─────────────────────────────────────────────────────────────

export interface LabPanel {
  id: string;
  name: string;
  description: string;
  biomarkers: BiomarkerDefinition[];
  estimatedCost: number;
  turnaroundDays: number;
  provider: LabProvider;
  providerPanelCode?: string;
}

export interface BiomarkerDefinition {
  id: string;
  name: string;
  abbreviation: string;
  unit: string;
  category: BiomarkerCategory;
  optimalRange: { min: number; max: number };
  referenceRange: { min: number; max: number };
  criticalLow?: number;
  criticalHigh?: number;
}

export type BiomarkerCategory =
  | "metabolic"
  | "lipid"
  | "thyroid"
  | "hormone"
  | "inflammation"
  | "vitamin"
  | "mineral"
  | "liver"
  | "kidney"
  | "hematology"
  | "cardiac"
  | "immune";

// ─── Lab Orders & Results ───────────────────────────────────────────────────

export type OrderStatus = "pending" | "scheduled" | "collected" | "processing" | "completed" | "canceled";

export interface LabOrder {
  id: string;
  userId: string;
  provider: LabProvider;
  panelId: string;
  panelName: string;
  status: OrderStatus;
  orderedAt: string;
  scheduledDate?: string;
  completedAt?: string;
  providerOrderId?: string;
  results?: LabResult[];
}

export interface LabResult {
  biomarkerId: string;
  biomarkerName: string;
  value: number;
  unit: string;
  referenceRange: { min: number; max: number };
  optimalRange: { min: number; max: number };
  flag: "normal" | "low" | "high" | "critical_low" | "critical_high" | "optimal";
  previousValue?: number;
  previousDate?: string;
  trend?: "improving" | "stable" | "declining";
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export interface LabAnalysis {
  orderId: string;
  summary: string;
  outOfRange: LabResult[];
  optimal: LabResult[];
  improving: LabResult[];
  declining: LabResult[];
  recommendations: string[];
  riskFactors: string[];
}
