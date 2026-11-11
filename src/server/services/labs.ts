/**
 * Lab panels for display, shared by the client and coach routers.
 *
 * One "panel" per lab_results row, with its order (name, provider), review
 * state and markers. The client view hides the values of unreleased panels
 * (they show as "Your care team is reviewing these"); the coach view sees
 * everything plus review hints.
 */
import { desc, eq, inArray } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import { labOrders, labResults, biomarkerValues } from "@/server/db/schema";
import { buildMarkerTrends, groupMarkers, markerCounts, type MarkerTrend } from "@/lib/labs/trends";
import { labReviewState, reviewHints, type LabReviewState, type ReviewHint } from "@/lib/labs/review";
import { biomarkerName, biomarkerDef, normalizeCode } from "@/lib/labs/normalize";

type Database = typeof DB;

export interface PanelMarkerOut {
  id: string;
  code: string;
  name: string;
  value: number;
  unit: string | null;
  /** Catalog unit, for the coach's unit check. */
  expectedUnit: string | null;
  refLow: number | null;
  refHigh: number | null;
  status: string | null;
  flagged: boolean;
}

export interface LabPanelOut {
  resultId: string;
  orderId: string | null;
  panelName: string;
  provider: string | null;
  /** ISO timestamp. */
  date: string;
  reviewState: LabReviewState;
  releasedAt: string | null;
  reviewedAt: string | null;
  coachNote: string | null;
  source: string | null;
  fileUrl: string | null;
  markers: PanelMarkerOut[];
}

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

export async function loadLabPanels(db: Database, clientId: string, limit = 40): Promise<LabPanelOut[]> {
  const rows = await safe(db.select({
    result: labResults,
    panelName: labOrders.panelName,
    provider: labOrders.provider,
  })
    .from(labResults)
    .leftJoin(labOrders, eq(labResults.orderId, labOrders.id))
    .where(eq(labResults.clientId, clientId))
    .orderBy(desc(labResults.receivedAt))
    .limit(limit), []);
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.result.id);
  const values = await safe(db.select().from(biomarkerValues).where(inArray(biomarkerValues.resultId, ids)), []);
  const byResult = new Map<string, typeof values>();
  for (const v of values) {
    const arr = byResult.get(v.resultId) ?? [];
    arr.push(v);
    byResult.set(v.resultId, arr);
  }

  return rows.map(({ result: r, panelName, provider }) => ({
    resultId: r.id,
    orderId: r.orderId,
    panelName: panelName ?? "Lab panel",
    provider: provider ?? null,
    date: (r.receivedAt ?? new Date()).toISOString(),
    reviewState: labReviewState(r),
    releasedAt: r.releasedAt?.toISOString() ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    coachNote: r.coachNote ?? null,
    source: r.ocrStatus ?? null,
    fileUrl: r.pdfUrl ? `/api/phi-file?type=lab&id=${r.id}` : null,
    markers: (byResult.get(r.id) ?? []).map((v) => ({
      id: v.id,
      code: normalizeCode(v.biomarkerCode),
      name: biomarkerName(v.biomarkerCode),
      value: v.value,
      unit: v.unit,
      expectedUnit: biomarkerDef(v.biomarkerCode)?.unit ?? null,
      refLow: v.refLow,
      refHigh: v.refHigh,
      status: v.status,
      flagged: v.flagged ?? false,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

function trendsFor(panels: LabPanelOut[]): MarkerTrend[] {
  return buildMarkerTrends(panels.map((p) => ({ resultId: p.resultId, date: p.date, markers: p.markers })));
}

/** What the client sees: released values only; pending panels without values. */
export async function clientLabOverview(db: Database, clientId: string) {
  const panels = await loadLabPanels(db, clientId);
  const released = panels.filter((p) => p.reviewState !== "pending_review");
  const trends = trendsFor(released);
  return {
    panels: panels.map((p) => p.reviewState === "pending_review"
      ? { ...p, markers: [], coachNote: null, markerCount: p.markers.length }
      : { ...p, markerCount: p.markers.length }),
    groups: groupMarkers(trends),
    counts: markerCounts(trends),
    pendingCount: panels.length - released.length,
  };
}

/** What the coach sees: everything, plus review hints on panels that need review. */
export async function coachLabOverview(db: Database, clientId: string) {
  const panels = await loadLabPanels(db, clientId);
  const trends = trendsFor(panels);
  const releasedTrends = trendsFor(panels.filter((p) => p.reviewState !== "pending_review"));

  // Previous value per marker, relative to each panel (panels are newest first).
  const hintsByMarker: Record<string, ReviewHint[]> = {};
  panels.forEach((p, i) => {
    if (p.reviewState === "released") return;
    const older = panels.slice(i + 1);
    for (const m of p.markers) {
      let prev: PanelMarkerOut | undefined;
      for (const o of older) { prev = o.markers.find((x) => x.code === m.code); if (prev) break; }
      hintsByMarker[m.id] = reviewHints(m, prev ? { value: prev.value, unit: prev.unit } : null);
    }
  });

  return {
    panels,
    hintsByMarker,
    groups: groupMarkers(trends),
    counts: markerCounts(trends),
    /** Counts as the client sees them (released panels only). */
    clientCounts: markerCounts(releasedTrends),
    needsReview: panels.filter((p) => p.reviewState !== "released").length,
  };
}
