"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";
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
  isMock: boolean;
} {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const growth: GrowthPoint[] = [
      { month: "Sep 2025", signups: 12, cumulative: 12 },
      { month: "Oct 2025", signups: 18, cumulative: 30 },
      { month: "Nov 2025", signups: 24, cumulative: 54 },
      { month: "Dec 2025", signups: 22, cumulative: 76 },
      { month: "Jan 2026", signups: 31, cumulative: 107 },
      { month: "Feb 2026", signups: 35, cumulative: 142 },
    ];
    const engagement: EngagementPoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      checkinRate: Math.round(55 + Math.sin(i * 0.5) * 15 + Math.random() * 10),
    }));
    const retention: CohortRetention[] = [
      { cohort: "Sep 2025", months: [100, 92, 88, 85, 82, 80, 78] },
      { cohort: "Oct 2025", months: [100, 94, 90, 87, 84, 82] },
      { cohort: "Nov 2025", months: [100, 91, 86, 83, 80] },
      { cohort: "Dec 2025", months: [100, 93, 89, 86] },
      { cohort: "Jan 2026", months: [100, 95, 91] },
      { cohort: "Feb 2026", months: [100, 96] },
    ];
    return { growth, engagement, retention };
  }, [dateRange.startDate.getTime()]);

  return { growth: data.growth, engagement: data.engagement, retention: data.retention, isLoading, isMock };
}
