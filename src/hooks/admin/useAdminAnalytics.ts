"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface GrowthPoint {
  month: string;
  signups: number;
  cumulative: number;
}

export interface EngagementPoint {
  date: string;
  checkinRate: number;
}

export interface CohortRetention {
  cohort: string;
  months: number[];
}

/**
 * Hook for admin analytics – tRPC procedures:
 *   trpc.admin.analytics.getUserGrowth       → growth
 *   trpc.admin.analytics.getEngagement       → engagement
 *   trpc.admin.analytics.getCohortRetention  → retention
 */
export function useAdminAnalytics(dateRange: DateRange): {
  growth: GrowthPoint[];
  engagement: EngagementPoint[];
  retention: CohortRetention[];
  isLoading: boolean;
} {
  const startDateStr = dateRange.startDate.toISOString().split("T")[0];
  const endDateStr = dateRange.endDate.toISOString().split("T")[0];

  const growthQuery = trpc.admin.analytics.getUserGrowth.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });
  const engagementQuery = trpc.admin.analytics.getEngagement.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });
  const retentionQuery = trpc.admin.analytics.getCohortRetention.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const isLoading =
    growthQuery.isLoading || engagementQuery.isLoading || retentionQuery.isLoading;

  const growth = useMemo<GrowthPoint[]>(() => {
    if (!growthQuery.data?.dataPoints) return [];
    return growthQuery.data.dataPoints.map((point: any) => {
      const label = new Date(point.date + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return {
        month: label,
        signups: point.newUsers,
        cumulative: point.cumulativeUsers,
      };
    });
  }, [growthQuery.data]);

  const engagement = useMemo<EngagementPoint[]>(() => {
    if (!engagementQuery.data?.dataPoints) return [];
    return engagementQuery.data.dataPoints.map((point: any) => ({
      date: point.date,
      checkinRate: Math.round((point.checkins / (point.dailyActiveUsers || 1)) * 100) || 0,
    }));
  }, [engagementQuery.data]);

  const retention = useMemo<CohortRetention[]>(() => {
    if (!retentionQuery.data?.cohorts) return [];
    return retentionQuery.data.cohorts.map((cohort: any) => ({
      cohort: cohort.label,
      months: cohort.retention,
    }));
  }, [retentionQuery.data]);

  return { growth, engagement, retention, isLoading };
}
