import { z } from "zod";
import { router, coachProcedure } from "@/server/trpc";
import {
  coachClientRelationships, users, clientProfiles,
  glucoseReadings, sleepSessions, bodyMeasurements,
  adherenceLogs, dailyCheckins,
} from "@/server/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const coachClientsRouter = router({
  // List all coach's clients with summary
  list: coachProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.coachClientRelationships.findMany({
      where: and(
        eq(coachClientRelationships.coachId, ctx.dbUserId),
        eq(coachClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    const clients = await Promise.all(
      clientIds.map(async (clientId) => {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, clientId),
        });
        const profile = await ctx.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, clientId),
        });

        return {
          id: clientId,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          email: user?.email ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          tier: profile?.tier ?? null,
          goals: profile?.goals ?? [],
          startedAt: relationships.find((r) => r.clientId === clientId)?.startedAt,
        };
      })
    );

    return clients;
  }),

  // Get detailed view of a single client
  getDetail: coachProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify coach-client relationship
      const relationship = await ctx.db.query.coachClientRelationships.findFirst({
        where: and(
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.clientId, input.clientId),
          eq(coachClientRelationships.status, "active")
        ),
      });

      if (!relationship) return null;

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientId),
      });
      const profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, input.clientId),
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      // Recent glucose avg
      const glucoseAvg = await ctx.db
        .select({ avg: sql<number>`avg(${glucoseReadings.valueMgdl})` })
        .from(glucoseReadings)
        .where(
          and(
            eq(glucoseReadings.clientId, input.clientId),
            gte(glucoseReadings.timestamp, sevenDaysAgo)
          )
        );

      // Recent sleep avg
      const sleepAvg = await ctx.db
        .select({ avgScore: sql<number>`avg(${sleepSessions.score})` })
        .from(sleepSessions)
        .where(
          and(
            eq(sleepSessions.clientId, input.clientId),
            gte(sleepSessions.date, sevenDaysAgoStr)
          )
        );

      // Latest measurement
      const latestMeasurement = await ctx.db.query.bodyMeasurements.findFirst({
        where: eq(bodyMeasurements.clientId, input.clientId),
        orderBy: desc(bodyMeasurements.date),
      });

      // Recent adherence rate
      const adherenceRate = await ctx.db
        .select({
          total: sql<number>`count(*)`,
          taken: sql<number>`count(*) filter (where ${adherenceLogs.skipped} = false)`,
        })
        .from(adherenceLogs)
        .where(
          and(
            eq(adherenceLogs.clientId, input.clientId),
            gte(adherenceLogs.date, sevenDaysAgoStr)
          )
        );

      // Last check-in
      const lastCheckin = await ctx.db.query.dailyCheckins.findFirst({
        where: eq(dailyCheckins.clientId, input.clientId),
        orderBy: desc(dailyCheckins.date),
      });

      return {
        user: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        },
        profile: {
          tier: profile?.tier,
          goals: profile?.goals,
          dateOfBirth: profile?.dateOfBirth,
          gender: profile?.gender,
          heightInches: profile?.heightInches,
        },
        recentMetrics: {
          avgGlucose: glucoseAvg[0]?.avg ? Math.round(Number(glucoseAvg[0].avg)) : null,
          avgSleepScore: sleepAvg[0]?.avgScore ? Math.round(Number(sleepAvg[0].avgScore)) : null,
          latestWeight: latestMeasurement?.weightLbs ?? null,
          latestBodyFat: latestMeasurement?.bodyFatPct ?? null,
          adherenceRate:
            Number(adherenceRate[0]?.total ?? 0) > 0
              ? Math.round((Number(adherenceRate[0]?.taken ?? 0) / Number(adherenceRate[0]?.total ?? 1)) * 100)
              : null,
          lastCheckinDate: lastCheckin?.date ?? null,
        },
        startedAt: relationship.startedAt,
      };
    }),
});
