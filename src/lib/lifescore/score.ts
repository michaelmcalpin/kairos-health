/**
 * Everist LifeScore™ scoring service.
 *
 * Composite 0–100 wellbeing score across five dimensions:
 *   body, mind, purpose, relationships, work.
 *
 * - Body is auto-derived from health data (adherence + daily check-in vitals)
 *   lightly blended with an optional Body self-rating.
 * - Mind / Purpose / Relationships / Work come from the daily 1–5 dimension
 *   ratings, nudged by recent journal valence.
 * - Composite is a coach-adjustable weighted average (default equal).
 * - Shown as a 7-day rolling average so one rough day never crashes the number.
 * - A skipped dimension DROPS OUT of the average — it never scores 0. A low
 *   score must mean "reported low," never "didn't log."
 *
 * See docs/lifescore-spec.md.
 */

import { and, eq, gte, lte } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import {
  dailyCheckins,
  lifeScoreCheckins,
  lifeScoreJournalEntries,
  lifeScoreWeights,
  LIFE_DIMENSIONS,
  type LifeDimension,
} from "@/server/db/schema";
import { computeAdherence } from "@/server/trpc/routers/client/today";

export type Sentiment = "well" | "steady" | "struggling" | "no_data";

export interface DimensionResult {
  dimension: LifeDimension;
  /** 0–100 rolling score, or null when there's no data in the window. */
  score: number | null;
  /** Directional read vs the client's own baseline — the only thing coaches see. */
  sentiment: Sentiment;
  weight: number; // normalized 0–100
}

export interface LifeScoreResult {
  /** Composite 0–100, or null when no dimension has data. */
  score: number | null;
  dimensions: DimensionResult[];
  hasData: boolean;
  windowDays: number;
}

const CURRENT_WINDOW = 7;
const BASELINE_WINDOW = 30;

