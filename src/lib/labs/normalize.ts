/**
 * Lab biomarker normalization, applied to every lab insert path.
 *
 * - Maps the many names a parser or CSV uses (GLUCOSE, HEMOGLOBIN_A1C,
 *   TOTAL_CHOLESTEROL…) to one canonical code, so the same marker trends
 *   across panels.
 * - Fills unit and reference range from the catalog when the report left
 *   them out (only if the unit is missing or matches).
 * - Status comes from the range. Without a range, only an explicit flag from
 *   the report (high / low / critical) is kept; "normal" is never guessed.
 * - One row per marker per panel (first wins).
 */

export interface BiomarkerDef { code: string; name: string; category: string; unit: string; refLow: number; refHigh: number }

/** Mirrors the seeded biomarker_definitions table. */
export const BIOMARKER_CATALOG: BiomarkerDef[] = [
  { code: "GLUCOSE_FASTING", name: "Fasting Glucose", category: "metabolic", unit: "mg/dL", refLow: 70, refHigh: 100 },
  { code: "HBA1C", name: "Hemoglobin A1C", category: "metabolic", unit: "%", refLow: 4.0, refHigh: 5.6 },
  { code: "TOTAL_CHOL", name: "Total Cholesterol", category: "lipids", unit: "mg/dL", refLow: 125, refHigh: 200 },
  { code: "LDL", name: "LDL Cholesterol", category: "lipids", unit: "mg/dL", refLow: 0, refHigh: 100 },
  { code: "HDL", name: "HDL Cholesterol", category: "lipids", unit: "mg/dL", refLow: 40, refHigh: 100 },
  { code: "TRIGLYCERIDES", name: "Triglycerides", category: "lipids", unit: "mg/dL", refLow: 0, refHigh: 150 },
  { code: "TESTOSTERONE", name: "Total Testosterone", category: "hormones", unit: "ng/dL", refLow: 300, refHigh: 1000 },
  { code: "TSH", name: "Thyroid Stimulating Hormone", category: "hormones", unit: "mIU/L", refLow: 0.4, refHigh: 4.0 },
  { code: "CRP", name: "C-Reactive Protein", category: "inflammation", unit: "mg/L", refLow: 0, refHigh: 3.0 },
  { code: "VITAMIN_D", name: "Vitamin D (25-OH)", category: "vitamins", unit: "ng/mL", refLow: 30, refHigh: 100 },
  { code: "B12", name: "Vitamin B12", category: "vitamins", unit: "pg/mL", refLow: 200, refHigh: 900 },
  { code: "FERRITIN", name: "Ferritin", category: "minerals", unit: "ng/mL", refLow: 20, refHigh: 300 },
  { code: "FASTING_INSULIN", name: "Fasting Insulin", category: "metabolic", unit: "uIU/mL", refLow: 2.6, refHigh: 24.9 },
  { code: "HOMOCYSTEINE", name: "Homocysteine", category: "inflammation", unit: "umol/L", refLow: 0, refHigh: 15 },
  { code: "DHEA_S", name: "DHEA-Sulfate", category: "hormones", unit: "ug/dL", refLow: 100, refHigh: 400 },
  { code: "FREE_T3", name: "Free T3", category: "hormones", unit: "pg/mL", refLow: 2.0, refHigh: 4.4 },
];

const CATALOG_BY_CODE = new Map(BIOMARKER_CATALOG.map((d) => [d.code, d]));

