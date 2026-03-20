/**
 * KAIROS Admin Analytics Router
 *
 * tRPC endpoints for platform analytics: growth, engagement,
 * retention, coach performance, and revenue metrics.
 */

import { z } from "zod";
import { router, superAdminProcedure as adminProcedure } from "@/server/trpc";
import {
  getGrowthAnalytics,
  getEngagementAnalytics,
  getRetentionAnalytics,
  getCoachPerformance,
  getPlatformHealth,
  getRevenueAnalytics,
  getKPIs,
  getFullAnalyticsDashboard,
} from "@/lib/analytics/engine";

const dateRangeInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const adminAnalyticsRouter = router({
  /** Full analytics dashboard in one call */
  getDashboard: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getFullAnalyticsDashboard(input);
    }),

  /** KPI summary cards */
  getKPIs: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getKPIs(input);
    }),

  /** User growth by month */
  getUserGrowth: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getGrowthAnalytics(input);
    }),

  /** Engagement metrics: DAU, check-ins, feature usage */
  getEngagement: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getEngagementAnalytics(input);
    }),

  /** Cohort retention data */
  getCohortRetention: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getRetentionAnalytics(input);
    }),

  /** Coach performance rankings */
  getCoachPerformance: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getCoachPerformance(input);
    }),

  /** Platform health metrics */
  getPlatformHealth: adminProcedure
    .query(async () => {
      return getPlatformHealth();
    }),

  /** Revenue analytics by tier */
  getRevenue: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      return getRevenueAnalytics(input);
    }),
});
