import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  trainerClientRelationships,
  users,
  clientProfiles,
  alerts,
  sleepSessions,
  glucoseReadings,
  hrvReadings,
  bodyMeasurements,
  supplementProtocols,
  adherenceLogs,
  dailyCheckins,
  coachNotes,
} from "@/server/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";

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

// ─── Shared client data fetcher ───────────────────────────────

async function fetchClientData(db: typeof import("@/server/db").db, clientId: string) {
  const [user, profile, alertRows, recentGlucose, recentSleep, recentHrv, recentWeight, recentCheckins, protocol, adherenceCount] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, clientId) }),
    db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, clientId) }),
    db.select({ count: sql<number>`count(*)` }).from(alerts).where(and(eq(alerts.clientId, clientId), eq(alerts.status, "active"))),
    db.query.glucoseReadings.findMany({ where: eq(glucoseReadings.clientId, clientId), orderBy: desc(glucoseReadings.timestamp), limit: 7 }),
    db.query.sleepSessions.findMany({ where: eq(sleepSessions.clientId, clientId), orderBy: desc(sleepSessions.date), limit: 7 }),
    db.query.hrvReadings.findMany({ where: eq(hrvReadings.clientId, clientId), orderBy: desc(hrvReadings.timestamp), limit: 7 }),
    db.query.bodyMeasurements.findMany({ where: eq(bodyMeasurements.clientId, clientId), orderBy: desc(bodyMeasurements.date), limit: 5 }),
    db.query.dailyCheckins.findMany({ where: eq(dailyCheckins.clientId, clientId), orderBy: desc(dailyCheckins.date), limit: 14 }),
    db.query.supplementProtocols.findFirst({
      where: and(eq(supplementProtocols.clientId, clientId), eq(supplementProtocols.status, "active")),
    }),
    db.select({ count: sql<number>`count(*)` }).from(adherenceLogs).where(
      and(eq(adherenceLogs.clientId, clientId), gte(adherenceLogs.date, new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]))
    ),
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

  // Adherence (percentage of last 30 days)
  const adherenceTotal = Number(adherenceCount[0]?.count ?? 0);
  const adherence = Math.min(100, Math.round((adherenceTotal / 30) * 100));

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
      const relationships = await ctx.db.query.trainerClientRelationships.findMany({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.status, "active")
        ),
      });

      const clientIds = relationships.map((r) => r.clientId);
      if (clientIds.length === 0) return [];

      // Fetch all client data
      const allClients = await Promise.all(
        clientIds.map((id) => fetchClientData(ctx.db, id))
      );

      let clients = allClients.filter((c): c is NonNullable<typeof c> => c !== null);

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
          case "lastActive": return a.lastActive.localeCompare(b.lastActive) * mult;
          default: return a.name.localeCompare(b.name) * mult;
        }
      });

      return clients;
    }),

  // Get detailed view of a single client
  getDetail: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const detail = await fetchClientData(ctx.db, input.clientId);
      if (!detail) return null;

      // Also fetch alerts list and recent activity
      const [clientAlerts, recentCheckins] = await Promise.all([
        ctx.db.query.alerts.findMany({
          where: eq(alerts.clientId, input.clientId),
          orderBy: desc(alerts.createdAt),
          limit: 10,
        }),
        ctx.db.query.dailyCheckins.findMany({
          where: eq(dailyCheckins.clientId, input.clientId),
          orderBy: desc(dailyCheckins.date),
          limit: 8,
        }),
      ]);

      // Map alerts to the expected shape
      const mappedAlerts = clientAlerts.map((a) => ({
        id: a.id,
        clientId: a.clientId,
        priority: (a.priority === "urgent" ? "high" : a.priority === "action" ? "medium" : "low") as "high" | "medium" | "low",
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

    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
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

    const allClients = await Promise.all(
      clientIds.map((id) => fetchClientData(ctx.db, id))
    );
    const clients = allClients.filter((c): c is NonNullable<typeof c> => c !== null);

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
      return ctx.db.query.coachNotes.findMany({
        where: eq(coachNotes.clientId, input.clientId),
        orderBy: [desc(coachNotes.pinned), desc(coachNotes.createdAt)],
      });
    }),

  pinNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Toggle pin status
      const existing = await ctx.db.query.coachNotes.findFirst({
        where: and(eq(coachNotes.id, input.noteId), eq(coachNotes.clientId, input.clientId)),
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
      const deleted = await ctx.db
        .delete(coachNotes)
        .where(and(eq(coachNotes.id, input.noteId), eq(coachNotes.clientId, input.clientId)))
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
});
