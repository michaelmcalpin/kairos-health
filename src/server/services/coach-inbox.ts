/**
 * Coach Inbox loader and state changes. Mapping, sorting and counting live in
 * src/lib/coach-inbox/model.ts; this file only gathers rows.
 *
 * Roster: primary clients (active relationship) plus shared-access clients
 * whose grant allows health data. Messages: conversations where this coach is
 * the trainer.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import {
  alerts,
  clientCoachAccess,
  coachInboxStates,
  conversations,
  deviceConnections,
  glucoseReadings,
  hrvReadings,
  sleepSessions,
  trainerClientRelationships,
  users,
} from "@/server/db/schema";
import { expireSchedulingAlerts } from "@/server/services/alert-hygiene";
import {
  mapAlert,
  mapHrv,
  mapMessage,
  mapNoData,
  parseInboxKey,
  sortInbox,
  stateToAlertStatus,
  type InboxItem,
  type InboxState,
} from "@/lib/coach-inbox/model";

type Db = typeof DB;

const safeQ = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const displayName = (u?: { firstName: string | null; lastName: string | null; email: string } | null) =>
  u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : "Client";

export interface CoachRoster {
  primaryIds: Set<string>;
  /** Primary clients plus shared-access clients with health-data access. */
  healthIds: Set<string>;
}

export async function getCoachRoster(db: Db, coachId: string): Promise<CoachRoster> {
  const [rels, grants] = await Promise.all([
    safeQ(
      () => db.query.trainerClientRelationships.findMany({
        where: and(eq(trainerClientRelationships.trainerId, coachId), eq(trainerClientRelationships.status, "active")),
      }),
      [] as (typeof trainerClientRelationships.$inferSelect)[],
    ),
    safeQ(
      () => db.query.clientCoachAccess.findMany({
        where: and(eq(clientCoachAccess.coachId, coachId), eq(clientCoachAccess.status, "active")),
      }),
      [] as (typeof clientCoachAccess.$inferSelect)[],
    ),
  ]);
  const primaryIds = new Set(rels.map((r) => r.clientId));
  const healthIds = new Set(primaryIds);
  for (const g of grants) if (g.healthDataAccess !== "none") healthIds.add(g.clientId);
  return { primaryIds, healthIds };
}

export type InboxSource = "alerts" | "signals" | "messages";

export interface LoadInboxOptions {
  /** Include resolved items (alerts resolved in the last 30 days). */
  includeResolved?: boolean;
  /** Limit which sources are loaded (default: all). */
  sources?: InboxSource[];
  now?: Date;
}

export async function loadInbox(db: Db, coachId: string, opts: LoadInboxOptions = {}): Promise<InboxItem[]> {
  const now = opts.now ?? new Date();
  const sources = new Set<InboxSource>(opts.sources ?? ["alerts", "signals", "messages"]);
  const roster = await getCoachRoster(db, coachId);
  const healthIds = Array.from(roster.healthIds).slice(0, 500);

  if (sources.has("alerts") && healthIds.length) await expireSchedulingAlerts(db, healthIds);

  const stateRows = await safeQ(
    () => db.select({ key: coachInboxStates.itemKey, state: coachInboxStates.state })
      .from(coachInboxStates).where(eq(coachInboxStates.coachId, coachId)),
    [] as { key: string; state: string }[],
  );
  const overrides = new Map(stateRows.map((r) => [r.key, r.state as InboxState]));

  const [alertItems, signalItems, messageItems] = await Promise.all([
    sources.has("alerts") ? loadAlerts(db, healthIds, overrides, !!opts.includeResolved, now) : [],
    sources.has("signals") ? loadSignals(db, healthIds, overrides, now) : [],
    sources.has("messages") ? loadMessages(db, coachId, overrides, now) : [],
  ]);

  const all = [...alertItems, ...signalItems, ...messageItems];
  return sortInbox(opts.includeResolved ? all : all.filter((i) => i.state !== "resolved"));
}

async function namesFor(db: Db, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await safeQ(
    () => db.query.users.findMany({ where: inArray(users.id, ids) }),
    [] as (typeof users.$inferSelect)[],
  );
  return new Map(rows.map((u) => [u.id, displayName(u)]));
}