/** Other spellings → canonical code. Keys are normalized (A–Z, 0–9, _). */
const ALIASES: Record<string, string> = {
  GLUCOSE: "GLUCOSE_FASTING", FASTING_GLUCOSE: "GLUCOSE_FASTING", GLUCOSE_SERUM: "GLUCOSE_FASTING", BLOOD_GLUCOSE: "GLUCOSE_FASTING",
  HEMOGLOBIN_A1C: "HBA1C", A1C: "HBA1C", HGBA1C: "HBA1C", HB_A1C: "HBA1C", GLYCATED_HEMOGLOBIN: "HBA1C",
  TOTAL_CHOLESTEROL: "TOTAL_CHOL", CHOLESTEROL: "TOTAL_CHOL", CHOLESTEROL_TOTAL: "TOTAL_CHOL", CHOL: "TOTAL_CHOL",
  LDL_C: "LDL", LDL_CHOLESTEROL: "LDL", LDL_CALC: "LDL", LDL_CHOLESTEROL_CALC: "LDL",
  HDL_C: "HDL", HDL_CHOLESTEROL: "HDL",
  TRIGLYCERIDE: "TRIGLYCERIDES", TRIG: "TRIGLYCERIDES", TG: "TRIGLYCERIDES",
  TESTOSTERONE_TOTAL: "TESTOSTERONE", TOTAL_TESTOSTERONE: "TESTOSTERONE",
  THYROID_STIMULATING_HORMONE: "TSH",
  HS_CRP: "CRP", HSCRP: "CRP", C_REACTIVE_PROTEIN: "CRP", CRP_HS: "CRP", HIGH_SENSITIVITY_CRP: "CRP",
  VITAMIN_D_25_OH: "VITAMIN_D", VITAMIN_D_25_HYDROXY: "VITAMIN_D", "25_OH_VITAMIN_D": "VITAMIN_D", VIT_D: "VITAMIN_D", VITAMIN_D3: "VITAMIN_D",
  VITAMIN_B12: "B12", COBALAMIN: "B12", VIT_B12: "B12",
  INSULIN: "FASTING_INSULIN", INSULIN_FASTING: "FASTING_INSULIN",
  HOMOCYSTEINE_PLASMA: "HOMOCYSTEINE", PLASMA_HOMOCYSTEINE: "HOMOCYSTEINE",
  DHEA_SULFATE: "DHEA_S", DHEAS: "DHEA_S", DHEA_SO4: "DHEA_S",
  T3_FREE: "FREE_T3", FT3: "FREE_T3",
};

export function normalizeCode(raw: string): string {
  const k = raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return ALIASES[k] ?? k;
}

/** Human name for a code: catalog name, else "FREE_TESTOSTERONE" → "Free testosterone". */
export function biomarkerName(code: string): string {
  const c = CATALOG_BY_CODE.get(normalizeCode(code));
  if (c) return c.name;
  const words = code.replace(/_/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const sameUnit = (a: string | null | undefined, b: string) =>
  !!a && a.replace(/\s|µ/g, (m) => (m === "µ" ? "u" : "")).toLowerCase() === b.replace(/\s/g, "").toLowerCase();

export interface RawBiomarker {
  code: string;
  value: number;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
  status?: string | null;
}

export interface NormalizedBiomarker { code: string; value: number; unit: string | null; refLow: number | null; refHigh: number | null; status: string | null }

export function statusFromRange(value: number, refLow: number | null, refHigh: number | null): string | null {
  if (refLow == null && refHigh == null) return null;
  if (refLow != null && value < refLow) return "low";
  if (refHigh != null && value > refHigh) return "high";
  return "normal";
}

export function normalizeBiomarkers(rows: RawBiomarker[]): NormalizedBiomarker[] {
  const seen = new Set<string>();
  const out: NormalizedBiomarker[] = [];
  for (const r of rows) {
    if (!r.code || !Number.isFinite(r.value)) continue;
    const code = normalizeCode(r.code).slice(0, 50);
    if (!code || code === "UNKNOWN" || seen.has(code)) continue;
    seen.add(code);
    const def = CATALOG_BY_CODE.get(code);
    const unit = r.unit?.trim() || def?.unit || null;
    const useDefaults = !!def && (!r.unit || sameUnit(r.unit, def.unit));
    const refLow = r.refLow ?? (useDefaults && r.refHigh == null ? def!.refLow : null);
    const refHigh = r.refHigh ?? (useDefaults && r.refLow == null ? def!.refHigh : null);
    const flagged = (r.status ?? "").toLowerCase().trim();
    const explicitFlag = /^(high|low|critical|h|l|abnormal)$/.test(flagged)
      ? ({ h: "high", l: "low", abnormal: "high" } as Record<string, string>)[flagged] ?? flagged
      : null;
    out.push({ code, value: r.value, unit, refLow, refHigh, status: statusFromRange(r.value, refLow, refHigh) ?? explicitFlag });
  }
  return out;
}
