import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import { sendInvitationEmail, sendClientCreatedEmail } from "@/lib/email";
import {
  trainerClientRelationships,
  clientInvitations,
  users,
  clientProfiles,
  userContactInfo,
  alerts,
  sleepSessions,
  glucoseReadings,
  hrvReadings,
  bodyMeasurements,
  supplementProtocols,
  protocolItems,
  adherenceLogs,
  dailyCheckins,
  coachNotes,
  bloodPressureReadings,
  workoutLogs,
  healthGoals,
  goalMilestones,
  goalCheckpoints,
  labResults,
  biomarkerValues,
  fastingLogs,
  mealLogs,
  activitySummaries,
  appointments,
  conversations,
  geneticProfiles,
  geneticMarkers,
  geneticPathwayScores,
  clinicalDocuments,
} from "@/server/db/schema";
import { eq, desc, and, sql, gte, lte, inArray, or, ilike, ne, notInArray, isNull } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function deriveName(firstName: string | null, lastName: string | null, email: string): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || email;
}

type ClientStatus = "stable" | "attention" | "critical";
function deriveStatus(healthScore: number, activeAlerts: number): ClientStatus {
  if (healthScore < 60 || activeAlerts >= 4) return "critical";
  if (healthScore < 75 || activeAlerts >= 2) return "attention";
  return "stable";
}

type ScoreTrend = "up" | "down" | "flat";
function deriveTrend(values: number[]): ScoreTrend {
  if (values.length < 2) return "flat";
  const recent = values.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const change = ((last - first) / Math.max(1, Math.abs(first))) * 100;
  if (Math.abs(change) < 2) return "flat";
  return change > 0 ? "up" : "down";
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Relationship guard ─────────────────────────────────────

async function verifyCoachClientRelationship(
  db: typeof import("@/server/db").db,
  coachId: string,
  clientId: string,
  userRole?: string,
) {
  // super_admin can access any client's data without a relationship
  if (userRole === "super_admin") return;

  const rel = await db.query.trainerClientRelationships.findFirst({
    where: and(
      eq(trainerClientRelationships.trainerId, coachId),
      eq(trainerClientRelationships.clientId, clientId),
      eq(trainerClientRelationships.status, "active"),
    ),
  });
  if (!rel) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active relationship with this client" });
  }
}

// ─── Shared client data fetcher ───────────────────────────────

// Helper: safely query tables that may not exist yet (e.g. biometric tables pre-migration)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

async function fetchClientData(db: typeof import("@/server/db").db, clientId: string, enrolledAt?: Date) {
  const [user, profile, alertRows, recentGlucose, recentSleep, recentHrv, recentWeight, recentCheckins, protocol, adherenceCount] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, clientId) }),
    db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, clientId) }),
    db.select({ count: sql<number>`count(*)` }).from(alerts).where(and(eq(alerts.clientId, clientId), eq(alerts.status, "active"))),
    safeQ(() => db.query.glucoseReadings.findMany({ where: eq(glucoseReadings.clientId, clientId), orderBy: desc(glucoseReadings.timestamp), limit: 7 }), []),
    safeQ(() => db.query.sleepSessions.findMany({ where: eq(sleepSessions.clientId, clientId), orderBy: desc(sleepSessions.date), limit: 7 }), []),
    safeQ(() => db.query.hrvReadings.findMany({ where: eq(hrvReadings.clientId, clientId), orderBy: desc(hrvReadings.timestamp), limit: 7 }), []),
    safeQ(() => db.query.bodyMeasurements.findMany({ where: eq(bodyMeasurements.clientId, clientId), orderBy: desc(bodyMeasurements.date), limit: 5 }), []),
    safeQ(() => db.query.dailyCheckins.findMany({ where: eq(dailyCheckins.clientId, clientId), orderBy: desc(dailyCheckins.date), limit: 14 }), []),
    safeQ(() => db.query.supplementProtocols.findFirst({
      where: and(eq(supplementProtocols.clientId, clientId), eq(supplementProtocols.status, "active")),
    }), undefined),
    safeQ(() => db.select({ count: sql<number>`count(*)` }).from(adherenceLogs).where(
      and(eq(adherenceLogs.clientId, clientId), gte(adherenceLogs.date, new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]))
    ), [{ count: 0 }]),
  ]);

  if (!user) return null;

  const activeAlerts = Number(alertRows[0]?.count ?? 0);
  const name = deriveName(user.firstName, user.lastName, user.email);
  const initials = getInitials(user.firstName, user.lastName, user.email);
  const tier = (profile?.tier ?? "tier3") as "tier1" | "tier2" | "tier3";

  // Compute health score from biometrics
  let healthScore = 75;
  const latestSleep = recentSleep[0];
  const latestGlucose = recentGlucose[0];
  const latestHrv = recentHrv[0];
  if (latestSleep?.score) healthScore += Math.min(10, Math.round((Number(latestSleep.score) - 50) / 5));
  if (latestGlucose?.valueMgdl) {
    const gv = Number(latestGlucose.valueMgdl);
    if (gv >= 70 && gv <= 100) healthScore += 10;
    else if (gv > 100 && gv <= 120) healthScore += 5;
  }
  if (latestHrv?.rmssd) {
    const hv = Number(latestHrv.rmssd);
    if (hv > 50) healthScore += 5;
    else if (hv > 30) healthScore += 2;
  }
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Glucose trend
  const glucoseValues = recentGlucose.map((g) => Number(g.valueMgdl)).reverse();
  const glucoseTrend = deriveTrend(glucoseValues);
  const avgGlucose = glucoseValues.length > 0 ? Math.round(glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length) : null;

  // Sleep data
  const sleepScores = recentSleep.map((s) => Number(s.score ?? 0)).reverse();
  const sleepHours = recentSleep.map((s) => Number(s.totalMinutes ?? 0) / 60).reverse();
  const sleepTrend = deriveTrend(sleepScores);
  const sleepScore = latestSleep?.score ? Number(latestSleep.score) : null;

  // HRV
  const hrvValues = recentHrv.map((h) => Number(h.rmssd)).reverse();
  const hrvTrend = deriveTrend(hrvValues);
  const hrv = latestHrv?.rmssd ? Number(latestHrv.rmssd) : null;

  // Weight
  const weightValues = recentWeight.map((w) => Number(w.weightLbs ?? 0)).reverse();
  const weight = weightValues.length > 0 ? weightValues[weightValues.length - 1] : null;
  const bodyFat = recentWeight[0]?.bodyFatPct ? Number(recentWeight[0].bodyFatPct) : null;

  // Adherence (percentage based on enrollment duration, capped at 30 days)
  const adherenceTotal = Number(adherenceCount[0]?.count ?? 0);
  const daysSinceEnrollment = enrolledAt
    ? Math.max(1, Math.floor((Date.now() - enrolledAt.getTime()) / 86400000))
    : 30;
  const adherenceDenominator = Math.min(daysSinceEnrollment, 30);
  const adherence = Math.min(100, Math.round((adherenceTotal / adherenceDenominator) * 100));

  // Check-in streak
  let checkInStreak = 0;
  const today = new Date();
  for (let i = 0; i < recentCheckins.length; i++) {
    const checkinDate = new Date(recentCheckins[i].date);
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (checkinDate.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
      checkInStreak++;
    } else break;
  }

  // Score trend from glucose (as proxy for overall health trend)
  const scoreTrend: ScoreTrend = glucoseTrend === "down" ? "up" : glucoseTrend === "up" ? "down" : "flat";

  // Status
  const status = deriveStatus(healthScore, activeAlerts);

  // Last active
  const lastActiveDate = recentCheckins[0]?.submittedAt ?? user.updatedAt ?? user.createdAt;
  const lastActive = formatRelativeTime(new Date(lastActiveDate));

  // Member since
  const memberSince = user.createdAt.toISOString().split("T")[0];

  return {
    id: clientId,
    name,
    initials,
    email: user.email,
    tier,
    healthScore,
    scoreTrend,
    activeAlerts,
    adherence,
    lastActive,
    lastActiveDate: lastActiveDate instanceof Date ? lastActiveDate.toISOString() : String(lastActiveDate),
    status,
    nextSession: null as string | null,
    memberSince,
    metrics: {
      avgGlucose,
      glucoseTrend,
      glucoseData: glucoseValues,
      sleepScore,
      sleepTrend,
      sleepData: sleepHours,
      hrv,
      hrvTrend: hrvTrend as ScoreTrend,
      weight,
      weightData: weightValues,
      bodyFat,
      adherence,
      checkInStreak,
    },
    protocol: protocol
      ? {
          id: protocol.id,
          name: `Protocol v${protocol.version}`,
          startDate: protocol.createdAt.toISOString().split("T")[0],
          duration: "12 weeks",
          progress: Math.min(100, Math.round((Date.now() - protocol.createdAt.getTime()) / (12 * 7 * 86400000) * 100)),
          goals: [] as string[],
          status: protocol.status as "active" | "paused" | "completed",
        }
      : {
          id: "none",
          name: "No Active Protocol",
          startDate: new Date().toISOString().split("T")[0],
          duration: "—",
          progress: 0,
          goals: [],
          status: "paused" as const,
        },
  };
}