async function loadAlerts(
  db: Db, clientIds: string[], overrides: Map<string, InboxState>, includeResolved: boolean, now: Date,
): Promise<InboxItem[]> {
  if (!clientIds.length) return [];
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const rows = await safeQ(
    () => db.query.alerts.findMany({
      where: and(
        inArray(alerts.clientId, clientIds),
        includeResolved
          ? or(
              inArray(alerts.status, ["active", "acknowledged"]),
              gte(sql`coalesce(${alerts.resolvedAt}, ${alerts.acknowledgedAt}, ${alerts.createdAt})`, since),
            )
          : inArray(alerts.status, ["active", "acknowledged"]),
      ),
      orderBy: [desc(alerts.createdAt)],
      limit: 500,
    }),
    [] as (typeof alerts.$inferSelect)[],
  );
  const names = await namesFor(db, Array.from(new Set(rows.map((r) => r.clientId))));
  return rows.map((a) => mapAlert(a, names.get(a.clientId) ?? "Client", overrides.get(`alert:${a.id}`)));
}

async function loadSignals(
  db: Db, clientIds: string[], overrides: Map<string, InboxState>, now: Date,
): Promise<InboxItem[]> {
  if (!clientIds.length) return [];
  const cutoff48h = new Date(now.getTime() - 48 * 3_600_000);
  const cutoff14d = new Date(now.getTime() - 14 * 86_400_000);
  const twoDaysAgo = cutoff48h.toISOString().slice(0, 10);
  type CountRow = { clientId: string; count: number };

  const [latestHrvRaw, hrvAvg, devices, hrvCounts, glucoseCounts, sleepCounts] = await Promise.all([
    safeQ(
      () => db.execute(sql`
        SELECT DISTINCT ON (client_id) client_id, rmssd, timestamp
        FROM hrv_readings
        WHERE client_id = ANY(${clientIds}) AND timestamp >= ${cutoff48h}
        ORDER BY client_id, timestamp DESC
      `),
      [] as unknown as Awaited<ReturnType<Db["execute"]>>,
    ),
    safeQ(
      () => db.select({ clientId: hrvReadings.clientId, avg: sql<number>`avg(${hrvReadings.rmssd})` })
        .from(hrvReadings)
        .where(and(inArray(hrvReadings.clientId, clientIds), gte(hrvReadings.timestamp, cutoff14d)))
        .groupBy(hrvReadings.clientId),
      [] as { clientId: string; avg: number }[],
    ),
    safeQ(
      () => db.query.deviceConnections.findMany({
        where: and(inArray(deviceConnections.clientId, clientIds), eq(deviceConnections.status, "connected")),
      }),
      [] as (typeof deviceConnections.$inferSelect)[],
    ),
    safeQ(
      () => db.select({ clientId: hrvReadings.clientId, count: sql<number>`count(*)` }).from(hrvReadings)
        .where(and(inArray(hrvReadings.clientId, clientIds), gte(hrvReadings.timestamp, cutoff48h)))
        .groupBy(hrvReadings.clientId),
      [] as CountRow[],
    ),
    safeQ(
      () => db.select({ clientId: glucoseReadings.clientId, count: sql<number>`count(*)` }).from(glucoseReadings)
        .where(and(inArray(glucoseReadings.clientId, clientIds), gte(glucoseReadings.timestamp, cutoff48h)))
        .groupBy(glucoseReadings.clientId),
      [] as CountRow[],
    ),
    safeQ(
      () => db.select({ clientId: sleepSessions.clientId, count: sql<number>`count(*)` }).from(sleepSessions)
        .where(and(inArray(sleepSessions.clientId, clientIds), gte(sleepSessions.date, sql`${twoDaysAgo}::date`)))
        .groupBy(sleepSessions.clientId),
      [] as CountRow[],
    ),
  ]);

  const avgMap = new Map(hrvAvg.map((r) => [r.clientId, Number(r.avg)]));
  const latest = latestHrvRaw as unknown as Array<{ client_id: string; rmssd: number | string; timestamp: Date | string }>;
  const recent = new Set<string>(
    [...hrvCounts, ...glucoseCounts, ...sleepCounts].filter((c) => Number(c.count) > 0).map((c) => c.clientId),
  );
  const devicesByClient = new Map<string, (typeof deviceConnections.$inferSelect)[]>();
  for (const d of devices) devicesByClient.set(d.clientId, [...(devicesByClient.get(d.clientId) ?? []), d]);

  const raw: Array<{ clientId: string; build: (name: string) => InboxItem | null }> = [];
  for (const r of latest) {
    const avg = avgMap.get(r.client_id);
    if (!avg) continue;
    raw.push({
      clientId: r.client_id,
      build: (name) => {
        const probe = mapHrv({ clientId: r.client_id, latestRmssd: Number(r.rmssd), avgRmssd: avg, readingAt: r.timestamp }, name);
        return probe ? { ...probe, state: overrides.get(probe.key) ?? "new" } : null;
      },
    });
  }
  for (const clientId of clientIds) {
    const list = devicesByClient.get(clientId);
    if (!list?.length) continue;
    const stale = list.every((d) => !d.lastSyncAt || d.lastSyncAt.getTime() < cutoff48h.getTime());
    if (recent.has(clientId) && !stale) continue;
    const lastSync = list.reduce<Date | null>((acc, d) => (d.lastSyncAt && (!acc || d.lastSyncAt > acc) ? d.lastSyncAt : acc), null);
    raw.push({
      clientId,
      build: (name) => {
        const probe = mapNoData({ clientId, lastSyncAt: lastSync }, name, now);
        return { ...probe, state: overrides.get(probe.key) ?? "new" };
      },
    });
  }

  const names = await namesFor(db, Array.from(new Set(raw.map((r) => r.clientId))));
  return raw.map((r) => r.build(names.get(r.clientId) ?? "Client")).filter((i): i is InboxItem => i != null);
}

