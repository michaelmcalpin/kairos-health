/**
 * DB-backed revenue estimates per scope (platform / company / coach).
 *
 * Every router that shows revenue goes through here so the same scope shows
 * the same number on every screen. The math lives in
 * src/lib/revenue/estimate.ts; this file only decides WHICH clients count:
 *
 *   active client = users.role = 'client' AND users.status = 'active'
 *   coach scope   = active client AND an active trainer_client_relationship
 *
 * The client profile is LEFT JOINed, so an active client without a profile
 * (no tier) is counted at $0 instead of being assumed to pay anything.
 */
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import { users, clientProfiles, trainerClientRelationships } from "@/server/db/schema";
import { estimateMrr, emptyRevenueEstimate, type RevenueEstimate } from "@/lib/revenue/estimate";

type Db = typeof DB;

const activeClient = and(eq(users.role, "client"), eq(users.status, "active"));

/** Tier key used for grouping; null tier (no profile) becomes "none". */
const tierKey = sql<string>`coalesce(${clientProfiles.tier}::text, 'none')`;

function addCount(target: Record<string, number>, tier: string, count: unknown) {
  target[tier] = (target[tier] ?? 0) + Number(count ?? 0);
}

async function platformTierCounts(db: Db, extra?: SQL): Promise<Record<string, number>> {
  const rows = await db
    .select({ tier: tierKey, count: sql<number>`count(*)` })
    .from(users)
    .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
    .where(extra ? and(activeClient, extra) : activeClient)
    .groupBy(tierKey);
  const counts: Record<string, number> = {};
  for (const r of rows) addCount(counts, r.tier, r.count);
  return counts;
}

/** Platform-wide estimate (all active clients). */
export async function getPlatformRevenueEstimate(db: Db): Promise<RevenueEstimate> {
  return estimateMrr(await platformTierCounts(db));
}

/** Estimate for one company (active clients whose users.company_id matches). */
export async function getCompanyRevenueEstimate(db: Db, companyId: string | null | undefined): Promise<RevenueEstimate> {
  if (!companyId) return emptyRevenueEstimate();
  return estimateMrr(await platformTierCounts(db, eq(users.companyId, companyId)));
}

/** Estimates for many companies in one query. Companies with no active clients get a zero estimate. */
export async function getCompanyRevenueEstimates(db: Db, companyIds: string[]): Promise<Map<string, RevenueEstimate>> {
  const result = new Map<string, RevenueEstimate>();
  if (companyIds.length === 0) return result;
  const rows = await db
    .select({ companyId: users.companyId, tier: tierKey, count: sql<number>`count(*)` })
    .from(users)
    .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
    .where(and(activeClient, inArray(users.companyId, companyIds)))
    .groupBy(users.companyId, tierKey);
  const byCompany = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (!r.companyId) continue;
    const counts = byCompany.get(r.companyId) ?? {};
    addCount(counts, r.tier, r.count);
    byCompany.set(r.companyId, counts);
  }
  for (const id of companyIds) result.set(id, estimateMrr(byCompany.get(id) ?? {}));
  return result;
}

/** Estimates for many coaches in one query. Coaches with no active clients get a zero estimate. */
export async function getCoachRevenueEstimates(db: Db, trainerIds: string[]): Promise<Map<string, RevenueEstimate>> {
  const result = new Map<string, RevenueEstimate>();
  if (trainerIds.length === 0) return result;
  const rows = await db
    .select({ trainerId: trainerClientRelationships.trainerId, tier: tierKey, count: sql<number>`count(distinct ${users.id})` })
    .from(trainerClientRelationships)
    .innerJoin(users, eq(users.id, trainerClientRelationships.clientId))
    .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
    .where(and(
      activeClient,
      eq(trainerClientRelationships.status, "active"),
      inArray(trainerClientRelationships.trainerId, trainerIds),
    ))
    .groupBy(trainerClientRelationships.trainerId, tierKey);
  const byCoach = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const counts = byCoach.get(r.trainerId) ?? {};
    addCount(counts, r.tier, r.count);
    byCoach.set(r.trainerId, counts);
  }
  for (const id of trainerIds) result.set(id, estimateMrr(byCoach.get(id) ?? {}));
  return result;
}

/** Estimate for one coach. */
export async function getCoachRevenueEstimate(db: Db, trainerId: string): Promise<RevenueEstimate> {
  return (await getCoachRevenueEstimates(db, [trainerId])).get(trainerId) ?? emptyRevenueEstimate();
}
