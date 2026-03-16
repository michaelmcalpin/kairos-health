"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";
import { CoachClient } from "./useCoachDashboard";

/**
 * Hook for coach client list – tRPC procedures:
 *   trpc.coach.clients.list → clients
 *   trpc.coach.clients.getDetail → single client detail
 */
export function useCoachClients(): { clients: CoachClient[]; isLoading: boolean; isMock: boolean } {
  const { data: clients, isLoading, isMock } = useMockQuery(() => {
    return [
      { id: "1", name: "Sarah Chen", tier: "tier1", lastActivity: "2h ago", glucoseAvg: 94, sleepScore: 88, adherence: 96, alertCount: 0, status: "on-track" as const },
      { id: "2", name: "James Miller", tier: "tier1", lastActivity: "5h ago", glucoseAvg: 108, sleepScore: 72, adherence: 82, alertCount: 2, status: "needs-attention" as const },
      { id: "3", name: "Emily Rodriguez", tier: "tier2", lastActivity: "1d ago", glucoseAvg: 112, sleepScore: 65, adherence: 68, alertCount: 3, status: "at-risk" as const },
      { id: "4", name: "Michael Park", tier: "tier2", lastActivity: "3h ago", glucoseAvg: 91, sleepScore: 91, adherence: 94, alertCount: 0, status: "on-track" as const },
      { id: "5", name: "Lisa Thompson", tier: "tier1", lastActivity: "1h ago", glucoseAvg: 97, sleepScore: 84, adherence: 90, alertCount: 1, status: "on-track" as const },
      { id: "6", name: "David Kim", tier: "tier3", lastActivity: "12h ago", glucoseAvg: 102, sleepScore: 78, adherence: 75, alertCount: 1, status: "needs-attention" as const },
      { id: "7", name: "Anna Wright", tier: "tier2", lastActivity: "4h ago", glucoseAvg: 89, sleepScore: 82, adherence: 88, alertCount: 0, status: "on-track" as const },
      { id: "8", name: "Robert Lee", tier: "tier3", lastActivity: "6h ago", glucoseAvg: 105, sleepScore: 70, adherence: 72, alertCount: 2, status: "needs-attention" as const },
    ];
  }, []);

  return { clients, isLoading, isMock };
}
