// ─── Scheduling Engine ────────────────────────────────────────────────
// Manages appointments, availability, conflict detection, and session notes.
// In-memory store for development; production uses PostgreSQL via Drizzle.

import type {
  Appointment,
  AppointmentStatus,
  BookingRequest,
  CalendarDay,
  CoachAvailability,
  DayOfWeek,
  SessionNote,
  TimeSlot,
} from "./types";
import {
  uid,
  timeToMinutes,
  addMinutesToTime,
  minutesToTime,
  getSessionTypeInfo,
  DEFAULT_AVAILABILITY,
  getTodayStr,
} from "./types";

// ─── In-Memory Store ──────────────────────────────────────────────────

const appointmentsStore = new Map<string, Appointment>();
const availabilityStore = new Map<string, CoachAvailability>();
const sessionNotesStore = new Map<string, SessionNote>();

// ─── Availability Management ──────────────────────────────────────────

export function getCoachAvailability(coachId: string): CoachAvailability {
  const existing = availabilityStore.get(coachId);
  if (existing) return existing;

  const defaults: CoachAvailability = {
    coachId,
    ...DEFAULT_AVAILABILITY,
  };
  availabilityStore.set(coachId, defaults);
  return defaults;
}

export function updateCoachAvailability(
  coachId: string,
  updates: Partial<Omit<CoachAvailability, "coachId">>,
): CoachAvailability {
  const current = getCoachAvailability(coachId);
  const updated: CoachAvailability = { ...current, ...updates };
  availabilityStore.set(coachId, updated);
  return updated;
}

// ─── Available Slots ──────────────────────────────────────────────────

export function getAvailableSlots(
  coachId: string,
  date: string,
  durationMinutes: number,
): TimeSlot[] {
  const availability = getCoachAvailability(coachId);
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay() as DayOfWeek;

  const daySchedule = availability.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.enabled) return [];

  // Check if date is blocked
  if (availability.blockedDates.includes(date)) return [];

  // Get existing appointments for this date
  const existingAppts = getAppointmentsForDate(coachId, date);
  const buffer = availability.bufferMinutes;

  const slots: TimeSlot[] = [];

  for (const block of daySchedule.slots) {
    const blockStart = timeToMinutes(block.start);
    const blockEnd = timeToMinutes(block.end);

    // Generate slots within this block
    let slotStart = blockStart;
    while (slotStart + durationMinutes <= blockEnd) {
      const slotEnd = slotStart + durationMinutes;
      const startStr = minutesToTime(slotStart);
      const endStr = minutesToTime(slotEnd);

      // Check for conflicts with existing appointments (including buffer)
      const hasConflict = existingAppts.some((appt) => {
        if (appt.status === "cancelled") return false;
        const apptStart = timeToMinutes(appt.startTime) - buffer;
        const apptEnd = timeToMinutes(appt.endTime) + buffer;
        return slotStart < apptEnd && slotEnd > apptStart;
      });

      slots.push({
        startTime: startStr,
        endTime: endStr,
        available: !hasConflict,
      });

      slotStart += 15; // 15-minute intervals
    }
  }

  return slots;
}

// ─── Appointment CRUD ─────────────────────────────────────────────────

export function createAppointment(request: BookingRequest): Appointment {
  const sessionInfo = getSessionTypeInfo(request.sessionType);
  const endTime = addMinutesToTime(request.startTime, sessionInfo.durationMinutes);

  // Check for conflicts
  const conflicts = getConflicts(request.coachId, request.date, request.startTime, endTime);
  if (conflicts.length > 0) {
    throw new Error(`Time slot conflicts with existing appointment: ${conflicts[0].id}`);
  }

  // Validate slot is within availability
  const availability = getCoachAvailability(request.coachId);
  const dateObj = new Date(request.date + "T00:00:00");
  const dayOfWeek = dateObj.getDay() as DayOfWeek;
  const daySchedule = availability.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);

  if (!daySchedule || !daySchedule.enabled) {
    throw new Error("Coach is not available on this day");
  }

  if (availability.blockedDates.includes(request.date)) {
    throw new Error("This date is blocked");
  }

  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: uid(),
    coachId: request.coachId,
    clientId: request.clientId,
    coachName: request.coachName,
    clientName: request.clientName,
    sessionType: request.sessionType,
    meetingType: request.meetingType,
    date: request.date,
    startTime: request.startTime,
    endTime,
    status: "confirmed",
    notes: request.notes,
    sessionNotes: "",
    meetingUrl: request.meetingType === "video" ? `https://meet.kairos.health/${uid()}` : null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };

  appointmentsStore.set(appointment.id, appointment);
  return appointment;
}

export function getAppointment(appointmentId: string): Appointment | null {
  return appointmentsStore.get(appointmentId) ?? null;
}

export function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string,
): Appointment {
  const appt = appointmentsStore.get(appointmentId);
  if (!appt) throw new Error("Appointment not found");

  const updated: Appointment = {
    ...appt,
    status,
    cancellationReason: status === "cancelled" ? (reason ?? null) : appt.cancellationReason,
    updatedAt: new Date().toISOString(),
  };
  appointmentsStore.set(appointmentId, updated);
  return updated;
}

export function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
): Appointment {
  const appt = appointmentsStore.get(appointmentId);
  if (!appt) throw new Error("Appointment not found");

  const sessionInfo = getSessionTypeInfo(appt.sessionType);
  const newEndTime = addMinutesToTime(newStartTime, sessionInfo.durationMinutes);

  // Check conflicts excluding this appointment
  const conflicts = getConflicts(appt.coachId, newDate, newStartTime, newEndTime, appointmentId);
  if (conflicts.length > 0) {
    throw new Error("New time slot conflicts with existing appointment");
  }

  const updated: Appointment = {
    ...appt,
    date: newDate,
    startTime: newStartTime,
    endTime: newEndTime,
    updatedAt: new Date().toISOString(),
  };
  appointmentsStore.set(appointmentId, updated);
  return updated;
}

