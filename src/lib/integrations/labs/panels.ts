/**
 * KAIROS Lab Panel Definitions
 *
 * Standard lab panel configurations with biomarker definitions,
 * optimal ranges (health-optimized, not just reference ranges),
 * and category mappings.
 */

import type { LabPanel, BiomarkerDefinition } from "./types";

// ─── Biomarker Definitions ──────────────────────────────────────────────────

export const BIOMARKERS: Record<string, BiomarkerDefinition> = {
  glucose_fasting: {
    id: "glucose_fasting", name: "Fasting Glucose", abbreviation: "FBG",
    unit: "mg/dL", category: "metabolic",
    optimalRange: { min: 72, max: 90 }, referenceRange: { min: 65, max: 99 },
    criticalLow: 50, criticalHigh: 250,
  },
  hba1c: {
    id: "hba1c", name: "Hemoglobin A1c", abbreviation: "HbA1c",
    unit: "%", category: "metabolic",
    optimalRange: { min: 4.5, max: 5.3 }, referenceRange: { min: 4.0, max: 5.6 },
    criticalHigh: 10,
  },
  insulin_fasting: {
    id: "insulin_fasting", name: "Fasting Insulin", abbreviation: "INS",
    unit: "uIU/mL", category: "metabolic",
    optimalRange: { min: 2, max: 6 }, referenceRange: { min: 2.6, max: 24.9 },
  },
  total_cholesterol: {
    id: "total_cholesterol", name: "Total Cholesterol", abbreviation: "TC",
    unit: "mg/dL", category: "lipid",
    optimalRange: { min: 150, max: 200 }, referenceRange: { min: 125, max: 200 },
    criticalHigh: 300,
  },
  ldl: {
    id: "ldl", name: "LDL Cholesterol", abbreviation: "LDL",
    unit: "mg/dL", category: "lipid",
    optimalRange: { min: 50, max: 100 }, referenceRange: { min: 0, max: 130 },
    criticalHigh: 190,
  },
  hdl: {
    id: "hdl", name: "HDL Cholesterol", abbreviation: "HDL",
    unit: "mg/dL", category: "lipid",
    optimalRange: { min: 60, max: 90 }, referenceRange: { min: 40, max: 100 },
  },
  triglycerides: {
    id: "triglycerides", name: "Triglycerides", abbreviation: "TG",
    unit: "mg/dL", category: "lipid",
    optimalRange: { min: 40, max: 80 }, referenceRange: { min: 0, max: 150 },
    criticalHigh: 500,
  },
  crp_hs: {
    id: "crp_hs", name: "hs-CRP", abbreviation: "hs-CRP",
    unit: "mg/L", category: "inflammation",
    optimalRange: { min: 0, max: 0.5 }, referenceRange: { min: 0, max: 3.0 },
    criticalHigh: 10,
  },
  homocysteine: {
    id: "homocysteine", name: "Homocysteine", abbreviation: "Hcy",
    unit: "umol/L", category: "inflammation",
    optimalRange: { min: 5, max: 8 }, referenceRange: { min: 4, max: 15 },
    criticalHigh: 50,
  },
  tsh: {
    id: "tsh", name: "TSH", abbreviation: "TSH",
    unit: "uIU/mL", category: "thyroid",
    optimalRange: { min: 0.5, max: 2.0 }, referenceRange: { min: 0.4, max: 4.0 },
    criticalLow: 0.01, criticalHigh: 10,
  },
  free_t3: {
    id: "free_t3", name: "Free T3", abbreviation: "fT3",
    unit: "pg/mL", category: "thyroid",
    optimalRange: { min: 3.0, max: 4.0 }, referenceRange: { min: 2.3, max: 4.2 },
  },
  free_t4: {
    id: "free_t4", name: "Free T4", abbreviation: "fT4",
    unit: "ng/dL", category: "thyroid",
    optimalRange: { min: 1.0, max: 1.5 }, referenceRange: { min: 0.8, max: 1.8 },
  },
  vitamin_d: {
    id: "vitamin_d", name: "Vitamin D (25-OH)", abbreviation: "VitD",
    unit: "ng/mL", category: "vitamin",
    optimalRange: { min: 50, max: 80 }, referenceRange: { min: 30, max: 100 },
    criticalLow: 10,
  },
  vitamin_b12: {
    id: "vitamin_b12", name: "Vitamin B12", abbreviation: "B12",
    unit: "pg/mL", category: "vitamin",
    optimalRange: { min: 500, max: 900 }, referenceRange: { min: 200, max: 1100 },
    criticalLow: 150,
  },
  ferritin: {
    id: "ferritin", name: "Ferritin", abbreviation: "Fer",
    unit: "ng/mL", category: "mineral",
    optimalRange: { min: 40, max: 150 }, referenceRange: { min: 12, max: 300 },
    criticalLow: 5,
  },
  testosterone_total: {
    id: "testosterone_total", name: "Total Testosterone", abbreviation: "TT",
    unit: "ng/dL", category: "hormone",
    optimalRange: { min: 500, max: 900 }, referenceRange: { min: 264, max: 916 },
  },
};