function shift(dateStr: string, deltaDays: number): string {
  const dt = new Date(dateStr + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Map a 1–5 self-rating to 0–100 (5 → 100, 1 → 20). */
function ratingToScore(r: number): number {
  return Math.max(0, Math.min(100, r * 20));
}

/** Clamp + round for display. */
function clamp(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

/**
 * Compute the LifeScore for a client as of `endDate` (YYYY-MM-DD).
 * All queries are null-guarded; a failure in one dimension never sinks the rest.
 */
export async function computeLifeScore(
  db: typeof DB,
  clientId: string,
  endDate: string,
): Promise<LifeScoreResult> {
  const baselineStart = shift(endDate, -(BASELINE_WINDOW - 1));
  const currentStart = shift(endDate, -(CURRENT_WINDOW - 1));

  // ── Fetch everything in the 30-day window in parallel ──
  const [checkins, dailies, journals, weightsRow, adherence] = await Promise.all([
    db.select().from(lifeScoreCheckins).where(and(
      eq(lifeScoreCheckins.clientId, clientId),
      gte(lifeScoreCheckins.date, baselineStart),
      lte(lifeScoreCheckins.date, endDate),
    )).catch(() => []),
    db.select().from(dailyCheckins).where(and(
      eq(dailyCheckins.clientId, clientId),
      gte(dailyCheckins.date, baselineStart),
      lte(dailyCheckins.date, endDate),
    )).catch(() => []),
    db.select().from(lifeScoreJournalEntries).where(and(
      eq(lifeScoreJournalEntries.clientId, clientId),
      gte(lifeScoreJournalEntries.date, currentStart),
      lte(lifeScoreJournalEntries.date, endDate),
    )).catch(() => []),
    db.select().from(lifeScoreWeights).where(eq(lifeScoreWeights.clientId, clientId))
      .then((r) => r[0]).catch(() => undefined),
    computeAdherence(db, clientId, BASELINE_WINDOW, endDate).catch(() => null),
  ]);

  // Adherence pct by date, for Body.
  const adhByDate = new Map<string, number>();
  for (const d of adherence?.days ?? []) {
    if (d.pct != null) adhByDate.set(d.date, d.pct);
  }

  // ── Per-dimension daily score series ──
  // For the four self-reported dimensions: rating → score, per day.
  // For Body: blend adherence + daily-checkin vitals + optional Body self-rating.
  function dailyScoresFor(dim: LifeDimension, from: string): number[] {
    const scores: number[] = [];
    const dates: string[] = [];
    for (let i = 0; i < BASELINE_WINDOW; i++) dates.push(shift(endDate, -i));

    for (const date of dates) {
      if (date < from) continue;
      if (dim === "body") {
        const parts: number[] = [];
        const adh = adhByDate.get(date);
        if (adh != null) parts.push(adh);
        const daily = dailies.find((r) => r.date === date);
        if (daily) {
          if (daily.readinessScore != null) parts.push(Math.max(0, Math.min(100, daily.readinessScore)));
          if (daily.sleepQuality != null) parts.push(Math.max(0, Math.min(100, daily.sleepQuality * 10)));
          if (daily.energy != null) parts.push(Math.max(0, Math.min(100, daily.energy * 10)));
        }
        const self = checkins.find((c) => c.date === date && c.dimension === "body" && c.rating != null);
        if (self?.rating != null) parts.push(ratingToScore(self.rating));
        const m = mean(parts);
        if (m != null) scores.push(m);
      } else {
        const self = checkins.find((c) => c.date === date && c.dimension === dim && c.rating != null);
        if (self?.rating != null) scores.push(ratingToScore(self.rating));
      }
    }
    return scores;
  }

  // Journal valence nudge for the four self-reported dimensions (last 7 days).
  function valenceNudge(dim: LifeDimension): number {
    let n = 0;
    for (const j of journals) {
      for (const t of (j.themes ?? [])) {
        if (t.dimension !== dim) continue;
        if (t.valence === "negative") n -= 3;
        else if (t.valence === "positive") n += 2;
      }
    }
    return Math.max(-8, Math.min(8, n));
  }

  const dimensions: DimensionResult[] = [];
  for (const dim of LIFE_DIMENSIONS) {
    const current = dailyScoresFor(dim, currentStart);
    const baseline = dailyScoresFor(dim, baselineStart);
    const curMean = mean(current);
    const baseMean = mean(baseline);

    let score: number | null = null;
    let sentiment: Sentiment = "no_data";

    if (curMean != null) {
      const nudged = dim === "body" ? curMean : curMean + valenceNudge(dim);
      score = clamp(nudged);
      // Directional read vs the client's own 30-day baseline.
      const delta = baseMean != null ? nudged - baseMean : 0;
      if (score < 45 || delta <= -8) sentiment = "struggling";
      else if ((score >= 70 && delta >= 4) || delta >= 8) sentiment = "well";
      else sentiment = "steady";
    }

    dimensions.push({ dimension: dim, score, sentiment, weight: 0 });
  }

  // ── Weights (normalized) ──
  const rawWeights: Record<LifeDimension, number> = {
    body: weightsRow?.body ?? 20,
    mind: weightsRow?.mind ?? 20,
    purpose: weightsRow?.purpose ?? 20,
    relationships: weightsRow?.relationships ?? 20,
    work: weightsRow?.work ?? 20,
  };
  // Only dimensions with a score participate in the composite; renormalize
  // across those so a skipped dimension never drags the total down.
  const scored = dimensions.filter((d) => d.score != null);
  const totalW = scored.reduce((s, d) => s + (rawWeights[d.dimension] || 0), 0);

  let composite: number | null = null;
  if (scored.length > 0 && totalW > 0) {
    composite = clamp(
      scored.reduce((s, d) => s + (d.score as number) * (rawWeights[d.dimension] || 0), 0) / totalW,
    );
  }

  // Report each dimension's normalized weight (across all five) for display.
  const allTotal = LIFE_DIMENSIONS.reduce((s, d) => s + (rawWeights[d] || 0), 0) || 1;
  for (const d of dimensions) {
    d.weight = Math.round(((rawWeights[d.dimension] || 0) / allTotal) * 100);
  }

  return {
    score: composite,
    dimensions,
    hasData: scored.length > 0,
    windowDays: CURRENT_WINDOW,
  };
}
