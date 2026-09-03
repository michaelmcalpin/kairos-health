/**
 * Merge sleep sessions so a single night is represented once, even when it was
 * synced by more than one source (e.g. Apple Health AND Oura).
 *
 * We do NOT sum across sources (that inflates the numbers — two 7h sources would
 * read as 14h). Instead, for each metric we take the BETTER (max) non-zero value
 * across the sources for that night, so a source that's missing a metric doesn't
 * drag it to zero. Text fields (bedtime/wake/notes) take the first available.
 *
 * Returns one merged session per date, sorted newest-first.
 */

export interface SleepRowLike {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime?: string | null;
  wakeTime?: string | null;
  totalMinutes?: number | null;
  deepMinutes?: number | null;
  remMinutes?: number | null;
  lightMinutes?: number | null;
  awakeMinutes?: number | null;
  score?: number | null;
  notes?: string | null;
  source?: string | null;
}

/** Max of the non-null/non-zero values, or null when none qualify. */
function bestNum(a: number | null | undefined, b: number | null | undefined): number | null {
  const av = a != null && a !== 0 ? a : null;
  const bv = b != null && b !== 0 ? b : null;
  if (av == null) return bv;
  if (bv == null) return av;
  return Math.max(av, bv);
}

function firstText(a: string | null | undefined, b: string | null | undefined): string | null {
  return (a && a.trim()) || (b && b.trim()) || null;
}

export function mergeSleepNights<T extends SleepRowLike>(rows: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, { ...row });
      continue;
    }
    const sources = new Set(
      [existing.source, row.source].filter((s): s is string => !!s),
    );
    byDate.set(row.date, {
      ...existing,
      totalMinutes: bestNum(existing.totalMinutes, row.totalMinutes),
      deepMinutes: bestNum(existing.deepMinutes, row.deepMinutes),
      remMinutes: bestNum(existing.remMinutes, row.remMinutes),
      lightMinutes: bestNum(existing.lightMinutes, row.lightMinutes),
      awakeMinutes: bestNum(existing.awakeMinutes, row.awakeMinutes),
      score: bestNum(existing.score, row.score),
      bedtime: firstText(existing.bedtime, row.bedtime),
      wakeTime: firstText(existing.wakeTime, row.wakeTime),
      notes: firstText(existing.notes, row.notes),
      source: sources.size > 1 ? "multiple" : (existing.source ?? row.source ?? null),
    });
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}
