"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface Appointment {
  id: string;
  clientName: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  status: "confirmed" | "pending" | "cancelled";
}

export interface CoachProfile {
  maxCapacity: number;
  currentClients: number;
  availableSlots: number;
}

/**
 * Hook for coach schedule – tRPC procedures:
 *   trpc.coach.schedule.getProfile         → profile
 *   trpc.coach.schedule.listAppointments   → appointments
 */
export function useCoachSchedule(dateRange: DateRange): {
  appointments: Appointment[];
  profile: CoachProfile;
  isLoading: boolean;
} {
  const weekStart = dateRange.startDate.toISOString().split("T")[0];

  const profileQuery = trpc.coach.schedule.getProfile.useQuery();
  const appointmentsQuery = trpc.coach.schedule.listAppointments.useQuery({
    weekStart,
  });

  const appointments = useMemo<Appointment[]>(() => {
    const rawAppointments = appointmentsQuery.data?.appointments ?? [];

    return rawAppointments.map((appt: any) => {
      const [hours, minutes] = (appt.startTime ?? "09:00").split(":").map(Number);
      const timeStr = `${hours > 12 ? hours - 12 : hours}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
      const dayOfWeek = new Date(appt.date).toLocaleDateString("en-US", { weekday: "short" });

      return {
        id: appt.id,
        clientName: appt.clientName,
        type: appt.sessionType ?? "Appointment",
        date: dayOfWeek,
        time: timeStr,
        duration: appt.durationMinutes ?? 60,
        status: appt.status ?? "confirmed",
      };
    });
  }, [appointmentsQuery.data]);

  const profile = useMemo<CoachProfile>(() => {
    const rawProfile = profileQuery.data;
    return {
      maxCapacity: rawProfile?.capacity ?? 12,
      currentClients: rawProfile?.capacity ?? 8,
      availableSlots: Math.max(0, (rawProfile?.capacity ?? 12) - 8),
    };
  }, [profileQuery.data]);

  const isLoading = profileQuery.isLoading || appointmentsQuery.isLoading;

  return { appointments, profile, isLoading };
}
