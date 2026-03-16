"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";

export interface AdminKPIs {
  totalUsers: number;
  totalClients: number;
  totalCoaches: number;
  activeSubscriptions: number;
  mrr: number;
}

export interface CoachPerformance {
  id: string;
  name: string;
  clientCount: number;
  capacity: number;
  avgRating: number;
  revenue: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  userName: string;
  timestamp: string;
}

/**
 * Hook for admin dashboard – tRPC procedures:
 *   trpc.admin.dashboard.getKPIs             → kpis
 *   trpc.admin.dashboard.getCoachPerformance → coaches
 *   trpc.admin.dashboard.getRecentActivity   → auditLog
 */
export function useAdminDashboard(): {
  kpis: AdminKPIs;
  coaches: CoachPerformance[];
  auditLog: AuditEntry[];
  isLoading: boolean;
  isMock: boolean;
} {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const kpis: AdminKPIs = {
      totalUsers: 156,
      totalClients: 142,
      totalCoaches: 12,
      activeSubscriptions: 138,
      mrr: 28450,
    };
    const coaches: CoachPerformance[] = [
      { id: "c1", name: "Dr. Sarah Williams", clientCount: 8, capacity: 12, avgRating: 4.9, revenue: 3180 },
      { id: "c2", name: "Coach Mike Torres", clientCount: 10, capacity: 15, avgRating: 4.7, revenue: 3540 },
      { id: "c3", name: "Dr. Jennifer Chang", clientCount: 6, capacity: 8, avgRating: 4.8, revenue: 2694 },
      { id: "c4", name: "Coach Alex Rivera", clientCount: 12, capacity: 15, avgRating: 4.6, revenue: 4120 },
      { id: "c5", name: "Dr. Rachel Green", clientCount: 7, capacity: 10, avgRating: 4.9, revenue: 2990 },
    ];
    const auditLog: AuditEntry[] = [
      { id: "au1", action: "User onboarding completed", userName: "Robert Lee", timestamp: "2m ago" },
      { id: "au2", action: "Subscription upgraded to Tier 1", userName: "Anna Wright", timestamp: "15m ago" },
      { id: "au3", action: "Coach capacity increased", userName: "Coach Mike Torres", timestamp: "1h ago" },
      { id: "au4", action: "Lab results uploaded", userName: "System", timestamp: "2h ago" },
      { id: "au5", action: "Alert rule modified", userName: "Dr. Sarah Williams", timestamp: "3h ago" },
    ];
    return { kpis, coaches, auditLog };
  }, []);

  return { kpis: data.kpis, coaches: data.coaches, auditLog: data.auditLog, isLoading, isMock };
}
