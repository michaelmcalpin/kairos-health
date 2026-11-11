/**
 * Group lab values from many panels into one trend per canonical marker,
 * then into display categories. Pure — shared by the client and coach views.
 */
import { normalizeCode, biomarkerDef, biomarkerName, statusFromRange, BIOMARKER_CATEGORIES, type BiomarkerCategory } from "./normalize";

export interface PanelMarker {
  id?: string;
  code: string;
  value: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  status: string | null;
  flagged?: boolean;
}

export interface LabPanelLike {
  resultId: string;
  /** ISO date or timestamp of the draw / receipt. */
  date: string;
  markers: PanelMarker[];
}

export interface MarkerPoint { resultId: string; date: string; value: number; unit: string | null; refLow: number | null; refHigh: number | null; status: string | null }

export interface MarkerTrend {
  code: string;
  name: string;
  category: BiomarkerCategory | "other";
  unit: string | null;
  latest: MarkerPoint;
  previous: MarkerPoint | null;
  /** Oldest first. */
  points: MarkerPoint[];
  /** Range for display: the latest panel's own, else none. */
  refLow: number | null;
  refHigh: number | null;
  /** From the range only; null when there is no range (never a guessed "normal"). */
  status: string | null;
  flagged: boolean;
}

export function buildMarkerTrends(panels: LabPanelLike[]): MarkerTrend[] {
  const byCode = new Map<string, { points: MarkerPoint[]; flagged: boolean }>();
  const sorted = [...panels].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const p of sorted) {
    const seen = new Set<string>();
    for (const m of p.markers) {
      if (!Number.isFinite(m.value)) continue;
      const code = normalizeCode(m.code);
      if (seen.has(code)) continue; // one value per marker per panel
      seen.add(code);
      const entry = byCode.get(code) ?? { points: [], flagged: false };
      entry.points.push({ resultId: p.resultId, date: p.date, value: m.value, unit: m.unit, refLow: m.refLow, refHigh: m.refHigh, status: m.status });
      byCode.set(code, entry);
    }
    // Flag reflects the latest panel only.
    for (const m of p.markers) {
      const e = byCode.get(normalizeCode(m.code));
      if (e) e.flagged = !!m.flagged;
    }
  }

  const out: MarkerTrend[] = [];
  byCode.forEach(({ points, flagged }, code) => {
    const latest = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const def = biomarkerDef(code);
    const status = statusFromRange(latest.value, latest.refLow, latest.refHigh)
      // Keep an explicit report flag when the panel had no range.
      ?? (latest.status && latest.status !== "normal" ? latest.status : null);
    out.push({
      code,
      name: biomarkerName(code),
      category: def?.category ?? "other",
      unit: latest.unit ?? def?.unit ?? null,
      latest, previous, points,
      refLow: latest.refLow, refHigh: latest.refHigh,
      status,
      flagged,
    });
  });
  return out;
}

export interface MarkerGroup { key: BiomarkerCategory | "other"; label: string; markers: MarkerTrend[] }

/** Catalog category order; out-of-range markers first within a group, then by name. */
export function groupMarkers(trends: MarkerTrend[]): MarkerGroup[] {
  const rank = (t: MarkerTrend) => (t.flagged ? 0 : t.status && t.status !== "normal" ? 1 : 2);
  return BIOMARKER_CATEGORIES
    .map((c) => ({
      key: c.key,
      label: c.label,
      markers: trends
        .filter((t) => t.category === c.key)
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.markers.length > 0);
}

/** Counts for the summary tiles. Markers without a range count as "no range", not "in range". */
export function markerCounts(trends: MarkerTrend[]) {
  let inRange = 0, outOfRange = 0, noRange = 0;
  for (const t of trends) {
    if (t.status == null) noRange++;
    else if (t.status === "normal") inRange++;
    else outOfRange++;
  }
  return { total: trends.length, inRange, outOfRange, noRange };
}
