/**
 * Lab review-and-release.
 *
 * A lab result is "pending review" until a coach releases it; only released
 * results are shown to the client (they see "Your care team is reviewing
 * these" until then). Results the client typed in by hand are released at
 * once — they are the client's own numbers — but stay "unreviewed" until a
 * coach marks them reviewed. Results that existed before review-and-release
 * were backfilled as released.
 */
import { normalizeCode, biomarkerDef, sameUnit } from "./normalize";

export type LabReviewState = "pending_review" | "released_unreviewed" | "released";

export interface ReviewFields {
  releasedAt: Date | string | null | undefined;
  reviewedAt: Date | string | null | undefined;
}

export function labReviewState(r: ReviewFields): LabReviewState {
  if (!r.releasedAt) return "pending_review";
  return r.reviewedAt ? "released" : "released_unreviewed";
}

/** Can the client see this result's values? */
export function isClientVisible(r: ReviewFields): boolean {
  return !!r.releasedAt;
}

/** Does the coach still need to look at this result? */
export function needsCoachReview(r: ReviewFields): boolean {
  return labReviewState(r) !== "released";
}

export type LabSource = "client_manual" | "client_parsed" | "client_import" | "coach" | "url_import" | "pdf_upload";

/**
 * Review fields a new result starts with. Only values the client typed in
 * themselves are visible straight away; parsed, imported and coach-entered
 * results wait for a coach to release them.
 */
export function initialReviewFields(source: LabSource, now: Date = new Date()): { releasedAt: Date | null; reviewedAt: null } {
  return { releasedAt: source === "client_manual" ? now : null, reviewedAt: null };
}

export interface ReviewMarker {
  code: string;
  value: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
}

export type ReviewHintKind = "unit_mismatch" | "no_unit" | "out_of_range" | "far_out_of_range" | "big_change" | "no_range";

export interface ReviewHint { kind: ReviewHintKind; message: string }

/**
 * Things the coach should check before releasing a marker: unit differs
 * from the catalog's, value outside its range (or far outside — a likely
 * unit or typo error), or a big jump from the previous panel.
 */
export function reviewHints(m: ReviewMarker, previous?: { value: number; unit: string | null } | null): ReviewHint[] {
  const hints: ReviewHint[] = [];
  const def = biomarkerDef(m.code);
  if (!m.unit) {
    hints.push({ kind: "no_unit", message: def ? `No unit — usually ${def.unit}` : "No unit given" });
  } else if (def && !sameUnit(m.unit, def.unit)) {
    hints.push({ kind: "unit_mismatch", message: `Unit ${m.unit} differs from the usual ${def.unit}` });
  }

  const lo = m.refLow, hi = m.refHigh;
  if (lo == null && hi == null) {
    hints.push({ kind: "no_range", message: "No reference range — status not shown" });
  } else {
    const width = lo != null && hi != null ? hi - lo : Math.abs((hi ?? lo)!);
    const far = width > 0 && ((lo != null && m.value < lo - width * 2) || (hi != null && m.value > hi + width * 2));
    if (far) hints.push({ kind: "far_out_of_range", message: "Far outside the range — check value and unit" });
    else if ((lo != null && m.value < lo) || (hi != null && m.value > hi)) hints.push({ kind: "out_of_range", message: "Outside the reference range" });
  }

  if (previous && Number.isFinite(previous.value) && previous.value !== 0
      && (!previous.unit || !m.unit || sameUnit(previous.unit, m.unit))) {
    const change = (m.value - previous.value) / Math.abs(previous.value);
    if (Math.abs(change) >= 0.5) {
      hints.push({ kind: "big_change", message: `${change > 0 ? "Up" : "Down"} ${Math.round(Math.abs(change) * 100)}% since last panel` });
    }
  }
  return hints;
}

/** Same canonical marker? (codes stored before normalization may differ in spelling.) */
export const sameMarker = (a: string, b: string) => normalizeCode(a) === normalizeCode(b);