// ─── Batched client data fetcher ─────────────────────────────
// Fetches data for multiple clients using bulk queries instead of per-client N+1

async function fetchClientDataBatch(db: typeof import("@/server/db").db, clientIds: string[], enrollmentDates?: Map<string, Date>) {
  if (clientIds.length === 0) return [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // 10 bulk queries instead of 10*N individual queries
  const [
    allUsers,
    allProfiles,
    alertCounts,
    recentGlucoseAll,
    recentSleepAll,
    recentHrvAll,
    recentWeightAll,
    recentCheckinsAll,
    activeProtocols,
    adherenceCounts,
  ] = await Promise.all([
    db.query.users.findMany({ where: inArray(users.id, clientIds) }),
    db.query.clientProfiles.findMany({ where: inArray(clientProfiles.userId, clientIds) }),
    db
      .select({ clientId: alerts.clientId, count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(inArray(alerts.clientId, clientIds), eq(alerts.status, "active")))
      .groupBy(alerts.clientId),
    safeQ(() => db.query.glucoseReadings.findMany({
      where: inArray(glucoseReadings.clientId, clientIds),
      orderBy: desc(glucoseReadings.timestamp),
      limit: clientIds.length * 7,
    }), []),
    safeQ(() => db.query.sleepSessions.findMany({
      where: inArray(sleepSessions.clientId, clientIds),
      orderBy: desc(sleepSessions.date),
      limit: clientIds.length * 7,
    }), []),
    safeQ(() => db.query.hrvReadings.findMany({
      where: inArray(hrvReadings.clientId, clientIds),
      orderBy: desc(hrvReadings.timestamp),
      limit: clientIds.length * 7,
    }), []),
    safeQ(() => db.query.bodyMeasurements.findMany({
      where: inArray(bodyMeasurements.clientId, clientIds),
      orderBy: desc(bodyMeasurements.date),
      limit: clientIds.length * 5,
    }), []),
    safeQ(() => db.query.dailyCheckins.findMany({
      where: inArray(dailyCheckins.clientId, clientIds),
      orderBy: desc(dailyCheckins.date),
      limit: clientIds.length * 14,
    }), []),
    safeQ(() => db.query.supplementProtocols.findMany({
      where: and(inArray(supplementProtocols.clientId, clientIds), eq(supplementProtocols.status, "active")),
    }), []),
    safeQ(() => db
      .select({ clientId: adherenceLogs.clientId, count: sql<number>`count(*)` })
      .from(adherenceLogs)
      .where(and(inArray(adherenceLogs.clientId, clientIds), gte(adherenceLogs.date, thirtyDaysAgo)))
      .groupBy(adherenceLogs.clientId), []),
  ]);

  // Build lookup maps
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
  const alertCountMap = new Map(alertCounts.map((a) => [a.clientId, Number(a.count)]));
  const protocolMap = new Map(activeProtocols.map((p) => [p.clientId, p]));
  const adherenceMap = new Map(adherenceCounts.map((a) => [a.clientId, Number(a.count)]));

  // Group per-client arrays (take first N per client from sorted results)
  function groupByClient<T extends { clientId: string }>(items: T[], limit: number): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const arr = map.get(item.clientId);
      if (!arr) {
        map.set(item.clientId, [item]);
      } else if (arr.length < limit) {
        arr.push(item);
      }
    }
    return map;
  }

  const glucoseByClient = groupByClient(recentGlucoseAll, 7);
  const sleepByClient = groupByClient(recentSleepAll, 7);
  const hrvByClient = groupByClient(recentHrvAll, 7);
  const weightByClient = groupByClient(recentWeightAll, 5);
  const checkinsByClient = groupByClient(recentCheckinsAll, 14);

  // Process each client using the pre-fetched data
  const results = clientIds.map((clientId) => {
    const user = userMap.get(clientId);
    if (!user) return null;

    const profile = profileMap.get(clientId);
    const activeAlerts = alertCountMap.get(clientId) ?? 0;
    const recentGlucose = glucoseByClient.get(clientId) ?? [];
    const recentSleep = sleepByClient.get(clientId) ?? [];
    const recentHrv = hrvByClient.get(clientId) ?? [];
    const recentWeight = weightByClient.get(clientId) ?? [];
    const recentCheckins = checkinsByClient.get(clientId) ?? [];
    const protocol = protocolMap.get(clientId) ?? null;
    const adherenceTotal = adherenceMap.get(clientId) ?? 0;

    const name = deriveName(user.firstName, user.lastName, user.email);
    const initials = getInitials(user.firstName, user.lastName, user.email);
    const tier = (profile?.tier ?? "tier3") as "tier1" | "tier2" | "tier3";

    // Compute health score from biometrics
    let healthScore = 75;
    const latestSleep = recentSleep[0];
    const latestGlucose = recentGlucose[0];
    const latestHrv = recentHrv[0];
    if (latestSleep?.score) healthScore += Math.min(10, Math.round((Number(latestSleep.score) - 50) / 5));
    if (latestGlucose?.valueMgdl) {
      const gv = Number(latestGlucose.valueMgdl);
      if (gv >= 70 && gv <= 100) healthScore += 10;
      else if (gv > 100 && gv <= 120) healthScore += 5;
    }
    if (latestHrv?.rmssd) {
      const hv = Number(latestHrv.rmssd);
      if (hv > 50) healthScore += 5;
      else if (hv > 30) healthScore += 2;
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Glucose trend
    const glucoseValues = recentGlucose.map((g) => Number(g.valueMgdl)).reverse();
    const glucoseTrend = deriveTrend(glucoseValues);
    const avgGlucose = glucoseValues.length > 0 ? Math.round(glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length) : null;

    // Sleep data
    const sleepScores = recentSleep.map((s) => Number(s.score ?? 0)).reverse();
    const sleepHours = recentSleep.map((s) => Number(s.totalMinutes ?? 0) / 60).reverse();
    const sleepTrend = deriveTrend(sleepScores);
    const sleepScore = latestSleep?.score ? Number(latestSleep.score) : null;

    // HRV
    const hrvValues = recentHrv.map((h) => Number(h.rmssd)).reverse();
    const hrvTrend = deriveTrend(hrvValues);
    const hrv = latestHrv?.rmssd ? Number(latestHrv.rmssd) : null;

    // Weight
    const weightValues = recentWeight.map((w) => Number(w.weightLbs ?? 0)).reverse();
    const weight = weightValues.length > 0 ? weightValues[weightValues.length - 1] : null;
    const bodyFat = recentWeight[0]?.bodyFatPct ? Number(recentWeight[0].bodyFatPct) : null;

    // Adherence (percentage based on enrollment duration, capped at 30 days)
    const enrolledAt = enrollmentDates?.get(clientId);
    const daysSinceEnrollment = enrolledAt
      ? Math.max(1, Math.floor((Date.now() - enrolledAt.getTime()) / 86400000))
      : 30;
    const adherenceDenominator = Math.min(daysSinceEnrollment, 30);
    const adherence = Math.min(100, Math.round((adherenceTotal / adherenceDenominator) * 100));

    // Check-in streak
    let checkInStreak = 0;
    const today = new Date();
    for (let i = 0; i < recentCheckins.length; i++) {
      const checkinDate = new Date(recentCheckins[i].date);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (checkinDate.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
        checkInStreak++;
      } else break;
    }

    // Score trend from glucose (as proxy for overall health trend)
    const scoreTrend: ScoreTrend = glucoseTrend === "down" ? "up" : glucoseTrend === "up" ? "down" : "flat";

    // Status
    const status = deriveStatus(healthScore, activeAlerts);

    // Last active
    const lastActiveDate = recentCheckins[0]?.submittedAt ?? user.updatedAt ?? user.createdAt;
    const lastActive = formatRelativeTime(new Date(lastActiveDate));

    // Member since
    const memberSince = user.createdAt.toISOString().split("T")[0];

    return {
      id: clientId,
      name,
      initials,
      email: user.email,
      tier,
      healthScore,
      scoreTrend,
      activeAlerts,
      adherence,
      lastActive,
      lastActiveDate: lastActiveDate instanceof Date ? lastActiveDate.toISOString() : String(lastActiveDate),
      status,
      nextSession: null as string | null,
      memberSince,
      metrics: {
        avgGlucose,
        glucoseTrend,
        glucoseData: glucoseValues,
        sleepScore,
        sleepTrend,
        sleepData: sleepHours,
        hrv,
        hrvTrend: hrvTrend as ScoreTrend,
        weight,
        weightData: weightValues,
        bodyFat,
        adherence,
        checkInStreak,
      },
      protocol: protocol
        ? {
            id: protocol.id,
            name: `Protocol v${protocol.version}`,
            startDate: protocol.createdAt.toISOString().split("T")[0],
            duration: "12 weeks",
            progress: Math.min(100, Math.round((Date.now() - protocol.createdAt.getTime()) / (12 * 7 * 86400000) * 100)),
            goals: [] as string[],
            status: protocol.status as "active" | "paused" | "completed",
          }
        : {
            id: "none",
            name: "No Active Protocol",
            startDate: new Date().toISOString().split("T")[0],
            duration: "—",
            progress: 0,
            goals: [],
            status: "paused" as const,
          },
    };
  });

  return results.filter((c): c is NonNullable<typeof c> => c !== null);
}

// ─── Router ───────────────────────────────────────────────────

export const coachClientsRouter = router({
  // List all trainer's clients with summary
  list: trainerProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tier: z.enum(["tier1", "tier2", "tier3", "all"]).optional(),
        status: z.enum(["stable", "attention", "critical", "all"]).optional(),
        sortBy: z.enum(["name", "healthScore", "alerts", "lastActive", "adherence"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // Get active client relationships
      // super_admin sees ALL active relationships, not just their own
      const relationships = await ctx.db.query.trainerClientRelationships.findMany({
        where: ctx.userRole === "super_admin"
          ? eq(trainerClientRelationships.status, "active")
          : and(
              eq(trainerClientRelationships.trainerId, trainerId),
              eq(trainerClientRelationships.status, "active")
            ),
      });

      const clientIds = relationships.map((r) => r.clientId);
      if (clientIds.length === 0) return [];

      // Fetch all client data using batched queries (eliminates N+1)
      const enrollmentDates = new Map(relationships.map((r) => [r.clientId, r.startedAt]));
      let clients = await fetchClientDataBatch(ctx.db, clientIds, enrollmentDates);

      // Apply filters
      if (input?.search) {
        const q = input.search.toLowerCase();
        clients = clients.filter(
          (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        );
      }
      if (input?.tier && input.tier !== "all") {
        clients = clients.filter((c) => c.tier === input.tier);
      }
      if (input?.status && input.status !== "all") {
        clients = clients.filter((c) => c.status === input.status);
      }

      // Sort
      const sortBy = input?.sortBy ?? "name";
      const sortOrder = input?.sortOrder ?? "asc";
      const mult = sortOrder === "asc" ? 1 : -1;

      clients.sort((a, b) => {
        switch (sortBy) {
          case "healthScore": return (a.healthScore - b.healthScore) * mult;
          case "alerts": return (a.activeAlerts - b.activeAlerts) * mult;
          case "adherence": return (a.adherence - b.adherence) * mult;
          case "lastActive": return a.lastActiveDate.localeCompare(b.lastActiveDate) * mult;
          default: return a.name.localeCompare(b.name) * mult;
        }
      });

      return clients;
    }),

  // Get detailed view of a single client
  getDetail: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const relationship = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.clientId, input.clientId),
          eq(trainerClientRelationships.status, "active"),
        ),
      });
      const detail = await fetchClientData(ctx.db, input.clientId, relationship?.startedAt);
      if (!detail) return null;

      // Also fetch alerts list and recent activity
      const [clientAlerts, recentCheckins] = await Promise.all([
        ctx.db.query.alerts.findMany({
          where: eq(alerts.clientId, input.clientId),
          orderBy: desc(alerts.createdAt),
          limit: 10,
        }),
        safeQ(() => ctx.db.query.dailyCheckins.findMany({
          where: eq(dailyCheckins.clientId, input.clientId),
          orderBy: desc(dailyCheckins.date),
          limit: 8,
        }), []),
      ]);

      // Map alerts to the expected shape
      const mappedAlerts = clientAlerts.map((a) => ({
        id: a.id,
        clientId: a.clientId,
        priority: (a.priority ?? "info") as "urgent" | "action" | "info",
        category: (a.type ?? "protocol") as string,
        message: a.message ?? a.title,
        timestamp: a.createdAt.toISOString(),
        resolved: a.status !== "active",
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
      }));

      // Build activity feed from check-ins + alerts
      const recentActivity = [
        ...recentCheckins.map((c) => ({
          id: c.id,
          clientId: input.clientId,
          type: "check-in" as const,
          label: `Daily check-in completed${c.trainingType ? ` (${c.trainingType})` : ""}`,
          timestamp: (c.submittedAt ?? new Date(c.date)).toISOString(),
        })),
        ...clientAlerts.slice(0, 4).map((a) => ({
          id: a.id,
          clientId: input.clientId,
          type: "alert" as const,
          label: a.title,
          timestamp: a.createdAt.toISOString(),
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

      return {
        ...detail,
        alerts: mappedAlerts,
        recentActivity,
      };
    }),

  // Get roster stats
  getStats: trainerProcedure.query(async ({ ctx }) => {
    const trainerId = ctx.dbUserId;

    // super_admin sees all active relationships
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: ctx.userRole === "super_admin"
        ? eq(trainerClientRelationships.status, "active")
        : and(
            eq(trainerClientRelationships.trainerId, trainerId),
            eq(trainerClientRelationships.status, "active")
          ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) {
      return {
        totalClients: 0, tier1Count: 0, tier2Count: 0, tier3Count: 0,
        criticalCount: 0, attentionCount: 0, stableCount: 0,
        avgHealthScore: 0, avgAdherence: 0, totalAlerts: 0,
      };
    }

    const enrollmentDates = new Map(relationships.map((r) => [r.clientId, r.startedAt]));
    const clients = await fetchClientDataBatch(ctx.db, clientIds, enrollmentDates);

    return {
      totalClients: clients.length,
      tier1Count: clients.filter((c) => c.tier === "tier1").length,
      tier2Count: clients.filter((c) => c.tier === "tier2").length,
      tier3Count: clients.filter((c) => c.tier === "tier3").length,
      criticalCount: clients.filter((c) => c.status === "critical").length,
      attentionCount: clients.filter((c) => c.status === "attention").length,
      stableCount: clients.filter((c) => c.status === "stable").length,
      avgHealthScore: clients.length > 0
        ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length)
        : 0,
      avgAdherence: clients.length > 0
        ? Math.round(clients.reduce((s, c) => s + c.adherence, 0) / clients.length)
        : 0,
      totalAlerts: clients.reduce((s, c) => s + c.activeAlerts, 0),
    };
  }),

  // Resolve an alert (real DB mutation)
  resolveAlert: trainerProcedure
    .input(z.object({ clientId: z.string(), alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const [updated] = await ctx.db
        .update(alerts)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(and(eq(alerts.id, input.alertId), eq(alerts.clientId, input.clientId)))
        .returning();
      return updated ?? null;
    }),

  // Note mutations — persisted to coach_notes table
  addNote: trainerProcedure
    .input(z.object({ clientId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const [note] = await ctx.db
        .insert(coachNotes)
        .values({
          clientId: input.clientId,
          coachId: ctx.dbUserId,
          content: input.content,
        })
        .returning();
      return note;
    }),

  getNotes: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      return ctx.db.query.coachNotes.findMany({
        where: eq(coachNotes.clientId, input.clientId),
        orderBy: [desc(coachNotes.pinned), desc(coachNotes.createdAt)],
      });
    }),

  pinNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      // Toggle pin status — only allow if the note belongs to this coach
      const existing = await ctx.db.query.coachNotes.findFirst({
        where: and(
          eq(coachNotes.id, input.noteId),
          eq(coachNotes.clientId, input.clientId),
          eq(coachNotes.coachId, ctx.dbUserId),
        ),
      });
      if (!existing) return null;
      const [updated] = await ctx.db
        .update(coachNotes)
        .set({ pinned: !existing.pinned, updatedAt: new Date() })
        .where(eq(coachNotes.id, input.noteId))
        .returning();
      return updated;
    }),

  deleteNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      // Only allow deleting notes owned by this coach
      const deleted = await ctx.db
        .delete(coachNotes)
        .where(and(
          eq(coachNotes.id, input.noteId),
          eq(coachNotes.clientId, input.clientId),
          eq(coachNotes.coachId, ctx.dbUserId),
        ))
        .returning();
      return deleted.length > 0;
    }),

  // Update protocol with notes and priority level
  updateProtocol: trainerProcedure
    .input(
      z.object({
        clientId: z.string(),
        notes: z.string().min(1),
        priority: z.enum(["Normal", "High — Review within 24h", "Urgent — Immediate attention"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      // Find the active protocol for this client
      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, input.clientId),
          eq(supplementProtocols.status, "active")
        ),
      });

      if (!protocol) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active protocol found for this client" });
      }

      // Create a coach note to record the protocol adjustment
      // Using the coach_notes table to store protocol adjustment records
      const [note] = await ctx.db
        .insert(coachNotes)
        .values({
          clientId: input.clientId,
          coachId: ctx.dbUserId,
          content: `[PROTOCOL ADJUSTMENT] Priority: ${input.priority}\n\n${input.notes}`,
        })
        .returning();

      return {
        success: true,
        protocolId: protocol.id,
        noteId: note.id,
        message: "Protocol adjustment saved successfully",
      };
    }),

  // ─── Extended client health data ──────────────────────────────
  // Returns deep health data for all categories, used by the tabbed client detail view
  getClientHealthData: trainerProcedure
    .input(
      z.object({
        clientId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const end = input.endDate ?? new Date().toISOString().split("T")[0];
      const start = input.startDate ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      // Helper: safely query tables that may not exist yet in the database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch { return fallback; }
      };

      const [
        glucose, sleep, hrvData, bpData, weightData, workouts, activity,
        goals, labs, fasting, meals, protocolData, upcoming, checkins,
        geneticProfile, clinicalDocsData,
      ] = await Promise.all([
        // Glucose
        safe(() => ctx.db.query.glucoseReadings.findMany({
          where: and(eq(glucoseReadings.clientId, input.clientId), gte(glucoseReadings.timestamp, new Date(start))),
          orderBy: desc(glucoseReadings.timestamp),
          limit: 200,
        }), []),
        // Sleep
        safe(() => ctx.db.query.sleepSessions.findMany({
          where: and(eq(sleepSessions.clientId, input.clientId), gte(sleepSessions.date, start), lte(sleepSessions.date, end)),
          orderBy: desc(sleepSessions.date),
        }), []),
        // HRV
        safe(() => ctx.db.query.hrvReadings.findMany({
          where: and(eq(hrvReadings.clientId, input.clientId), gte(hrvReadings.timestamp, new Date(start))),
          orderBy: desc(hrvReadings.timestamp),
          limit: 100,
        }), []),
        // Blood Pressure
        safe(() => ctx.db.query.bloodPressureReadings.findMany({
          where: and(eq(bloodPressureReadings.clientId, input.clientId), gte(bloodPressureReadings.date, start), lte(bloodPressureReadings.date, end)),
          orderBy: desc(bloodPressureReadings.date),
        }), []),
        // Body Measurements
        safe(() => ctx.db.query.bodyMeasurements.findMany({
          where: and(eq(bodyMeasurements.clientId, input.clientId), gte(bodyMeasurements.date, start), lte(bodyMeasurements.date, end)),
          orderBy: desc(bodyMeasurements.date),
        }), []),
        // Workouts
        safe(() => ctx.db.query.workoutLogs.findMany({
          where: and(eq(workoutLogs.clientId, input.clientId), gte(workoutLogs.date, start), lte(workoutLogs.date, end)),
          orderBy: desc(workoutLogs.date),
        }), []),
        // Activity Summaries
        safe(() => ctx.db.query.activitySummaries.findMany({
          where: and(eq(activitySummaries.clientId, input.clientId), gte(activitySummaries.date, start), lte(activitySummaries.date, end)),
          orderBy: desc(activitySummaries.date),
        }), []),
        // Health Goals (all active)
        safe(() => ctx.db.query.healthGoals.findMany({
          where: and(eq(healthGoals.clientId, input.clientId)),
          orderBy: desc(healthGoals.createdAt),
        }), []),
        // Lab Results
        safe(() => ctx.db.query.labResults.findMany({
          where: eq(labResults.clientId, input.clientId),
          orderBy: desc(labResults.receivedAt),
          limit: 10,
        }), []),
        // Fasting logs
        safe(() => ctx.db.query.fastingLogs.findMany({
          where: and(eq(fastingLogs.clientId, input.clientId), gte(fastingLogs.startedAt, new Date(start))),
          orderBy: desc(fastingLogs.startedAt),
        }), []),
        // Meal logs
        safe(() => ctx.db.query.mealLogs.findMany({
          where: and(eq(mealLogs.clientId, input.clientId), gte(mealLogs.date, start), lte(mealLogs.date, end)),
          orderBy: desc(mealLogs.date),
          limit: 50,
        }), []),
        // Active supplement protocol with items
        safe(() => ctx.db.query.supplementProtocols.findFirst({
          where: and(eq(supplementProtocols.clientId, input.clientId), eq(supplementProtocols.status, "active")),
        }), undefined),
        // Upcoming appointments
        safe(() => ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.clientId, input.clientId),
            eq(appointments.coachId, ctx.dbUserId),
            gte(appointments.date, new Date().toISOString().split("T")[0]),
          ),
          orderBy: appointments.date,
          limit: 5,
        }), []),
        // Daily check-ins
        safe(() => ctx.db.query.dailyCheckins.findMany({
          where: and(eq(dailyCheckins.clientId, input.clientId), gte(dailyCheckins.date, start), lte(dailyCheckins.date, end)),
          orderBy: desc(dailyCheckins.date),
        }), []),
        // Genetic profile (latest non-error)
        safe(() => ctx.db.query.geneticProfiles.findFirst({
          where: and(
            eq(geneticProfiles.clientId, input.clientId),
            ne(geneticProfiles.status, "error"),
          ),
          orderBy: desc(geneticProfiles.createdAt),
        }), undefined),
        // Clinical documents (DEXA, gut biome, medical records)
        safe(() => ctx.db.query.clinicalDocuments.findMany({
          where: eq(clinicalDocuments.clientId, input.clientId),
          orderBy: desc(clinicalDocuments.reportDate),
          limit: 20,
        }), []),
      ]);

      // Fetch protocol items if protocol exists
      let supplements: typeof protocolItems.$inferSelect[] = [];
      if (protocolData) {
        supplements = await safe(() => ctx.db.query.protocolItems.findMany({
          where: eq(protocolItems.protocolId, protocolData.id),
        }), []);
      }

      // Fetch biomarker values for labs
      let biomarkers: typeof biomarkerValues.$inferSelect[] = [];
      if (labs.length > 0) {
        const labIds = labs.map((l) => l.id);
        biomarkers = await safe(() => ctx.db.query.biomarkerValues.findMany({
          where: inArray(biomarkerValues.resultId, labIds),
        }), []);
      }

      // Fetch goal milestones + checkpoints for active goals
      const activeGoals = goals.filter((g) => g.status === "active");
      let allMilestones: typeof goalMilestones.$inferSelect[] = [];
      let allCheckpoints: typeof goalCheckpoints.$inferSelect[] = [];
      if (activeGoals.length > 0) {
        const goalIds = activeGoals.map((g) => g.id);
        [allMilestones, allCheckpoints] = await Promise.all([
          safe(() => ctx.db.query.goalMilestones.findMany({ where: inArray(goalMilestones.goalId, goalIds) }), []),
          safe(() => ctx.db.query.goalCheckpoints.findMany({ where: inArray(goalCheckpoints.goalId, goalIds), orderBy: desc(goalCheckpoints.createdAt) }), []),
        ]);
      }

      // Fetch genetic markers + pathway scores if profile exists
      let genMarkers: typeof geneticMarkers.$inferSelect[] = [];
      let genPathways: typeof geneticPathwayScores.$inferSelect[] = [];
      if (geneticProfile) {
        [genMarkers, genPathways] = await Promise.all([
          safe(() => ctx.db.query.geneticMarkers.findMany({
            where: eq(geneticMarkers.profileId, geneticProfile.id),
            limit: 100,
          }), []),
          safe(() => ctx.db.query.geneticPathwayScores.findMany({
            where: eq(geneticPathwayScores.profileId, geneticProfile.id),
          }), []),
        ]);
      }

      // Check for existing conversation
      const conversation = await safe(() => ctx.db.query.conversations.findFirst({
        where: and(eq(conversations.trainerId, ctx.dbUserId), eq(conversations.clientId, input.clientId)),
      }), undefined);

      return {
        glucose: glucose.map((g) => ({ date: g.timestamp.toISOString(), value: Number(g.valueMgdl), source: g.source })),
        sleep: sleep.map((s) => ({
          date: s.date,
          totalMinutes: s.totalMinutes,
          score: s.score,
          deepMinutes: s.deepMinutes,
          remMinutes: s.remMinutes,
          lightMinutes: s.lightMinutes,
          awakeMinutes: s.awakeMinutes,
        })),
        hrv: hrvData.map((h) => ({ date: h.timestamp.toISOString(), rmssd: Number(h.rmssd), source: h.source })),
        bloodPressure: bpData.map((bp) => ({
          date: bp.date,
          systolic: bp.systolic,
          diastolic: bp.diastolic,
          pulse: bp.pulse,
          notes: bp.notes,
        })),
        bodyMeasurements: weightData.map((w) => ({
          date: w.date,
          weightLbs: w.weightLbs ? Number(w.weightLbs) : null,
          bodyFatPct: w.bodyFatPct ? Number(w.bodyFatPct) : null,
          waistInches: w.waistInches ? Number(w.waistInches) : null,
        })),
        workouts: workouts.map((w) => ({
          id: w.id,
          date: w.date,
          exercises: w.exercisesCompleted,
          notes: w.notes,
        })),
        activity: activity.map((a) => ({
          date: a.date,
          exerciseMinutes: a.exerciseMinutes,
          caloriesActive: a.caloriesActive,
          steps: a.steps,
        })),
        goals: goals.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          status: g.status,
          targetValue: g.targetValue,
          targetUnit: g.targetUnit,
          targetDirection: g.targetDirection,
          currentValue: g.currentValue,
          startValue: g.startValue,
          startDate: g.startDate,
          targetDate: g.targetDate,
          milestones: allMilestones.filter((m) => m.goalId === g.id).map((m) => ({
            label: m.label,
            targetValue: m.targetValue,
            reached: !!m.reachedAt,
          })),
          checkpoints: allCheckpoints.filter((c) => c.goalId === g.id).slice(0, 10).map((c) => ({
            date: c.createdAt.toISOString(),
            value: c.value,
            note: c.note,
          })),
        })),
        labs: labs.map((l) => ({
          id: l.id,
          receivedAt: l.receivedAt?.toISOString() ?? new Date().toISOString(),
          status: l.ocrStatus,
          biomarkers: biomarkers.filter((b) => b.resultId === l.id).map((b) => ({
            code: b.biomarkerCode,
            value: b.value,
            unit: b.unit,
            refLow: b.refLow,
            refHigh: b.refHigh,
            status: b.status,
          })),
        })),
        fasting: fasting.map((f) => ({
          date: f.date,
          startedAt: f.startedAt?.toISOString() ?? null,
          endedAt: f.endedAt?.toISOString() ?? null,
          completed: f.completed,
        })),
        nutrition: {
          recentMeals: meals.map((m) => ({
            date: m.date,
            mealType: m.mealType,
            calories: m.totalCalories,
            protein: m.totalProtein,
            carbs: m.totalCarbs,
            fat: m.totalFat,
          })),
        },
        supplements: supplements.map((s) => ({
          name: s.name,
          dosage: s.dosage,
          frequency: s.frequency,
          timeOfDay: s.timeOfDay,
          notes: s.coachNotes,
        })),
        checkins: checkins.map((c) => ({
          date: c.date,
          mood: c.mood,
          energy: c.energy,
          stress: c.stress,
          sleepQuality: c.sleepQuality,
          trainingType: c.trainingType,
        })),
        upcomingAppointments: upcoming.map((a) => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          sessionType: a.sessionType,
          meetingType: a.meetingType,
          status: a.status,
          meetingLink: a.meetingLink ?? null,
        })),
        genetics: {
          profile: geneticProfile
            ? {
                id: geneticProfile.id,
                status: geneticProfile.status,
                uploadType: geneticProfile.uploadType,
                createdAt: geneticProfile.createdAt.toISOString(),
              }
            : null,
          markers: genMarkers.map((m) => ({
            gene: m.gene,
            rsId: m.rsId,
            mutation: m.mutation,
            pathway: m.pathway,
            function: m.function,
            clinicalPriority: m.clinicalPriority,
            symptoms: m.symptoms,
            supplementProtocol: m.supplementProtocol,
            dietStrategy: m.dietStrategy,
            lifestyleStrategy: m.lifestyleStrategy,
          })),
          pathways: genPathways.map((p) => ({
            pathway: p.pathway,
            genesAffected: p.genesAffected,
            genesInPathway: p.genesInPathway,
            homozygousCount: p.homozygousCount,
            heterozygousCount: p.heterozygousCount,
            priorityLevel: p.priorityLevel,
          })),
        },
        clinicalDocs: clinicalDocsData.map((d) => ({
          id: d.id,
          docType: d.docType,
          title: d.title,
          providerName: d.providerName,
          reportDate: d.reportDate,
          status: d.status,
          parsedData: d.parsedData,
          createdAt: d.createdAt.toISOString(),
        })),
        conversationId: conversation?.id ?? null,
      };
    }),

  // ─── Client Assignment ────────────────────────────────────────

  /**
   * Search for users to add as clients.
   * Returns users with role "client" who are NOT already assigned to this trainer.
   */
  searchUsers: trainerProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;
      const q = `%${input.query}%`;

      // Get IDs of clients already assigned to this trainer (active or pending)
      const existingRels = await ctx.db.query.trainerClientRelationships.findMany({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.status, "active"),
        ),
      });
      const existingClientIds = existingRels.map((r) => r.clientId);

      // Search users by email, first name, or last name
      const conditions = [
        eq(users.role, "client"),
        ne(users.id, trainerId),
        or(
          ilike(users.email, q),
          ilike(users.firstName, q),
          ilike(users.lastName, q),
        ),
      ];

      // Exclude already-assigned clients
      if (existingClientIds.length > 0) {
        conditions.push(notInArray(users.id, existingClientIds));
      }

      const results = await ctx.db.query.users.findMany({
        where: and(...conditions),
        limit: 20,
      });

      return results.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      }));
    }),

  /**
   * Add (assign) an existing user as a client.
   * Creates a trainerClientRelationships row and ensures a clientProfile exists.
   */
  addClient: trainerProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      tier: z.enum(["tier1", "tier2", "tier3"]).optional().default("tier3"),
    }))
    .mutation(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // Verify user exists
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientId),
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Verify user has the "client" role — prevent assigning trainers or admins as clients
      if (user.role !== "client") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot add a user with role "${user.role}" as a client. Only users with the "client" role can be assigned.`,
        });
      }

      // Check if relationship already exists
      const existing = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.clientId, input.clientId),
          eq(trainerClientRelationships.status, "active"),
        ),
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Client is already assigned to you" });
      }

      // Check for inactive relationship and reactivate, or create new
      const inactive = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.clientId, input.clientId),
          eq(trainerClientRelationships.status, "inactive"),
        ),
      });

      if (inactive) {
        await ctx.db.update(trainerClientRelationships)
          .set({ status: "active", startedAt: new Date() })
          .where(eq(trainerClientRelationships.id, inactive.id));
      } else {
        await ctx.db.insert(trainerClientRelationships).values({
          trainerId,
          clientId: input.clientId,
          status: "active",
        });
      }

      // Ensure client profile exists with selected tier
      const profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, input.clientId),
      });
      if (profile) {
        await ctx.db.update(clientProfiles)
          .set({ tier: input.tier })
          .where(eq(clientProfiles.userId, input.clientId));
      } else {
        await ctx.db.insert(clientProfiles).values({
          userId: input.clientId,
          tier: input.tier,
        });
      }

      // If user was invited by email, mark invitation as accepted
      try {
        await ctx.db.update(clientInvitations)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(and(
            eq(clientInvitations.trainerId, trainerId),
            ilike(clientInvitations.email, user.email),
            eq(clientInvitations.status, "pending"),
          ));
      } catch { /* table may not exist yet */ }

      return { success: true, clientId: input.clientId };
    }),

  /**
   * Remove (unassign) a client — sets relationship to inactive.
   */
  removeClient: trainerProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      const rel = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.clientId, input.clientId),
          eq(trainerClientRelationships.status, "active"),
        ),
      });

      if (!rel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active relationship with this client" });
      }

      await ctx.db.update(trainerClientRelationships)
        .set({ status: "inactive" })
        .where(eq(trainerClientRelationships.id, rel.id));

      return { success: true };
    }),

  /**
   * Update a client's tier (Premium, Standard, Basic).
   */
  updateTier: trainerProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      tier: z.enum(["tier1", "tier2", "tier3"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const existing = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, input.clientId),
      });

      if (existing) {
        await ctx.db.update(clientProfiles)
          .set({ tier: input.tier })
          .where(eq(clientProfiles.userId, input.clientId));
      } else {
        await ctx.db.insert(clientProfiles).values({
          userId: input.clientId,
          tier: input.tier,
        });
      }

      return { success: true };
    }),

  /**
   * Invite a client by email — creates a pending invitation.
   * If the user already exists in the system, suggests using addClient instead.
   */
  inviteClient: trainerProcedure
    .input(z.object({
      email: z.string().email(),
      tier: z.enum(["tier1", "tier2", "tier3"]).optional().default("tier3"),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: ilike(users.email, input.email),
      });
      if (existingUser) {
        return {
          success: false,
          existingUserId: existingUser.id,
          message: "User already exists — use 'Add Client' to assign them directly.",
        };
      }

      // Check for duplicate pending invitation
      const existingInvite = await ctx.db.query.clientInvitations.findFirst({
        where: and(
          eq(clientInvitations.trainerId, trainerId),
          ilike(clientInvitations.email, input.email),
          eq(clientInvitations.status, "pending"),
        ),
      });
      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation is already pending for this email.",
        });
      }

      // Create invitation (expires in 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [invite] = await ctx.db.insert(clientInvitations).values({
        trainerId,
        email: input.email.toLowerCase(),
        tier: input.tier,
        note: input.note ?? null,
        expiresAt,
      }).returning();

      // Send invitation email
      try {
        const trainer = await ctx.db.query.users.findFirst({
          where: eq(users.id, trainerId),
        });
        const trainerName = trainer
          ? `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email
          : "Your Coach";

        await sendInvitationEmail({
          to: input.email.toLowerCase(),
          trainerName,
          note: input.note,
        });
      } catch (emailErr) {
        // Don't fail the invitation if email fails — record is already created
        console.error("Failed to send invitation email:", emailErr);
      }

      return { success: true, invitationId: invite.id };
    }),

  /**
   * List pending invitations for this trainer.
   */
  listInvitations: trainerProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.query.clientInvitations.findMany({
      where: eq(clientInvitations.trainerId, ctx.dbUserId),
      orderBy: desc(clientInvitations.createdAt),
    });
    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      status: inv.status,
      tier: inv.tier,
      note: inv.note,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt?.toISOString() ?? null,
    }));
  }),

  /**
   * Cancel a pending invitation.
   */
  cancelInvitation: trainerProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(clientInvitations)
        .set({ status: "cancelled" })
        .where(and(
          eq(clientInvitations.id, input.invitationId),
          eq(clientInvitations.trainerId, ctx.dbUserId),
          eq(clientInvitations.status, "pending"),
        ));
      return { success: true };
    }),

  /**
   * Create a new client stub profile.
   * Creates a user with a pending clerkId, client profile, contact info,
   * and trainer-client relationship. Sends a welcome email.
   */
  createClient: trainerProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(), // ISO date string
      gender: z.string().optional(),
      tier: z.enum(["tier1", "tier2", "tier3"]).optional().default("tier3"),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // Check if a user already exists with this email
      const existingUser = await ctx.db.query.users.findFirst({
        where: ilike(users.email, input.email),
      });
      if (existingUser) {
        return {
          success: false,
          existingUserId: existingUser.id,
          message: "A user with this email already exists. Use 'Search Users' to assign them instead.",
        };
      }

      // Create stub user with a pending clerkId (will be merged on Clerk signup)
      const pendingClerkId = `pending-${randomUUID()}`;

      const [newUser] = await ctx.db.insert(users).values({
        clerkId: pendingClerkId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: "client",
        status: "onboarding",
      }).returning();

      if (!newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create client user." });
      }

      // Create client profile
      await ctx.db.insert(clientProfiles).values({
        userId: newUser.id,
        tier: input.tier,
        dateOfBirth: input.dateOfBirth || null,
        gender: input.gender || null,
      });

      // Create contact info if phone provided
      if (input.phone) {
        await ctx.db.insert(userContactInfo).values({
          userId: newUser.id,
          phone: input.phone,
        });
      }

      // Create trainer-client relationship
      await ctx.db.insert(trainerClientRelationships).values({
        trainerId,
        clientId: newUser.id,
        status: "active",
      });

      // Also create a pending invitation record for tracking
      await ctx.db.insert(clientInvitations).values({
        trainerId,
        email: input.email.toLowerCase(),
        tier: input.tier,
        note: input.note ?? null,
        status: "pending",
      });

      // Send welcome email
      try {
        const trainer = await ctx.db.query.users.findFirst({
          where: eq(users.id, trainerId),
        });
        const trainerName = trainer
          ? `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email
          : "Your Coach";

        await sendClientCreatedEmail({
          to: input.email.toLowerCase(),
          clientName: input.firstName,
          trainerName,
        });
      } catch (emailErr) {
        console.error("Failed to send client created email:", emailErr);
      }

      return { success: true, clientId: newUser.id };
    }),
});
