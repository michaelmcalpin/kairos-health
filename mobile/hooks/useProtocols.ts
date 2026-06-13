/**
 * useProtocols — Custom hook for protocol / supplement tracker data.
 *
 * Tries to fetch the active supplement protocol and today's adherence
 * from the tRPC backend.  Falls back to sample data when the API is
 * unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - protocol.getActive      → active protocol with items
 *   - protocol.getAdherence   → today's adherence logs
 *   - protocol.logAdherence   → mark item taken / skipped
 *   - dashboard.getActiveProtocol → dashboard summary variant
 */

import { trpc, SAMPLE_DATA, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import type { SampleProtocolItem } from "@/lib/sample-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useActiveProtocol — full protocol item list for Protocols tab
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useActiveProtocol() {
  const query = trpc.clientPortal.protocol.getActive.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // Map backend items to the shape the Protocols screen expects
  const items: SampleProtocolItem[] = query.data?.items
    ? query.data.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        dosage: item.dosage
          ? `${item.dosage}${item.unit ? ` ${item.unit}` : ""}`
          : "",
        form: item.form ?? undefined,
        category: mapCategory(item.category),
        timeSlot: mapTimeOfDay(item.timeOfDay),
        hasNotes: !!item.coachNotes,
      }))
    : SAMPLE_DATA.protocolItems;

  return {
    protocolId: query.data?.id ?? null,
    items,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useProtocolAdherence — today's check-off state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useProtocolAdherence() {
  const today = new Date().toISOString().split("T")[0];

  const query = trpc.clientPortal.protocol.getAdherence.useQuery(
    { date: today },
    DEFAULT_QUERY_OPTIONS,
  );

  // Build a Set of completed item IDs from the adherence logs
  const completedIds: Set<string> = query.data
    ? new Set(
        (query.data as any[])
          .filter((log: any) => log.takenAt && !log.skipped)
          .map((log: any) => log.protocolItemId),
      )
    : SAMPLE_DATA.protocolInitialCompleted;

  return {
    completedIds,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLogAdherence — mutation to toggle an item taken/skipped
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useLogAdherence() {
  const mutation = trpc.clientPortal.protocol.logAdherence.useMutation();

  const logItem = (protocolItemId: string, taken: boolean) => {
    const today = new Date().toISOString().split("T")[0];
    mutation.mutate({
      protocolItemId,
      date: today,
      taken,
      skipped: !taken,
    });
  };

  return {
    logItem,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useDashboardProtocol — lighter protocol summary for dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDashboardProtocol() {
  const query = trpc.clientPortal.dashboard.getActiveProtocol.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const protocols = query.data?.items
    ? (query.data.items as any[]).map((item: any, idx: number) => ({
        id: item.id,
        title: item.name,
        dosage: item.dosage
          ? `${item.dosage}${item.unit ? ` ${item.unit}` : ""}`
          : "",
        time: item.timeOfDay ?? "Any time",
        category: mapCategory(item.category),
        completed: idx < (query.data?.todayAdherence?.completed ?? 0),
      }))
    : SAMPLE_DATA.dashboardProtocols;

  const adherence = query.data?.todayAdherence ?? {
    total: SAMPLE_DATA.dashboardProtocols.length,
    completed: SAMPLE_DATA.dashboardProtocols.filter((p) => p.completed).length,
  };

  return {
    protocols,
    adherence,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useWeeklyAdherence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useWeeklyAdherence() {
  // The backend getDailySummaries endpoint gives adherence per day.
  // Build the date range for the current week (Mon–Sun).
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split("T")[0];
  const endDate = sunday.toISOString().split("T")[0];

  const query = trpc.clientPortal.dashboard.getDailySummaries.useQuery(
    { startDate, endDate },
    DEFAULT_QUERY_OPTIONS,
  );

  const weeklyData = query.data
    ? (query.data as any[]).map((d: any) => ({
        day: d.dateLabel ?? "",
        percent: d.adherence ?? 0,
        isToday: d.date === now.toISOString().split("T")[0],
      }))
    : SAMPLE_DATA.weeklyAdherence;

  return {
    weeklyData,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapCategory(
  raw?: string | null,
): "supplement" | "medication" | "peptide" | "exercise" {
  if (!raw) return "supplement";
  const lower = raw.toLowerCase();
  if (lower.includes("med")) return "medication";
  if (lower.includes("pep")) return "peptide";
  if (lower.includes("exer") || lower.includes("workout") || lower.includes("cardio"))
    return "exercise";
  return "supplement";
}

function mapTimeOfDay(
  raw?: string | null,
): "morning" | "afternoon" | "evening" | "bedtime" {
  if (!raw) return "morning";
  const lower = raw.toLowerCase();
  if (lower.includes("bed") || lower.includes("night")) return "bedtime";
  if (lower.includes("even")) return "evening";
  if (lower.includes("after")) return "afternoon";
  return "morning";
}
