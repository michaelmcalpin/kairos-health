/**
 * useAppointments — Custom hook for appointment / scheduling data.
 *
 * Tries to fetch appointments from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - scheduling.listAppointments  → upcoming + past
 *   - scheduling.getAppointment    → single appointment detail
 *   - scheduling.getSessionTypes   → available session types
 *   - scheduling.cancelAppointment → cancel
 */

import { trpc, SAMPLE_DATA, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";
import type { SampleAppointment } from "@/lib/sample-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAppointments — list with "upcoming" | "past" filter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAppointments(
  filter: "upcoming" | "past" | "all" = "all",
) {
  const query = trpc.clientPortal.scheduling.listAppointments.useQuery(
    { filter },
    DEFAULT_QUERY_OPTIONS,
  );

  const appointments: SampleAppointment[] = query.data
    ? (query.data as any[]).map(mapApiAppointment)
    : filter === "upcoming"
      ? SAMPLE_DATA.upcomingAppointments
      : filter === "past"
        ? SAMPLE_DATA.pastAppointments
        : [
            ...SAMPLE_DATA.upcomingAppointments,
            ...SAMPLE_DATA.pastAppointments,
          ];

  return {
    appointments,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useUpcomingAppointments — convenience wrapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useUpcomingAppointments() {
  return useAppointments("upcoming");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// usePastAppointments — convenience wrapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function usePastAppointments() {
  return useAppointments("past");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAppointmentDetail — single appointment by ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAppointmentDetail(appointmentId: string | null) {
  const query = trpc.clientPortal.scheduling.getAppointment.useQuery(
    { appointmentId: appointmentId ?? "" },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && !!appointmentId,
    },
  );

  const appointment: SampleAppointment | null = query.data
    ? mapApiAppointment(query.data)
    : null;

  return {
    appointment,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSessionTypes — available booking types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSessionTypes() {
  const query = trpc.clientPortal.scheduling.getSessionTypes.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );

  return {
    sessionTypes: (query.data as any[]) ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useCancelAppointment — mutation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useCancelAppointment() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.scheduling.cancelAppointment.useMutation({
    onSuccess: () => {
      utils.clientPortal.scheduling.listAppointments.invalidate();
    },
  });

  const cancel = (appointmentId: string, reason?: string) => {
    mutation.mutate({ id: appointmentId, reason });
  };

  return {
    cancel,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useTodaySchedule — upcoming appointments formatted for dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useTodaySchedule() {
  const { appointments, isLoading, error, refetch } =
    useAppointments("upcoming");

  const today = new Date().toISOString().split("T")[0];

  // Filter to today only (for real data) or return sample schedule
  const schedule = appointments.length > 0
    ? appointments
        .filter((a) => {
          // Try to match ISO date from the API; sample data uses "June 15, 2026" format
          try {
            const aptDate = new Date(a.date).toISOString().split("T")[0];
            return aptDate === today;
          } catch {
            return false;
          }
        })
        .map((a) => ({
          id: a.id,
          time: a.time,
          title: a.title,
          type: mapSessionType(a.type),
          coachName: a.provider,
          duration: "30 min", // default; backend could provide this
        }))
    : SAMPLE_DATA.scheduleData;

  return {
    schedule,
    isLoading,
    error,
    refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiAppointment(raw: any): SampleAppointment {
  const status = raw.status ?? "confirmed";
  return {
    id: raw.id,
    title: buildTitle(raw.sessionType),
    type: raw.sessionType ?? raw.type ?? "General",
    provider: raw.coachName ?? raw.provider ?? "",
    date: formatDate(raw.date),
    time: formatTime(raw.startTime),
    method: raw.meetingType === "video" || raw.meetingType === "Video Call"
      ? "Video Call"
      : "In-Person",
    status,
    badgeVariant: statusToBadge(status),
  };
}

function buildTitle(sessionType?: string): string {
  if (!sessionType) return "Appointment";
  return sessionType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(raw?: string): string {
  if (!raw) return "";
  try {
    return new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function formatTime(raw?: string): string {
  if (!raw) return "";
  // raw is "HH:MM" — convert to "h:mm AM/PM"
  try {
    const [h, m] = raw.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return raw;
  }
}

function statusToBadge(
  status: string,
): "success" | "warning" | "info" | "default" | "danger" {
  switch (status) {
    case "confirmed":
      return "success";
    case "pending":
      return "info";
    case "cancelled":
      return "danger";
    case "completed":
      return "default";
    default:
      return "warning";
  }
}

function mapSessionType(
  raw: string,
): "lab_review" | "workout" | "nutrition" | "check_in" {
  const lower = raw.toLowerCase();
  if (lower.includes("lab")) return "lab_review";
  if (
    lower.includes("workout") ||
    lower.includes("fitness") ||
    lower.includes("exercise")
  )
    return "workout";
  if (lower.includes("nutrition") || lower.includes("meal")) return "nutrition";
  return "check_in";
}
