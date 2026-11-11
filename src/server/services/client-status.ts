/**
 * LifeScore-based status for a coach's clients (list, dashboard, detail).
 * Computes each client's LifeScore with a small concurrency limit so a large
 * roster doesn't open hundreds of queries at once.
 */
import type { db as DB } from "@/server/db";
import { computeLifeScore } from "@/lib/lifescore/score";
import { deriveLifeScoreStatus, type StatusResult } from "@/lib/lifescore/status";

export interface ClientScoreStatus extends StatusResult {
  core: number | null;
  physical: number | null;
  mental: number | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function clientScoreStatus(db: typeof DB, clientId: string, activeAlerts: number): Promise<ClientScoreStatus> {
  const ls = await computeLifeScore(db, clientId, today()).catch(() => null);
  const core = ls?.score ?? null;
  const physical = ls?.physical.score ?? null;
  const mental = ls?.mental.score ?? null;
  const s = deriveLifeScoreStatus({
    core, physical, mental,
    physicalSentiment: ls?.physical.sentiment ?? "no_data",
    mentalSentiment: ls?.mental.sentiment ?? "no_data",
    activeAlerts,
    focus: ls?.physical.focus ?? [],
  });
  return { ...s, core, physical, mental };
}

export async function clientScoreStatuses(
  db: typeof DB,
  clients: Array<{ id: string; activeAlerts: number }>,
  concurrency = 6,
): Promise<Map<string, ClientScoreStatus>> {
  const out = new Map<string, ClientScoreStatus>();
  let next = 0;
  async function worker() {
    while (next < clients.length) {
      const c = clients[next++];
      out.set(c.id, await clientScoreStatus(db, c.id, c.activeAlerts));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, clients.length) }, worker));
  return out;
}