// ─── Standard Panels ────────────────────────────────────────────────────────

export const PANELS: LabPanel[] = [
  {
    id: "comprehensive_metabolic",
    name: "Comprehensive Metabolic Panel",
    description: "Core metabolic markers including glucose, insulin, and lipids",
    biomarkers: [
      BIOMARKERS.glucose_fasting,
      BIOMARKERS.hba1c,
      BIOMARKERS.insulin_fasting,
      BIOMARKERS.total_cholesterol,
      BIOMARKERS.ldl,
      BIOMARKERS.hdl,
      BIOMARKERS.triglycerides,
    ],
    estimatedCost: 149,
    turnaroundDays: 3,
    provider: "labcorp",
    providerPanelCode: "CMP_KAIROS_001",
  },
  {
    id: "thyroid_complete",
    name: "Complete Thyroid Panel",
    description: "Full thyroid function assessment",
    biomarkers: [BIOMARKERS.tsh, BIOMARKERS.free_t3, BIOMARKERS.free_t4],
    estimatedCost: 99,
    turnaroundDays: 3,
    provider: "labcorp",
    providerPanelCode: "THY_KAIROS_001",
  },
  {
    id: "inflammation_markers",
    name: "Inflammation & Cardiovascular Risk",
    description: "Key inflammation markers linked to cardiovascular disease risk",
    biomarkers: [BIOMARKERS.crp_hs, BIOMARKERS.homocysteine],
    estimatedCost: 79,
    turnaroundDays: 3,
    provider: "labcorp",
    providerPanelCode: "INF_KAIROS_001",
  },
  {
    id: "micronutrient_panel",
    name: "Micronutrient Panel",
    description: "Essential vitamins and minerals for optimal health",
    biomarkers: [BIOMARKERS.vitamin_d, BIOMARKERS.vitamin_b12, BIOMARKERS.ferritin],
    estimatedCost: 119,
    turnaroundDays: 5,
    provider: "labcorp",
    providerPanelCode: "MIC_KAIROS_001",
  },
  {
    id: "kairos_ultimate",
    name: "KAIROS Ultimate Panel",
    description: "Complete health optimization panel — all biomarkers in one draw",
    biomarkers: Object.values(BIOMARKERS),
    estimatedCost: 399,
    turnaroundDays: 5,
    provider: "labcorp",
    providerPanelCode: "ULT_KAIROS_001",
  },
];

/**
 * Determine flag for a lab result based on optimal and reference ranges
 */
export function flagResult(
  value: number,
  biomarker: BiomarkerDefinition
): "optimal" | "normal" | "low" | "high" | "critical_low" | "critical_high" {
  if (biomarker.criticalLow !== undefined && value < biomarker.criticalLow) return "critical_low";
  if (biomarker.criticalHigh !== undefined && value > biomarker.criticalHigh) return "critical_high";
  if (value >= biomarker.optimalRange.min && value <= biomarker.optimalRange.max) return "optimal";
  if (value < biomarker.referenceRange.min) return "low";
  if (value > biomarker.referenceRange.max) return "high";
  return "normal";
}
