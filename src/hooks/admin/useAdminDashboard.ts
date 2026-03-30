"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

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
 *   trpc.admin.dashboard.getTrainerPerformance → coaches
 *   trpc.admin.dashboard.getRecentActivity   → auditLog
 */
export function useAdminDashboard(): {
  kpis: AdminKPIs;
  coaches: CoachPerformance[];
  auditLog: AuditEntry[];
  isLoading: boolean;
} {
  const kpisQuery = trpc.admin.dashboard.getKPIs.useQuery();
  const coachesQuery = trpc.admin.dashboard.getTrainerPerformance.useQuery();
  const auditQuery = trpc.admin.dashboard.getRecentActivity.useQuery();

  const isLoading = kpisQuery.isLoading || coachesQuery.isLoading || auditQuery.isLoading;

  const kpis = useMemo<AdminKPIs>(() => {
    if (!kpisQuery.data) {
      return {
        totalUsers: 0,
        totalClients: 0,
        totalCoaches: 0,
        activeSubscriptions: 0,
        mrr: 0,
      };
    }
    return {
      totalUsers: kpisQuery.data.totalUsers,
      totalClients: kpisQuery.data.totalClients,
      totalCoaches: kpisQuery.data.totalTrainers,
      activeSubscriptions: kpisQuery.data.activeSubscriptions,
      mrr: Math.round((kpisQuery.data.totalClients ?? 0) * 200),
    };
  }, [kpisQuery.data]);

  const coaches = useMemo<CoachPerformance[]>(() => {
    if (!coachesQuery.data) return [];
    return coachesQuery.data.map((trainer) => ({
      id: trainer.id,
      name: trainer.name,
      clientCount: trainer.clientCount,
      capacity: trainer.capacity,
      avgRating: trainer.rating,
      revenue: trainer.clientCount * 265,
    }));
  }, [coachesQuery.data]);

  const auditLog = useMemo<AuditEntry[]>(() => {
    if (!auditQuery.data) return [];
    return auditQuery.data.map((log) => ({
      id: log.id,
      action: log.action,
      userName: log.userName,
      timestamp: new Date(log.createdAt).toLocaleString(),
    }));
  }, [auditQuery.data]);

  return { kpis, coaches, auditLog, isLoading };
}
