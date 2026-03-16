"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
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
  isMock: boolean;
} {
  const { data: alerts, isLoading, isMock } = useMockQuery(() => {
    const templates: Omit<CoachAlertItem, "id">[] = [
      { clientId: "3", clientName: "Emily Rodriguez", title: "Glucose spike > 180 mg/dL", message: "Post-dinner reading of 186 mg/dL detected", priority: "urgent", status: "active", category: "glucose", createdAt: "30m ago" },
      { clientId: "2", clientName: "James Miller", title: "Sleep score below 70 for 3 days", message: "Consecutive low sleep quality may indicate issues", priority: "action", status: "active", category: "sleep", createdAt: "2h ago" },
      { clientId: "6", clientName: "David Kim", title: "Missed supplement protocol", message: "2 consecutive days of missed supplements", priority: "action", status: "active", category: "adherence", createdAt: "5h ago" },
      { clientId: "3", clientName: "Emily Rodriguez", title: "Fasting protocol not started", message: "No fasting session logged this week", priority: "info", status: "active", category: "fasting", createdAt: "8h ago" },
      { clientId: "2", clientName: "James Miller", title: "Weekly check-in overdue", message: "Last check-in was 9 days ago", priority: "info", status: "active", category: "engagement", createdAt: "1d ago" },
      { clientId: "8", clientName: "Robert Lee", title: "Weight trend increasing", message: "Weight up 3.2 lbs over last 2 weeks", priority: "action", status: "active", category: "measurements", createdAt: "1d ago" },
      { clientId: "1", clientName: "Sarah Chen", title: "Lab results ready", message: "Comprehensive metabolic panel results available", priority: "info", status: "acknowledged", category: "labs", createdAt: "2d ago" },
    ];
    return templates.map((t, i) => ({ ...t, id: `alert-${i}` }));
  }, [dateRange.startDate.getTime()]);

  const summary = useMemo<CoachAlertsSummary>(() => {
    const active = alerts.filter((a) => a.status === "active");
    return {
      urgent: active.filter((a) => a.priority === "urgent").length,
      action: active.filter((a) => a.priority === "action").length,
      info: active.filter((a) => a.priority === "info").length,
      total: active.length,
    };
  }, [alerts]);

  return { alerts, summary, isLoading, isMock };
}
