"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";

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
export function useCoachDashboard(): { data: CoachDashboardData; isLoading: boolean; isMock: boolean } {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const clients: CoachClient[] = [
      { id: "1", name: "Sarah Chen", tier: "tier1", lastActivity: "2h ago", glucoseAvg: 94, sleepScore: 88, adherence: 96, alertCount: 0, status: "on-track" },
      { id: "2", name: "James Miller", tier: "tier1", lastActivity: "5h ago", glucoseAvg: 108, sleepScore: 72, adherence: 82, alertCount: 2, status: "needs-attention" },
      { id: "3", name: "Emily Rodriguez", tier: "tier2", lastActivity: "1d ago", glucoseAvg: 112, sleepScore: 65, adherence: 68, alertCount: 3, status: "at-risk" },
      { id: "4", name: "Michael Park", tier: "tier2", lastActivity: "3h ago", glucoseAvg: 91, sleepScore: 91, adherence: 94, alertCount: 0, status: "on-track" },
      { id: "5", name: "Lisa Thompson", tier: "tier1", lastActivity: "1h ago", glucoseAvg: 97, sleepScore: 84, adherence: 90, alertCount: 1, status: "on-track" },
      { id: "6", name: "David Kim", tier: "tier3", lastActivity: "12h ago", glucoseAvg: 102, sleepScore: 78, adherence: 75, alertCount: 1, status: "needs-attention" },
    ];
    const recentAlerts: CoachAlert[] = [
      { id: "a1", clientName: "Emily Rodriguez", title: "Glucose spike > 180 mg/dL", priority: "urgent", time: "30m ago" },
      { id: "a2", clientName: "James Miller", title: "Sleep score below 70 for 3 days", priority: "action", time: "2h ago" },
      { id: "a3", clientName: "David Kim", title: "Missed supplement protocol 2 days", priority: "action", time: "5h ago" },
      { id: "a4", clientName: "Emily Rodriguez", title: "Fasting protocol not started", priority: "info", time: "8h ago" },
      { id: "a5", clientName: "James Miller", title: "Weekly check-in overdue", priority: "info", time: "1d ago" },
    ];
    return {
      totalClients: clients.length,
      activeAlerts: recentAlerts.filter((a) => a.priority !== "info").length,
      avgAdherence: Math.round(clients.reduce((s, c) => s + c.adherence, 0) / clients.length),
      clients,
      recentAlerts,
    };
  }, []);

  return { data, isLoading, isMock };
}
