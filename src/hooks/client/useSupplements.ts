"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface SupplementRecord {
  date: string;
  adherence: number;
  taken: number;
  total: number;
}

export interface SupplementStats {
  avgAdherence: number;
  totalDays: number;
  perfectDays: number;
}

export interface UseSupplementsReturn {
  records: SupplementRecord[];
  stats: SupplementStats;
  isLoading: boolean;
}

export function useSupplements(dateRange: DateRange): UseSupplementsReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawStats, isLoading } = trpc.clientPortal.supplements.adherenceStats.useQuery(
    { startDate, endDate }
  );

  const records = useMemo<SupplementRecord[]>(() => {
    if (!rawStats) return [];
    return rawStats.map((r) => ({
      date: r.date,
      adherence: r.percentage,
      taken: r.taken,
      total: r.total,
    }));
  }, [rawStats]);

  const stats = useMemo<SupplementStats>(() => {
    if (records.length === 0) return { avgAdherence: 0, totalDays: 0, perfectDays: 0 };
    return {
      avgAdherence: Math.round(records.reduce((s, r) => s + r.adherence, 0) / records.length),
      totalDays: records.length,
      perfectDays: records.filter((r) => r.adherence === 100).length,
    };
  }, [records]);

  return { records, stats, isLoading };
}
