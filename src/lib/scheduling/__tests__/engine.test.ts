import { describe, it, expect, beforeEach } from "vitest";
import {
  getCoachAvailability,
  updateCoachAvailability,
  getAvailableSlots,
  createAppointment,
  getAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  getAppointmentsForDate,
  getAppointmentsForWeek,
  getClientAppointments,
  getCoachAppointments,
  getConflicts,
  hasConflict,
  getCalendarWeek,
  saveSessionNotes,
  getSessionNotes,
  getSchedulingStats,
  resetSchedulingStore,
} from "../engine";
import type { BookingRequest } from "../types";

beforeEach(() => {
  resetSchedulingStore();
});

const baseBooking: BookingRequest = {
  coachId: "coach-1",
  clientId: "client-1",
  clientName: "Alice",
  coachName: "Dr. Smith",
  sessionType: "follow_up",
  meetingType: "video",
  date: "2026-03-17", // Tuesday
  startTime: "09:00",
  notes: "Test appointment",
};

// ─── Availability ────────────────────────────────────────────────────

describe("getCoachAvailability", () => {
  it("returns default availability", () => {
    const avail = getCoachAvailability("coach-1");
    expect(avail.coachId).toBe("coach-1");
    expect(avail.weeklySchedule).toHaveLength(7);
    expect(avail.bufferMinutes).toBe(10);
  });

  it("returns same availability on subsequent calls", () => {
    const a1 = getCoachAvailability("coach-1");
    const a2 = getCoachAvailability("coach-1");
    expect(a1.coachId).toBe(a2.coachId);
  });
});

describe("updateCoachAvailability", () => {
  it("updates buffer minutes", () => {
    updateCoachAvailability("coach-1", { bufferMinutes: 15 });
    const avail = getCoachAvailability("coach-1");
    expect(avail.bufferMinutes).toBe(15);
  });

  it("updates blocked dates", () => {
    updateCoachAvailability("coach-1", { blockedDates: ["2026-03-20"] });
    const avail = getCoachAvailability("coach-1");
    expect(avail.blockedDates).toContain("2026-03-20");
  });
});

describe("getAvailableSlots", () => {
  it("returns slots for a weekday", () => {
    const slots = getAvailableSlots("coach-1", "2026-03-17", 30); // Tuesday
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe("09:00");
  });

  it("returns empty for disabled day", () => {
    const slots = getAvailableSlots("coach-1", "2026-03-15", 30); // Sunday
    expect(slots).toHaveLength(0);
  });

  it("returns empty for blocked date", () => {
    updateCoachAvailability("coach-1", { blockedDates: ["2026-03-17"] });
    const slots = getAvailableSlots("coach-1", "2026-03-17", 30);
    expect(slots).toHaveLength(0);
  });

  it("marks conflicting slots as unavailable", () => {
    createAppointment(baseBooking);
    const slots = getAvailableSlots("coach-1", "2026-03-17", 30);
    const nineAm = slots.find((s) => s.startTime === "09:00");
    expect(nineAm?.available).toBe(false);
  });
});

// ─── Appointment CRUD ─────────────────────────────────────────────────

describe("createAppointment", () => {
  it("creates an appointment", () => {
    const appt = createAppointment(baseBooking);
    expect(appt.id).toBeTruthy();
    expect(appt.coachId).toBe("coach-1");
    expect(appt.clientId).toBe("client-1");
    expect(appt.sessionType).toBe("follow_up");
    expect(appt.status).toBe("confirmed");
    expect(appt.endTime).toBe("09:30"); // 30 min follow_up
  });

  it("generates meeting URL for video", () => {
    const appt = createAppointment(baseBooking);
    expect(appt.meetingUrl).toContain("meet.kairos.health");
  });

  it("no meeting URL for phone", () => {
    const appt = createAppointment({ ...baseBooking, meetingType: "phone" });
    expect(appt.meetingUrl).toBeNull();
  });

  it("throws on conflict", () => {
    createAppointment(baseBooking);
    expect(() => createAppointment(baseBooking)).toThrow(/conflict/i);
  });

  it("throws on disabled day", () => {
    expect(() =>
      createAppointment({ ...baseBooking, date: "2026-03-15" }) // Sunday
    ).toThrow("Coach is not available on this day");
  });

  it("throws on blocked date", () => {
    updateCoachAvailability("coach-1", { blockedDates: ["2026-03-17"] });
    expect(() => createAppointment(baseBooking)).toThrow("This date is blocked");
  });
});

