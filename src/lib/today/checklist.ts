/**
 * Pure helpers for the Today checklist (clientPortal.today.getToday payload).
 * Used for the optimistic update when a client ticks an item, so the UI and
 * the server agree on done/total without waiting for a refetch.
 */

export interface ChecklistItem {
  key: string;
  completable: boolean;
  done: boolean;
}

export interface ChecklistPayload<I extends ChecklistItem = ChecklistItem> {
  sections: Array<{ key: string; label: string; items: I[] }>;
  progress: { done: number; total: number };
}

export function countProgress(sections: ChecklistPayload["sections"]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const s of sections) {
    for (const i of s.items) {
      if (!i.completable) continue;
      total++;
      if (i.done) done++;
    }
  }
  return { done, total };
}

/** Copy of `payload` with item `key` set to `done`, progress recomputed. */
export function applyToggle<P extends ChecklistPayload>(payload: P, key: string, done: boolean): P {
  const sections = payload.sections.map((s) => ({
    ...s,
    items: s.items.map((i) => (i.key === key && i.completable ? { ...i, done } : i)),
  }));
  return { ...payload, sections, progress: countProgress(sections) };
}

/**
 * The LifeScore check-in item is completed by submitting the check-in, not by
 * ticking it (ticking would mark the day done with no ratings).
 */
export function isCheckinItem(key: string): boolean {
  return key.startsWith("lifescore:");
}
