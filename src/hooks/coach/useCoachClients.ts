"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { CoachClient } from "./useCoachDashboard";

/**
 * Hook for coach client list – tRPC procedures:
 *   trpc.coach.clients.list → clients
 *   trpc.coach.clients.getDetail → single client detail
 */
export function useCoachClients(): { clients: CoachClient[]; isLoading: boolean } {
  const listQuery = trpc.coach.clients.list.useQuery();

  const clients = useMemo<CoachClient[]>(() => {
    const rawClients = listQuery.data ?? [];

    return rawClients.map((client: any) => ({
      id: client.id,
      name: client.name,
      tier: client.tier,
      lastActivity: client.lastActive,
      glucoseAvg: client.metrics?.avgGlucose ?? 100,
      sleepScore: client.metrics?.sleepScore ?? 75,
      adherence: client.adherence ?? 85,
      alertCount: client.activeAlerts ?? 0,
      status: client.status === "critical" ? "at-risk" : client.status === "attention" ? "needs-attention" : "on-track",
    }));
  }, [listQuery.data]);

  return { clients, isLoading: listQuery.isLoading };
}
