"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import { generateSupplementData, SupplementRecord } from "@/utils/mockDataGenerator";

export interface SupplementStats {
  avgAdherence: number;
  totalDays: number;
  perfectDays: number;
}

export interface UseSupplementsReturn {
  records: SupplementRecord[];
  stats: SupplementStats;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for supplement data – tRPC procedures:
 *   trpc.client.supplements.getAdherence     → records
 *   trpc.client.supplements.adherenceStats   → stats
 *   trpc.client.supplements.getActiveProtocol → protocol items
 */
export function useSupplements(dateRange: DateRange): UseSupplementsReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateSupplementData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const stats = useMemo<SupplementStats>(() => {
    if (records.length === 0) return { avgAdherence: 0, totalDays: 0, perfectDays: 0 };
    return {
      avgAdherence: Math.round(records.reduce((s, r) => s + r.adherence, 0) / records.length),
      totalDays: records.length,
      perfectDays: records.filter((r) => r.adherence === 100).length,
    };
  }, [records]);

  return { records, stats, isLoading, isMock };
}
