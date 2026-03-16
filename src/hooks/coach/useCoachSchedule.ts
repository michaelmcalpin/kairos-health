"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";
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
  isMock: boolean;
} {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const appointments: Appointment[] = [
      { id: "apt1", clientName: "Sarah Chen", type: "Weekly Review", date: "Mon", time: "9:00 AM", duration: 30, status: "confirmed" },
      { id: "apt2", clientName: "James Miller", type: "Protocol Adjustment", date: "Mon", time: "10:30 AM", duration: 45, status: "confirmed" },
      { id: "apt3", clientName: "Lisa Thompson", type: "Lab Review", date: "Tue", time: "2:00 PM", duration: 30, status: "confirmed" },
      { id: "apt4", clientName: "Emily Rodriguez", type: "Urgent Check-in", date: "Tue", time: "4:00 PM", duration: 30, status: "pending" },
      { id: "apt5", clientName: "Michael Park", type: "Monthly Assessment", date: "Wed", time: "11:00 AM", duration: 60, status: "confirmed" },
      { id: "apt6", clientName: "David Kim", type: "Onboarding", date: "Thu", time: "9:00 AM", duration: 60, status: "confirmed" },
      { id: "apt7", clientName: "Anna Wright", type: "Weekly Review", date: "Fri", time: "10:00 AM", duration: 30, status: "confirmed" },
    ];
    const profile: CoachProfile = { maxCapacity: 12, currentClients: 8, availableSlots: 4 };
    return { appointments, profile };
  }, [dateRange.startDate.getTime()]);

  return { appointments: data.appointments, profile: data.profile, isLoading, isMock };
}