// ─── Query Functions ──────────────────────────────────────────────────

export function getAppointmentsForDate(coachId: string, date: string): Appointment[] {
  return Array.from(appointmentsStore.values()).filter(
    (a) => a.coachId === coachId && a.date === date
  );
}

export function getAppointmentsForWeek(coachId: string, weekStart: string): Appointment[] {
  const startDate = new Date(weekStart + "T00:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  return Array.from(appointmentsStore.values())
    .filter((a) => {
      if (a.coachId !== coachId) return false;
      const apptDate = new Date(a.date + "T00:00:00");
      return apptDate >= startDate && apptDate < endDate;
    })
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
}

export function getClientAppointments(
  clientId: string,
  filter: "upcoming" | "past" | "all" = "all",
): Appointment[] {
  const today = getTodayStr();
  return Array.from(appointmentsStore.values())
    .filter((a) => {
      if (a.clientId !== clientId) return false;
      if (filter === "upcoming") return a.date >= today && a.status !== "cancelled";
      if (filter === "past") return a.date < today || a.status === "completed";
      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
}

export function getCoachAppointments(
  coachId: string,
  filter: "upcoming" | "past" | "all" = "all",
): Appointment[] {
  const today = getTodayStr();
  return Array.from(appointmentsStore.values())
    .filter((a) => {
      if (a.coachId !== coachId) return false;
      if (filter === "upcoming") return a.date >= today && a.status !== "cancelled";
      if (filter === "past") return a.date < today || a.status === "completed";
      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
}

// ─── Conflict Detection ──────────────────────────────────────────────

export function getConflicts(
  coachId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Appointment[] {
  const appts = getAppointmentsForDate(coachId, date);
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return appts.filter((a) => {
    if (a.status === "cancelled") return false;
    if (a.id === excludeAppointmentId) return false;
    const existStart = timeToMinutes(a.startTime);
    const existEnd = timeToMinutes(a.endTime);
    return newStart < existEnd && newEnd > existStart;
  });
}

export function hasConflict(
  coachId: string,
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  return getConflicts(coachId, date, startTime, endTime).length > 0;
}

// ─── Calendar View ──────────────────────────────────────────────────

export function getCalendarWeek(
  coachId: string,
  weekStart: string,
): CalendarDay[] {
  const today = getTodayStr();
  const appointments = getAppointmentsForWeek(coachId, weekStart);

  const start = new Date(weekStart + "T00:00:00");
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    days.push({
      date: dateStr,
      dayOfWeek: d.getDay() as DayOfWeek,
      isToday: dateStr === today,
      appointments: appointments.filter((a) => a.date === dateStr),
    });
  }

  return days;
}

// ─── Session Notes ──────────────────────────────────────────────────

export function saveSessionNotes(
  appointmentId: string,
  coachId: string,
  notes: Omit<SessionNote, "appointmentId" | "coachId" | "createdAt">,
): SessionNote {
  const appt = appointmentsStore.get(appointmentId);
  if (!appt) throw new Error("Appointment not found");
  if (appt.coachId !== coachId) throw new Error("Not authorized");

  const sessionNote: SessionNote = {
    appointmentId,
    coachId,
    ...notes,
    createdAt: new Date().toISOString(),
  };
  sessionNotesStore.set(appointmentId, sessionNote);

  // Update appointment status to completed
  appointmentsStore.set(appointmentId, {
    ...appt,
    status: "completed",
    sessionNotes: notes.summary,
    updatedAt: new Date().toISOString(),
  });

  return sessionNote;
}

export function getSessionNotes(appointmentId: string): SessionNote | null {
  return sessionNotesStore.get(appointmentId) ?? null;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface SchedulingStats {
  totalAppointments: number;
  upcomingAppointments: number;
  completedThisWeek: number;
  cancelledThisWeek: number;
  hoursBookedThisWeek: number;
  todayAppointments: number;
  noShowRate: number;
}

export function getSchedulingStats(coachId: string): SchedulingStats {
  const all = Array.from(appointmentsStore.values()).filter((a) => a.coachId === coachId);
  const today = getTodayStr();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const thisWeek = all.filter((a) => a.date >= weekAgoStr);
  const upcoming = all.filter((a) => a.date >= today && a.status !== "cancelled");
  const todayAppts = all.filter((a) => a.date === today && a.status !== "cancelled");
  const completedThisWeek = thisWeek.filter((a) => a.status === "completed").length;
  const cancelledThisWeek = thisWeek.filter((a) => a.status === "cancelled").length;
  const noShows = all.filter((a) => a.status === "no_show").length;

  let hoursBooked = 0;
  for (const appt of upcoming) {
    const duration = timeToMinutes(appt.endTime) - timeToMinutes(appt.startTime);
    hoursBooked += duration / 60;
  }

  return {
    totalAppointments: all.length,
    upcomingAppointments: upcoming.length,
    completedThisWeek,
    cancelledThisWeek,
    hoursBookedThisWeek: Math.round(hoursBooked * 10) / 10,
    todayAppointments: todayAppts.length,
    noShowRate: all.length > 0 ? Math.round((noShows / all.length) * 100) : 0,
  };
}

// ─── Store Reset (for testing) ────────────────────────────────────────

export function resetSchedulingStore(): void {
  appointmentsStore.clear();
  availabilityStore.clear();
  sessionNotesStore.clear();
}
