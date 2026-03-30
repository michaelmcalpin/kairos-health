"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface CoachClient {
  id: string;
  name: string;
  tier: string;
  lastActivity: string;
  glucoseAvg: number;
  sleepScore: number;
  adherence: number;
  alertCount: number;
  status: "on-track" | "needs-attention" | "at-risk";
}

export interface CoachAlert {
  id: string;
  clientName: string;
  title: string;
  priority: "urgent" | "action" | "info";
  time: string;
}

export interface CoachDashboardData {
  totalClients: number;
  activeAlerts: number;
  avgAdherence: number;
  clients: CoachClient[];
  recentAlerts: CoachAlert[];
}

/**
 * Hook for coach dashboard – tRPC procedures:
 *   trpc.coach.dashboard.getOverview      → totalClients, activeAlerts
 *   trpc.coach.dashboard.getClientList    → clients with metrics
 *   trpc.coach.dashboard.getRecentActivity → recentAlerts
 */
export function useCoachDashboard(): { data: CoachDashboardData; isLoading: boolean } {
  const overviewQuery = trpc.coach.dashboard.getOverview.useQuery();
  const clientListQuery = trpc.coach.dashboard.getClientList.useQuery();
  const recentActivityQuery = trpc.coach.dashboard.getRecentActivity.useQuery();

  const isLoading = overviewQuery.isLoading || clientListQuery.isLoading || recentActivityQuery.isLoading;

  const data = useMemo<CoachDashboardData>(() => {
    const overview = overviewQuery.data ?? { clientCount: 0, activeAlerts: 0 };
    const clients = clientListQuery.data ?? [];
    const recentActivityRaw = recentActivityQuery.data ?? [];

    // Transform raw clients into CoachClient shape
    const transformedClients: CoachClient[] = clients.map((client: any) => ({
      id: client.id,
      name: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.email || "Unknown",
      tier: client.tier ?? "tier3",
      lastActivity: "Recently active",
      glucoseAvg: client.latestGlucose ?? 100,
      sleepScore: client.latestSleepScore ?? 75,
      adherence: 85,
      alertCount: client.activeAlerts ?? 0,
      status: client.activeAlerts >= 3 ? "at-risk" : client.activeAlerts >= 1 ? "needs-attention" : "on-track",
    }));

    // Transform raw alerts into CoachAlert shape
    const transformedAlerts: CoachAlert[] = recentActivityRaw.map((alert: any) => {
      const createdAt = new Date(alert.createdAt);
      const diffMs = Date.now() - createdAt.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      let timeStr = "Recently";
      if (diffMin < 1) timeStr = "Just now";
      else if (diffMin < 60) timeStr = `${diffMin}m ago`;
      else if (diffHr < 24) timeStr = `${diffHr}h ago`;
      else if (diffDay < 7) timeStr = `${diffDay}d ago`;

      return {
        id: alert.id,
        clientName: "Unknown Client",
        title: alert.title,
        priority: alert.priority || "info",
        time: timeStr,
      };
    });

    const avgAdherence = transformedClients.length > 0
      ? Math.round(transformedClients.reduce((s, c) => s + c.adherence, 0) / transformedClients.length)
      : 0;

    return {
      totalClients: overview.clientCount,
      activeAlerts: overview.activeAlerts,
      avgAdherence,
      clients: transformedClients,
      recentAlerts: transformedAlerts,
    };
  }, [overviewQuery.data, clientListQuery.data, recentActivityQuery.data]);

  return { data, isLoading };
}