async function loadMessages(
  db: Db, coachId: string, overrides: Map<string, InboxState>, now: Date,
): Promise<InboxItem[]> {
  const raw = await safeQ(
    () => db.execute(sql`
      SELECT DISTINCT ON (m.conversation_id)
        m.id, m.conversation_id, m.sender_role, m.body, m.created_at, c.client_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.trainer_id = ${coachId}
      ORDER BY m.conversation_id, m.created_at DESC
    `),
    [] as unknown as Awaited<ReturnType<Db["execute"]>>,
  );
  const rows = (raw as unknown as Array<{
    id: string; conversation_id: string; sender_role: string; body: string; created_at: Date | string; client_id: string;
  }>).filter((m) => m.sender_role === "client");
  if (!rows.length) return [];
  const names = await namesFor(db, Array.from(new Set(rows.map((r) => r.client_id))));
  return rows.map((m) => {
    const item = mapMessage(
      { conversationId: m.conversation_id, messageId: m.id, clientId: m.client_id, body: m.body, sentAt: m.created_at },
      names.get(m.client_id) ?? "Client",
      now,
    );
    return { ...item, state: overrides.get(item.key) ?? "new" };
  });
}

// ─── State changes ───────────────────────────────────────────────

async function setOverride(db: Db, coachId: string, key: string, state: InboxState) {
  if (state === "new") {
    await db.delete(coachInboxStates).where(and(eq(coachInboxStates.coachId, coachId), eq(coachInboxStates.itemKey, key)));
    return;
  }
  await db.insert(coachInboxStates)
    .values({ coachId, itemKey: key, state, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [coachInboxStates.coachId, coachInboxStates.itemKey],
      set: { state, updatedAt: new Date() },
    });
}

/**
 * Move an inbox item to New, Acknowledged or Resolved.
 * Primary coach + alert → the alert row itself (same as the old Acknowledge).
 * Everything else → this coach's own state row.
 */
export async function setInboxState(db: Db, coachId: string, key: string, state: InboxState): Promise<void> {
  const parsed = parseInboxKey(key);
  if (!parsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown inbox item" });
  const roster = await getCoachRoster(db, coachId);

  if (parsed.kind === "alert") {
    const alert = await db.query.alerts.findFirst({ where: eq(alerts.id, parsed.alertId) });
    if (!alert || !roster.healthIds.has(alert.clientId)) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
    if (roster.primaryIds.has(alert.clientId)) {
      const t = new Date();
      await db.update(alerts).set({
        status: stateToAlertStatus(state),
        acknowledgedAt: state === "new" ? null : alert.acknowledgedAt ?? t,
        resolvedAt: state === "resolved" ? t : null,
      }).where(eq(alerts.id, alert.id));
      await safeQ(() => setOverride(db, coachId, key, "new"), undefined);
      return;
    }
    await setOverride(db, coachId, key, state);
    return;
  }

  if (parsed.kind === "message") {
    const conv = await db.query.conversations.findFirst({
      where: and(eq(conversations.id, parsed.conversationId), eq(conversations.trainerId, coachId)),
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    await setOverride(db, coachId, key, state);
    return;
  }

  if (!roster.healthIds.has(parsed.clientId)) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  await setOverride(db, coachId, key, state);
}