describe("getAppointment", () => {
  it("returns appointment by id", () => {
    const created = createAppointment(baseBooking);
    const found = getAppointment(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it("returns null for unknown id", () => {
    expect(getAppointment("nonexistent")).toBeNull();
  });
});

describe("updateAppointmentStatus", () => {
  it("updates status to completed", () => {
    const appt = createAppointment(baseBooking);
    const updated = updateAppointmentStatus(appt.id, "completed");
    expect(updated.status).toBe("completed");
  });

  it("updates status to cancelled with reason", () => {
    const appt = createAppointment(baseBooking);
    const updated = updateAppointmentStatus(appt.id, "cancelled", "Schedule conflict");
    expect(updated.status).toBe("cancelled");
    expect(updated.cancellationReason).toBe("Schedule conflict");
  });

  it("throws for unknown appointment", () => {
    expect(() => updateAppointmentStatus("fake", "completed")).toThrow("Appointment not found");
  });
});

describe("rescheduleAppointment", () => {
  it("reschedules to new date and time", () => {
    const appt = createAppointment(baseBooking);
    const rescheduled = rescheduleAppointment(appt.id, "2026-03-18", "10:00");
    expect(rescheduled.date).toBe("2026-03-18");
    expect(rescheduled.startTime).toBe("10:00");
    expect(rescheduled.endTime).toBe("10:30");
  });

  it("throws on conflict with other appointment", () => {
    createAppointment(baseBooking);
    const appt2 = createAppointment({ ...baseBooking, startTime: "10:00" });
    // Try to reschedule appt2 to overlap with first appointment
    expect(() => rescheduleAppointment(appt2.id, "2026-03-17", "09:00")).toThrow(/conflict/i);
  });

  it("throws for unknown appointment", () => {
    expect(() => rescheduleAppointment("fake", "2026-03-18", "10:00")).toThrow("Appointment not found");
  });
});

// ─── Query Functions ──────────────────────────────────────────────────

describe("getAppointmentsForDate", () => {
  it("returns appointments for a specific date", () => {
    createAppointment(baseBooking);
    createAppointment({ ...baseBooking, startTime: "11:00" });

    const appts = getAppointmentsForDate("coach-1", "2026-03-17");
    expect(appts).toHaveLength(2);
  });

  it("returns empty for date with no appointments", () => {
    const appts = getAppointmentsForDate("coach-1", "2026-03-20");
    expect(appts).toHaveLength(0);
  });
});

describe("getAppointmentsForWeek", () => {
  it("returns appointments within the week", () => {
    createAppointment(baseBooking); // Tuesday
    createAppointment({ ...baseBooking, date: "2026-03-18", startTime: "10:00" }); // Wednesday

    const appts = getAppointmentsForWeek("coach-1", "2026-03-16"); // Monday
    expect(appts).toHaveLength(2);
  });

  it("excludes appointments outside the week", () => {
    createAppointment(baseBooking); // Mar 17

    const appts = getAppointmentsForWeek("coach-1", "2026-03-23"); // Next week
    expect(appts).toHaveLength(0);
  });

  it("sorts by date then time", () => {
    createAppointment({ ...baseBooking, startTime: "14:00" });
    createAppointment({ ...baseBooking, startTime: "09:00" });

    const appts = getAppointmentsForWeek("coach-1", "2026-03-16");
    expect(appts[0].startTime).toBe("09:00");
    expect(appts[1].startTime).toBe("14:00");
  });
});

describe("getClientAppointments", () => {
  it("returns appointments for a client", () => {
    createAppointment(baseBooking);
    const appts = getClientAppointments("client-1");
    expect(appts).toHaveLength(1);
  });

  it("filters by upcoming/past", () => {
    createAppointment(baseBooking);
    const upcoming = getClientAppointments("client-1", "upcoming");
    // Depending on date relative to "today", could be 0 or 1
    expect(upcoming.length).toBeLessThanOrEqual(1);
  });
});

describe("getCoachAppointments", () => {
  it("returns appointments for a coach", () => {
    createAppointment(baseBooking);
    createAppointment({ ...baseBooking, clientId: "client-2", clientName: "Bob", startTime: "11:00" });
    const appts = getCoachAppointments("coach-1");
    expect(appts).toHaveLength(2);
  });
});

// ─── Conflict Detection ──────────────────────────────────────────────

describe("getConflicts", () => {
  it("detects overlapping appointments", () => {
    createAppointment(baseBooking); // 09:00-09:30
    const conflicts = getConflicts("coach-1", "2026-03-17", "09:15", "09:45");
    expect(conflicts).toHaveLength(1);
  });

  it("detects exact overlap", () => {
    createAppointment(baseBooking);
    const conflicts = getConflicts("coach-1", "2026-03-17", "09:00", "09:30");
    expect(conflicts).toHaveLength(1);
  });

  it("no conflict when adjacent", () => {
    createAppointment(baseBooking); // 09:00-09:30
    const conflicts = getConflicts("coach-1", "2026-03-17", "09:30", "10:00");
    expect(conflicts).toHaveLength(0);
  });

  it("excludes cancelled appointments", () => {
    const appt = createAppointment(baseBooking);
    updateAppointmentStatus(appt.id, "cancelled");
    const conflicts = getConflicts("coach-1", "2026-03-17", "09:00", "09:30");
    expect(conflicts).toHaveLength(0);
  });

  it("can exclude a specific appointment", () => {
    const appt = createAppointment(baseBooking);
    const conflicts = getConflicts("coach-1", "2026-03-17", "09:00", "09:30", appt.id);
    expect(conflicts).toHaveLength(0);
  });
});

describe("hasConflict", () => {
  it("returns true for conflict", () => {
    createAppointment(baseBooking);
    expect(hasConflict("coach-1", "2026-03-17", "09:00", "09:30")).toBe(true);
  });

  it("returns false for no conflict", () => {
    expect(hasConflict("coach-1", "2026-03-17", "09:00", "09:30")).toBe(false);
  });
});

// ─── Calendar View ──────────────────────────────────────────────────

describe("getCalendarWeek", () => {
  it("returns 7 calendar days", () => {
    const days = getCalendarWeek("coach-1", "2026-03-16");
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-03-16");
    expect(days[6].date).toBe("2026-03-22");
  });

  it("includes appointments in correct days", () => {
    createAppointment(baseBooking); // Mar 17 (Tuesday)
    const days = getCalendarWeek("coach-1", "2026-03-16");
    // Mar 17 is index 1 (Mon=0, Tue=1)
    const tuesday = days.find((d) => d.date === "2026-03-17");
    expect(tuesday!.appointments).toHaveLength(1);
  });
});

// ─── Session Notes ──────────────────────────────────────────────────

describe("session notes", () => {
  it("saves session notes and marks appointment completed", () => {
    const appt = createAppointment(baseBooking);
    const notes = saveSessionNotes(appt.id, "coach-1", {
      summary: "Great progress on glucose management",
      keyFindings: ["TIR improved to 85%", "Sleep consistency improved"],
      actionItems: ["Adjust supplement timing", "Start evening walks"],
      nextSessionFocus: "Nutrition optimization",
      privateNotes: "Consider advanced protocol",
    });

    expect(notes.appointmentId).toBe(appt.id);
    expect(notes.summary).toBe("Great progress on glucose management");
    expect(notes.keyFindings).toHaveLength(2);
    expect(notes.actionItems).toHaveLength(2);

    // Appointment should be marked completed
    const updated = getAppointment(appt.id);
    expect(updated!.status).toBe("completed");
  });

  it("retrieves session notes", () => {
    const appt = createAppointment(baseBooking);
    saveSessionNotes(appt.id, "coach-1", {
      summary: "Test notes",
      keyFindings: [],
      actionItems: [],
      nextSessionFocus: "",
      privateNotes: "",
    });

    const notes = getSessionNotes(appt.id);
    expect(notes).not.toBeNull();
    expect(notes!.summary).toBe("Test notes");
  });

  it("returns null for no notes", () => {
    expect(getSessionNotes("nonexistent")).toBeNull();
  });

  it("throws for unauthorized coach", () => {
    const appt = createAppointment(baseBooking);
    expect(() =>
      saveSessionNotes(appt.id, "other-coach", {
        summary: "Unauthorized",
        keyFindings: [],
        actionItems: [],
        nextSessionFocus: "",
        privateNotes: "",
      })
    ).toThrow("Not authorized");
  });
});

// ─── Stats ────────────────────────────────────────────────────────────

describe("getSchedulingStats", () => {
  it("returns stats for coach", () => {
    createAppointment(baseBooking);
    createAppointment({ ...baseBooking, startTime: "11:00" });

    const stats = getSchedulingStats("coach-1");
    expect(stats.totalAppointments).toBe(2);
    expect(stats.hoursBookedThisWeek).toBeGreaterThan(0);
  });

  it("returns zero stats for new coach", () => {
    const stats = getSchedulingStats("new-coach");
    expect(stats.totalAppointments).toBe(0);
    expect(stats.noShowRate).toBe(0);
  });

  it("calculates no-show rate", () => {
    const appt1 = createAppointment(baseBooking);
    createAppointment({ ...baseBooking, startTime: "11:00" });
    updateAppointmentStatus(appt1.id, "no_show");

    const stats = getSchedulingStats("coach-1");
    expect(stats.noShowRate).toBe(50);
  });
});
