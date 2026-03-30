"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface CoachAlertItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  message: string;
  priority: "urgent" | "action" | "info";
  status: "active" | "acknowledged" | "resolved";
  category: string;
  createdAt: string;
}

export interface CoachAlertsSummary {
  urgent: number;
  action: number;
  info: number;
  total: number;
}

/**
 * Hook for coach alerts – tRPC procedures:
 *   trpc.coach.alerts.list    → alerts
 *   trpc.coach.alerts.summary → summary counts
 */
export function useCoachAlerts(dateRange: DateRange): {
  alerts: CoachAlertItem[];
  summary: CoachAlertsSummary;
  isLoading: boolean;
} {
  const listQuery = trpc.coach.alerts.list.useQuery({
    status: "all",
    limit: 100,
    offset: 0,
  });
  const summaryQuery = trpc.coach.alerts.summary.useQuery();

  const alerts = useMemo<CoachAlertItem[]>(() => {
    const rawAlerts = listQuery.data?.alerts ?? [];

    return rawAlerts.map((alert: any) => ({
      id: alert.id,
      clientId: alert.clientId,
      clientName: alert.clientName,
      title: alert.title,
      message: alert.message ?? alert.title,
      priority: alert.priority || "info",
      status: alert.status || "active",
      category: alert.type ?? "general",
      createdAt: alert.createdAt instanceof Date
        ? alert.createdAt.toISOString()
        : String(alert.createdAt),
    }));
  }, [listQuery.data]);

  const summary = useMemo<CoachAlertsSummary>(() => {
    const rawSummary = summaryQuery.data ?? { urgent: 0, action: 0, info: 0 };
    return {
      urgent: rawSummary.urgent,
      action: rawSummary.action,
      info: rawSummary.info,
      total: (rawSummary.urgent ?? 0) + (rawSummary.action ?? 0) + (rawSummary.info ?? 0),
    };
  }, [summaryQuery.data]);

  const isLoading = listQuery.isLoading || summaryQuery.isLoading;

  return { alerts, summary, isLoading };
}
