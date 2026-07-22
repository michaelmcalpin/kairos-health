import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
import {
  trainerClientRelationships,
  users,
  clientProfiles,
  alerts,
  sleepSessions,
  glucoseReadings,
  appointments,
  clientCoachAccess,
  hrvReadings,
  deviceConnections,
} from "@/server/db/schema";
import { eq, desc, asc, and, sql, gte, between, inArray } from "drizzle-orm";

// Helper: safely run a query against a table that may not exist yet.
// Returns the fallback instead of crashing the whole procedure.
const safeQ = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

/** Display name for a user row, falling back to email then "Client". */
const displayName = (u?: { firstName: string | null; lastName: string | null; email: string } | null) =>
  u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : "Client";

// ─── Tier pricing for revenue calculation ─────────────────────
const TIER_PRICING: Record<string, number> = {
  tier1: 499,
  tier2: 249,
  tier3: 99,
};

export const coachDashboardRouter = router({
  /**
   * getDashboard — returns the full dashboard shape for the trainer portal.
   *
   * KPIs, priority clients, and today's schedule.
   * Client data comes from the real DB; schedule is server-generated
   * until an appointments table is added.
   */
  getDashboard: trainerProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // ── Fetch active client relationships ──────────────────
      const relationships = await ctx.db.query.trainerClientRelationships.findMany({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.status, "active")
        ),
      });

      const clientIds = relationships.map((r) => r.clientId);

      // ── Gather client details with batched queries ─────────
      // Instead of N individual queries per client, batch into a few bulk queries
      if (clientIds.length === 0) {
        return { kpis: [], priorityClients: [], todaySchedule: [] };
      }

      // Helper: safely query a table that may not exist yet (returns [] on error)
      const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch { return fallback; }
      };

      const [allUsers, allProfiles, alertCounts, allLatestSleep, allLatestGlucose] = await Promise.all([
        // Batch: all users at once
        ctx.db.query.users.findMany({ where: inArray(users.id, clientIds) }),
        // Batch: all client profiles at once
        ctx.db.query.clientProfiles.findMany({ where: inArray(clientProfiles.userId, clientIds) }),
        // Batch: alert counts grouped by client
        ctx.db
          .select({ clientId: alerts.clientId, count: sql<number>`count(*)` })
          .from(alerts)
          .where(and(inArray(alerts.clientId, clientIds), eq(alerts.status, "active")))
          .groupBy(alerts.clientId),
        // Batch: latest sleep per client (table may not exist yet)
        safeQuery(
          () => ctx.db.execute(sql`
            SELECT DISTINCT ON (client_id) *
            FROM sleep_sessions
            WHERE client_id = ANY(${clientIds})
            ORDER BY client_id, date DESC
          `),
          [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
        ),
        // Batch: latest glucose per client (table may not exist yet)
        safeQuery(
          () => ctx.db.execute(sql`
            SELECT DISTINCT ON (client_id) *
            FROM glucose_readings
            WHERE client_id = ANY(${clientIds})
            ORDER BY client_id, timestamp DESC
          `),
          [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
        ),
      ]);

      // Build lookup maps
      const userMap = new Map(allUsers.map((u) => [u.id, u]));
      const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
      const alertCountMap = new Map(alertCounts.map((a) => [a.clientId, Number(a.count)]));
      const sleepRows = allLatestSleep as unknown as Array<{ client_id: string; score: number | null }>;
      const sleepMap = new Map(sleepRows.map((s) => [s.client_id, s]));
      const glucoseRows = allLatestGlucose as unknown as Array<{ client_id: string; value_mgdl: string | null }>;
      const glucoseMap = new Map(glucoseRows.map((g) => [g.client_id, g]));

      const clientDetails = clientIds.map((clientId) => {
        const user = userMap.get(clientId);
        const profile = profileMap.get(clientId);
        const activeAlerts = alertCountMap.get(clientId) ?? 0;
        const latestSleep = sleepMap.get(clientId) as { score: number | null } | undefined;
        const latestGlucose = glucoseMap.get(clientId) as { value_mgdl: string | null } | undefined;

        const firstName = user?.firstName ?? "";
        const lastName = user?.lastName ?? "";
        const name = `${firstName} ${lastName}`.trim() || user?.email || "Unknown";
        const initials = firstName && lastName
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();

        // Simple health score derived from available data
        let healthScore = 75; // baseline
        if (latestSleep?.score) healthScore += Math.min(10, Math.round((Number(latestSleep.score) - 50) / 5));
        if (latestGlucose?.value_mgdl) {
          const gv = Number(latestGlucose.value_mgdl);
          if (gv >= 70 && gv <= 100) healthScore += 10;
          else if (gv > 100 && gv <= 120) healthScore += 5;
        }
        healthScore = Math.max(0, Math.min(100, healthScore));

        return {
          id: clientId,
          name,
          initials,
          email: user?.email ?? "",
          tier: (profile?.tier ?? "tier1") as string,
          healthScore,
          activeAlerts,
          status: activeAlerts >= 3 ? "Critical Review" as const
            : activeAlerts >= 1 ? "Review Needed" as const
            : "On Track" as const,
        };
      });

      // ── KPIs ───────────────────────────────────────────────
      const totalClients = clientDetails.length;
      const pendingAlerts = clientDetails.reduce((s, c) => s + c.activeAlerts, 0);
      const avgHealthScore = totalClients > 0
        ? Math.round(clientDetails.reduce((s, c) => s + c.healthScore, 0) / totalClients)
        : 0;
      const revenue = clientDetails.reduce((s, c) => s + (TIER_PRICING[c.tier] ?? 99), 0);

      // Real session count from appointments table
      const sessionsResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(
          and(
            eq(appointments.coachId, trainerId),
            gte(appointments.date, sql`${input.startDate}::date`),
            sql`${appointments.date} <= ${input.endDate}::date`,
          )
        );
      const totalSessions = Number(sessionsResult[0]?.count ?? 0);

      type KPI = {
        label: string;
        value: string | number;
        unit?: string;
        trend: "up" | "down" | "flat";
        trendValue: string;
        icon: string;
      };

      const kpis: KPI[] = [
        {
          label: "Active Clients",
          value: totalClients,
          trend: "flat",
          trendValue: `${totalClients} total`,
          icon: "users",
        },
        {
          label: "Pending Alerts",
          value: pendingAlerts,
          trend: pendingAlerts > 3 ? "up" : "flat",
          trendValue: `${pendingAlerts} active`,
          icon: "bell",
        },
        {
          label: "Sessions",
          value: totalSessions,
          trend: "flat",
          trendValue: "this period",
          icon: "calendar",
        },
        {
          label: "Avg Health Score",
          value: avgHealthScore,
          unit: "/100",
          trend: "flat",
          trendValue: "across clients",
          icon: "trending",
        },
        {
          label: "Revenue",
          value: `$${revenue.toLocaleString()}`,
          trend: "flat",
          trendValue: "monthly",
          icon: "dollar",
        },
      ];

      // ── Priority Clients (highest alerts, lowest health score) ──
      const priorityClients = [...clientDetails]
        .sort((a, b) => {
          if (b.activeAlerts !== a.activeAlerts) return b.activeAlerts - a.activeAlerts;
          return a.healthScore - b.healthScore;
        })
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name,
          initials: c.initials,
          healthScore: c.healthScore,
          alerts: c.activeAlerts,
          status: c.status,
        }));

      // ── Schedule from real appointments (respects selected date range) ──
      const todayAppointments = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, trainerId),
          between(
            appointments.date,
            sql`${input.startDate}::date`,
            sql`${input.endDate}::date`,
          ),
        ),
      });

      // Batch-fetch users for all appointments instead of per-appointment lookups
      const appointmentClientIds = Array.from(new Set(todayAppointments.map((a) => a.clientId)));
      const appointmentUsers = appointmentClientIds.length > 0
        ? await ctx.db.query.users.findMany({ where: inArray(users.id, appointmentClientIds) })
        : [];
      const appointmentUserMap = new Map(appointmentUsers.map((u) => [u.id, u]));

      const todaySchedule = todayAppointments.map((appt) => {
        const clientUser = appointmentUserMap.get(appt.clientId);
        const clientName = clientUser
          ? `${clientUser.firstName ?? ""} ${clientUser.lastName ?? ""}`.trim() || clientUser.email
          : "Client";

        // Format time from 24h "HH:MM" to 12h
        const [h, m] = appt.startTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const timeStr = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

        return {
          id: appt.id,
          time: timeStr,
          startTime: appt.startTime,
          client: clientName,
          type: appt.sessionType ?? "Follow-up",
          meetingLink: appt.meetingLink ?? null,
        };
      });

      // Sort chronologically using the raw 24h startTime ("HH:MM")
      todaySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

      return { kpis, priorityClients, todaySchedule };
    }),

  // ── Existing queries (kept for backwards compatibility) ─────

  getOverview: trainerProcedure.query(async ({ ctx }) => {
    const clientCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(trainerClientRelationships)
      .where(
        and(
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      );

    const activeAlerts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .innerJoin(
        trainerClientRelationships,
        and(
          eq(alerts.clientId, trainerClientRelationships.clientId),
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      )
      .where(eq(alerts.status, "active"));

    return {
      clientCount: Number(clientCount[0]?.count ?? 0),
      activeAlerts: Number(activeAlerts[0]?.count ?? 0),
    };
  }),

  getClientList: trainerProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
        eq(trainerClientRelationships.trainerId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    // Batch all lookups instead of per-client queries
    // Helper: safely query a table that may not exist yet (returns fallback on error)
    const safeQuery2 = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };

    const [allUsers, allProfiles, alertCounts, allLatestSleep, allLatestGlucose] = await Promise.all([
      ctx.db.query.users.findMany({ where: inArray(users.id, clientIds) }),
      ctx.db.query.clientProfiles.findMany({ where: inArray(clientProfiles.userId, clientIds) }),
      ctx.db
        .select({ clientId: alerts.clientId, count: sql<number>`count(*)` })
        .from(alerts)
        .where(and(inArray(alerts.clientId, clientIds), eq(alerts.status, "active")))
        .groupBy(alerts.clientId),
      safeQuery2(
        () => ctx.db.execute(sql`
          SELECT DISTINCT ON (client_id) *
          FROM sleep_sessions
          WHERE client_id = ANY(${clientIds})
          ORDER BY client_id, date DESC
        `),
        [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
      ),
      safeQuery2(
        () => ctx.db.execute(sql`
          SELECT DISTINCT ON (client_id) *
          FROM glucose_readings
          WHERE client_id = ANY(${clientIds})
          ORDER BY client_id, timestamp DESC
        `),
        [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
      ),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
    const alertCountMap = new Map(alertCounts.map((a) => [a.clientId, Number(a.count)]));
    const sleepRows2 = allLatestSleep as unknown as Array<{ client_id: string; score: number | null }>;
    const sleepMap = new Map(sleepRows2.map((s) => [s.client_id, s]));
    const glucoseRows2 = allLatestGlucose as unknown as Array<{ client_id: string; value_mgdl: string | null }>;
    const glucoseMap = new Map(glucoseRows2.map((g) => [g.client_id, g]));

    const clients = clientIds.map((clientId) => {
      const user = userMap.get(clientId);
      const profile = profileMap.get(clientId);
      const latestSleep = sleepMap.get(clientId) as { score: number | null } | undefined;
      const latestGlucose = glucoseMap.get(clientId) as { value_mgdl: string | null } | undefined;

      return {
        id: clientId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        avatarUrl: user?.avatarUrl,
        tier: profile?.tier,
        latestSleepScore: latestSleep?.score ?? null,
        latestGlucose: latestGlucose?.value_mgdl ?? null,
        activeAlerts: alertCountMap.get(clientId) ?? 0,
      };
    });

    return clients;
  }),

  getRecentActivity: trainerProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlerts = await ctx.db
      .select({
        id: alerts.id,
        clientId: alerts.clientId,
        title: alerts.title,
        priority: alerts.priority,
        status: alerts.status,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .innerJoin(
        trainerClientRelationships,
        and(
          eq(alerts.clientId, trainerClientRelationships.clientId),
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      )
      .where(gte(alerts.createdAt, sevenDaysAgo))
      .orderBy(desc(alerts.createdAt))
      .limit(20);

    return recentAlerts;
  }),

  // ══════════════ Redesigned dashboard procedures ══════════════

  /**
   * getDaySchedule — this coach's appointments for a single day,
   * sorted by start time.
   */
  getDaySchedule: trainerProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.dbUserId;

      const dayAppointments = await safeQ(
        () =>
          ctx.db.query.appointments.findMany({
            where: and(
              eq(appointments.coachId, coachId),
              eq(appointments.date, input.date),
            ),
            orderBy: [asc(appointments.startTime)],
            limit: 100,
          }),
        [] as (typeof appointments.$inferSelect)[],
      );

      // Fall back to users lookup for appointments missing a clientName
      const missingNameIds = Array.from(
        new Set(dayAppointments.filter((a) => !a.clientName).map((a) => a.clientId)),
      );
      const nameUsers = missingNameIds.length
        ? await safeQ(
            () => ctx.db.query.users.findMany({ where: inArray(users.id, missingNameIds) }),
            [] as (typeof users.$inferSelect)[],
          )
        : [];
      const nameMap = new Map(nameUsers.map((u) => [u.id, u]));

      return dayAppointments.map((appt) => ({
        id: appt.id,
        clientId: appt.clientId,
        clientName: appt.clientName ?? displayName(nameMap.get(appt.clientId)),
        startTime: appt.startTime,
        endTime: appt.endTime,
        durationMinutes: appt.durationMinutes ?? 60,
        sessionType: appt.sessionType,
        meetingType: appt.meetingType,
        status: appt.status,
        meetingLink: appt.meetingLink ?? null,
      }));
    }),

  /**
   * getClientAlertsFeed — "needs attention" feed across this coach's
   * full roster (primary relationships + shared-access clients).
   * Kinds: alert (active alerts), hrv (recent deviation from 14-day avg),
   * no_data (connected device but nothing synced for 48h+).
   */
  getClientAlertsFeed: trainerProcedure.query(async ({ ctx }) => {
    const coachId = ctx.dbUserId;

    // ── Roster: primary relationships + shared-access grants ──
    const [rels, accessGrants] = await Promise.all([
      safeQ(
        () =>
          ctx.db.query.trainerClientRelationships.findMany({
            where: and(
              eq(trainerClientRelationships.trainerId, coachId),
              eq(trainerClientRelationships.status, "active"),
            ),
          }),
        [] as (typeof trainerClientRelationships.$inferSelect)[],
      ),
      safeQ(
        () =>
          ctx.db.query.clientCoachAccess.findMany({
            where: and(
              eq(clientCoachAccess.coachId, coachId),
              eq(clientCoachAccess.status, "active"),
            ),
          }),
        [] as (typeof clientCoachAccess.$inferSelect)[],
      ),
    ]);

    const clientIds = Array.from(
      new Set([...rels.map((r) => r.clientId), ...accessGrants.map((a) => a.clientId)]),
    ).slice(0, 100);
    if (clientIds.length === 0) return [];

    // Health-data visibility: primary-roster clients are always visible;
    // shared-access clients only if their grant's healthDataAccess != "none".
    // Alerts, HRV deviations, and no-data checks are all health-derived,
    // so items for non-permitted shared clients are excluded below.
    const healthVisibleIds = new Set<string>(rels.map((r) => r.clientId));
    for (const g of accessGrants) {
      if (g.healthDataAccess !== "none") healthVisibleIds.add(g.clientId);
    }

    const now = Date.now();
    const cutoff48h = new Date(now - 48 * 60 * 60 * 1000);
    const cutoff14d = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const twoDaysAgoStr = cutoff48h.toISOString().split("T")[0];

    type CountRow = { clientId: string; count: number };

    const [
      clientUsers,
      activeAlerts,
      latestHrvRaw,
      hrvAvgRows,
      devices,
      hrvCounts,
      glucoseCounts,
      sleepCounts,
    ] = await Promise.all([
      safeQ(
        () => ctx.db.query.users.findMany({ where: inArray(users.id, clientIds) }),
        [] as (typeof users.$inferSelect)[],
      ),
      // Active alerts
      safeQ(
        () =>
          ctx.db.query.alerts.findMany({
            where: and(inArray(alerts.clientId, clientIds), eq(alerts.status, "active")),
            orderBy: [desc(alerts.createdAt)],
            limit: 200,
          }),
        [] as (typeof alerts.$inferSelect)[],
      ),
      // Latest HRV reading per client within the last 48h
      safeQ(
        () =>
          ctx.db.execute(sql`
            SELECT DISTINCT ON (client_id) client_id, rmssd, timestamp
            FROM hrv_readings
            WHERE client_id = ANY(${clientIds}) AND timestamp >= ${cutoff48h}
            ORDER BY client_id, timestamp DESC
          `),
        [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
      ),
      // 14-day average rmssd per client
      safeQ(
        () =>
          ctx.db
            .select({
              clientId: hrvReadings.clientId,
              avgRmssd: sql<number>`avg(${hrvReadings.rmssd})`,
            })
            .from(hrvReadings)
            .where(
              and(inArray(hrvReadings.clientId, clientIds), gte(hrvReadings.timestamp, cutoff14d)),
            )
            .groupBy(hrvReadings.clientId),
        [] as { clientId: string; avgRmssd: number }[],
      ),
      // Connected devices
      safeQ(
        () =>
          ctx.db.query.deviceConnections.findMany({
            where: and(
              inArray(deviceConnections.clientId, clientIds),
              eq(deviceConnections.status, "connected"),
            ),
          }),
        [] as (typeof deviceConnections.$inferSelect)[],
      ),
      // Recent-reading counts (48h) per client, per modality
      safeQ(
        () =>
          ctx.db
            .select({ clientId: hrvReadings.clientId, count: sql<number>`count(*)` })
            .from(hrvReadings)
            .where(
              and(inArray(hrvReadings.clientId, clientIds), gte(hrvReadings.timestamp, cutoff48h)),
            )
            .groupBy(hrvReadings.clientId),
        [] as CountRow[],
      ),
      safeQ(
        () =>
          ctx.db
            .select({ clientId: glucoseReadings.clientId, count: sql<number>`count(*)` })
            .from(glucoseReadings)
            .where(
              and(
                inArray(glucoseReadings.clientId, clientIds),
                gte(glucoseReadings.timestamp, cutoff48h),
              ),
            )
            .groupBy(glucoseReadings.clientId),
        [] as CountRow[],
      ),
      safeQ(
        () =>
          ctx.db
            .select({ clientId: sleepSessions.clientId, count: sql<number>`count(*)` })
            .from(sleepSessions)
            .where(
              and(
                inArray(sleepSessions.clientId, clientIds),
                gte(sleepSessions.date, sql`${twoDaysAgoStr}::date`),
              ),
            )
            .groupBy(sleepSessions.clientId),
        [] as CountRow[],
      ),
    ]);

    const userMap = new Map(clientUsers.map((u) => [u.id, u]));
    const hrvAvgMap = new Map(hrvAvgRows.map((r) => [r.clientId, Number(r.avgRmssd)]));
    const latestHrvRows = latestHrvRaw as unknown as Array<{
      client_id: string;
      rmssd: number | string;
      timestamp: Date | string;
    }>;
    const recentDataClientIds = new Set<string>([
      ...hrvCounts.filter((c) => Number(c.count) > 0).map((c) => c.clientId),
      ...glucoseCounts.filter((c) => Number(c.count) > 0).map((c) => c.clientId),
      ...sleepCounts.filter((c) => Number(c.count) > 0).map((c) => c.clientId),
    ]);
    const devicesByClient = new Map<string, (typeof deviceConnections.$inferSelect)[]>();
    for (const d of devices) {
      const list = devicesByClient.get(d.clientId) ?? [];
      list.push(d);
      devicesByClient.set(d.clientId, list);
    }

    type Severity = "high" | "medium" | "low";
    type AttentionItem = {
      clientId: string;
      clientName: string;
      avatarUrl: string | null;
      kind: "alert" | "hrv" | "no_data";
      severity: Severity;
      detail: string;
      timestamp: string;
    };

    const items: AttentionItem[] = [];
    const nameOf = (clientId: string) => displayName(userMap.get(clientId));
    const avatarOf = (clientId: string) => userMap.get(clientId)?.avatarUrl ?? null;

    // ── kind: alert ──
    const alertSeverity: Record<string, Severity> = { urgent: "high", action: "medium", info: "low" };
    for (const a of activeAlerts) {
      if (!healthVisibleIds.has(a.clientId)) continue;
      items.push({
        clientId: a.clientId,
        clientName: nameOf(a.clientId),
        avatarUrl: avatarOf(a.clientId),
        kind: "alert",
        severity: alertSeverity[a.priority] ?? "low",
        detail: a.title,
        timestamp: (a.createdAt ?? new Date()).toISOString(),
      });
    }

    // ── kind: hrv ──
    for (const row of latestHrvRows) {
      if (!healthVisibleIds.has(row.client_id)) continue;
      const avg = hrvAvgMap.get(row.client_id);
      if (!avg || avg <= 0) continue;
      const latest = Number(row.rmssd);
      const deviation = ((latest - avg) / avg) * 100;
      if (Math.abs(deviation) <= 25) continue;
      const direction = deviation < 0 ? "below" : "above";
      items.push({
        clientId: row.client_id,
        clientName: nameOf(row.client_id),
        avatarUrl: avatarOf(row.client_id),
        kind: "hrv",
        severity: Math.abs(deviation) > 40 ? "high" : "medium",
        detail: `HRV ${Math.round(latest)}ms — ${Math.round(Math.abs(deviation))}% ${direction} 14-day avg`,
        timestamp: new Date(row.timestamp).toISOString(),
      });
    }

    // ── kind: no_data ──
    for (const clientId of clientIds) {
      if (!healthVisibleIds.has(clientId)) continue;
      const clientDevices = devicesByClient.get(clientId);
      if (!clientDevices || clientDevices.length === 0) continue;
      const hasRecentReadings = recentDataClientIds.has(clientId);
      const allSyncsStale = clientDevices.every(
        (d) => !d.lastSyncAt || d.lastSyncAt.getTime() < cutoff48h.getTime(),
      );
      if (hasRecentReadings && !allSyncsStale) continue;
      if (!hasRecentReadings || allSyncsStale) {
        const latestSync = clientDevices.reduce<Date | null>(
          (acc, d) => (d.lastSyncAt && (!acc || d.lastSyncAt > acc) ? d.lastSyncAt : acc),
          null,
        );
        items.push({
          clientId,
          clientName: nameOf(clientId),
          avatarUrl: avatarOf(clientId),
          kind: "no_data",
          severity: "medium",
          detail: "No device readings for 2+ days",
          timestamp: (latestSync ?? cutoff48h).toISOString(),
        });
      }
    }

    // ── Sort: high severity first, then newest first ──
    const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      if (severityRank[a.severity] !== severityRank[b.severity]) {
        return severityRank[a.severity] - severityRank[b.severity];
      }
      return b.timestamp.localeCompare(a.timestamp);
    });

    return items;
  }),

  /**
   * getUnresponded — conversations where the last message was sent by
   * the client and is still awaiting the coach's reply. Oldest first.
   */
  getUnresponded: trainerProcedure.query(async ({ ctx }) => {
    const coachId = ctx.dbUserId;

    // Last message per conversation for this coach's conversations
    const lastMsgRaw = await safeQ(
      () =>
        ctx.db.execute(sql`
          SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id, m.sender_role, m.body, m.created_at, c.client_id
          FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          WHERE c.trainer_id = ${coachId}
          ORDER BY m.conversation_id, m.created_at DESC
        `),
      [] as unknown as Awaited<ReturnType<typeof ctx.db.execute>>,
    );

    const lastMsgs = (lastMsgRaw as unknown as Array<{
      conversation_id: string;
      sender_role: string;
      body: string;
      created_at: Date | string;
      client_id: string;
    }>).filter((m) => m.sender_role === "client");

    if (lastMsgs.length === 0) return [];

    const msgClientIds = Array.from(new Set(lastMsgs.map((m) => m.client_id)));
    const msgUsers = await safeQ(
      () => ctx.db.query.users.findMany({ where: inArray(users.id, msgClientIds) }),
      [] as (typeof users.$inferSelect)[],
    );
    const msgUserMap = new Map(msgUsers.map((u) => [u.id, u]));

    const nowMs = Date.now();
    const result = lastMsgs.map((m) => {
      const lastMessageAt = new Date(m.created_at);
      const hoursWaiting =
        Math.round(((nowMs - lastMessageAt.getTime()) / (60 * 60 * 1000)) * 10) / 10;
      const body = m.body ?? "";
      return {
        conversationId: m.conversation_id,
        clientId: m.client_id,
        clientName: displayName(msgUserMap.get(m.client_id)),
        avatarUrl: msgUserMap.get(m.client_id)?.avatarUrl ?? null,
        lastMessageBody: body.length > 140 ? `${body.slice(0, 140)}…` : body,
        lastMessageAt: lastMessageAt.toISOString(),
        hoursWaiting,
      };
    });

    // Oldest-waiting first
    result.sort((a, b) => a.lastMessageAt.localeCompare(b.lastMessageAt));
    return result;
  }),
});

