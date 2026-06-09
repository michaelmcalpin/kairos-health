import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  trainerClientRelationships,
  clientInvitations,
  users,
  clientProfiles,
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
} from "@/server/db/schema";
import { eq, desc, and, sql, gte, lte, inArray, or, ilike, ne, notInArray } from "drizzle-orm";

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
) {
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
      return ctx.db.query.coachNotes.findMany({
        where: eq(coachNotes.clientId, input.clientId),
        orderBy: [desc(coachNotes.pinned), desc(coachNotes.createdAt)],
      });
    }),

  pinNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);
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
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId);

      const end = input.endDate ?? new Date().toISOString().split("T")[0];
      const start = input.startDate ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const [
        glucose, sleep, hrvData, bpData, weightData, workouts, activity,
        goals, labs, fasting, meals, protocolData, upcoming, checkins,
      ] = await Promise.all([
        // Glucose
        ctx.db.query.glucoseReadings.findMany({
          where: and(eq(glucoseReadings.clientId, input.clientId), gte(glucoseReadings.timestamp, new Date(start))),
          orderBy: desc(glucoseReadings.timestamp),
          limit: 200,
        }),
        // Sleep
        ctx.db.query.sleepSessions.findMany({
          where: and(eq(sleepSessions.clientId, input.clientId), gte(sleepSessions.date, start), lte(sleepSessions.date, end)),
          orderBy: desc(sleepSessions.date),
        }),
        // HRV
        ctx.db.query.hrvReadings.findMany({
          where: and(eq(hrvReadings.clientId, input.clientId), gte(hrvReadings.timestamp, new Date(start))),
          orderBy: desc(hrvReadings.timestamp),
          limit: 100,
        }),
        // Blood Pressure
        ctx.db.query.bloodPressureReadings.findMany({
          where: and(eq(bloodPressureReadings.clientId, input.clientId), gte(bloodPressureReadings.date, start), lte(bloodPressureReadings.date, end)),
          orderBy: desc(bloodPressureReadings.date),
        }),
        // Body Measurements
        ctx.db.query.bodyMeasurements.findMany({
          where: and(eq(bodyMeasurements.clientId, input.clientId), gte(bodyMeasurements.date, start), lte(bodyMeasurements.date, end)),
          orderBy: desc(bodyMeasurements.date),
        }),
        // Workouts
        ctx.db.query.workoutLogs.findMany({
          where: and(eq(workoutLogs.clientId, input.clientId), gte(workoutLogs.date, start), lte(workoutLogs.date, end)),
          orderBy: desc(workoutLogs.date),
        }),
        // Activity Summaries
        ctx.db.query.activitySummaries.findMany({
          where: and(eq(activitySummaries.clientId, input.clientId), gte(activitySummaries.date, start), lte(activitySummaries.date, end)),
          orderBy: desc(activitySummaries.date),
        }),
        // Health Goals (all active)
        ctx.db.query.healthGoals.findMany({
          where: and(eq(healthGoals.clientId, input.clientId)),
          orderBy: desc(healthGoals.createdAt),
        }),
        // Lab Results
        ctx.db.query.labResults.findMany({
          where: eq(labResults.clientId, input.clientId),
          orderBy: desc(labResults.receivedAt),
          limit: 10,
        }),
        // Fasting logs
        ctx.db.query.fastingLogs.findMany({
          where: and(eq(fastingLogs.clientId, input.clientId), gte(fastingLogs.startedAt, new Date(start))),
          orderBy: desc(fastingLogs.startedAt),
        }),
        // Meal logs
        ctx.db.query.mealLogs.findMany({
          where: and(eq(mealLogs.clientId, input.clientId), gte(mealLogs.date, start), lte(mealLogs.date, end)),
          orderBy: desc(mealLogs.date),
          limit: 50,
        }),
        // Active supplement protocol with items
        ctx.db.query.supplementProtocols.findFirst({
          where: and(eq(supplementProtocols.clientId, input.clientId), eq(supplementProtocols.status, "active")),
        }),
        // Upcoming appointments
        ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.clientId, input.clientId),
            eq(appointments.coachId, ctx.dbUserId),
            gte(appointments.date, new Date().toISOString().split("T")[0]),
          ),
          orderBy: appointments.date,
          limit: 5,
        }),
        // Daily check-ins
        ctx.db.query.dailyCheckins.findMany({
          where: and(eq(dailyCheckins.clientId, input.clientId), gte(dailyCheckins.date, start), lte(dailyCheckins.date, end)),
          orderBy: desc(dailyCheckins.date),
        }),
      ]);

      // Fetch protocol items if protocol exists
      let supplements: typeof protocolItems.$inferSelect[] = [];
      if (protocolData) {
        supplements = await ctx.db.query.protocolItems.findMany({
          where: eq(protocolItems.protocolId, protocolData.id),
        });
      }

      // Fetch biomarker values for labs
      let biomarkers: typeof biomarkerValues.$inferSelect[] = [];
      if (labs.length > 0) {
        const labIds = labs.map((l) => l.id);
        biomarkers = await ctx.db.query.biomarkerValues.findMany({
          where: inArray(biomarkerValues.resultId, labIds),
        });
      }

      // Fetch goal milestones + checkpoints for active goals
      const activeGoals = goals.filter((g) => g.status === "active");
      let allMilestones: typeof goalMilestones.$inferSelect[] = [];
      let allCheckpoints: typeof goalCheckpoints.$inferSelect[] = [];
      if (activeGoals.length > 0) {
        const goalIds = activeGoals.map((g) => g.id);
        [allMilestones, allCheckpoints] = await Promise.all([
          ctx.db.query.goalMilestones.findMany({ where: inArray(goalMilestones.goalId, goalIds) }),
          ctx.db.query.goalCheckpoints.findMany({ where: inArray(goalCheckpoints.goalId, goalIds), orderBy: desc(goalCheckpoints.createdAt) }),
        ]);
      }

      // Check for existing conversation
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(eq(conversations.trainerId, ctx.dbUserId), eq(conversations.clientId, input.clientId)),
      });

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

      // Verify user exists and is a client
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientId),
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
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
      try {
        const existingInvite = await ctx.db.query.clientInvitations.findFirst({
          where: and(
            eq(clientInvitations.trainerId, trainerId),
            ilike(clientInvitations.email, input.email),
            eq(clientInvitations.status, "pending"),
          ),
        });
        if (existingInvite) {
          return { success: false, message: "An invitation is already pending for this email." };
        }
      } catch { /* table may not exist yet */ }

      // Create invitation (expires in 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      try {
        const [invite] = await ctx.db.insert(clientInvitations).values({
          trainerId,
          email: input.email.toLowerCase(),
          tier: input.tier,
          note: input.note ?? null,
          expiresAt,
        }).returning();

        return { success: true, invitationId: invite.id };
      } catch {
        // Table may not exist yet
        return { success: true, invitationId: null };
      }
    }),

  /**
   * List pending invitations for this trainer.
   */
  listInvitations: trainerProcedure.query(async ({ ctx }) => {
    try {
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
    } catch {
      return [];
    }
  }),

  /**
   * Cancel a pending invitation.
   */
  cancelInvitation: trainerProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.update(clientInvitations)
          .set({ status: "cancelled" })
          .where(and(
            eq(clientInvitations.id, input.invitationId),
            eq(clientInvitations.trainerId, ctx.dbUserId),
            eq(clientInvitations.status, "pending"),
          ));
      } catch { /* table may not exist */ }
      return { success: true };
    }),
});
