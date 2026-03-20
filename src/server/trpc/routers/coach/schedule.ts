import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
import { trainerProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createAppointment,
  getAppointment,
  getAppointmentsForWeek,
  getCoachAppointments,
  getCalendarWeek,
  updateAppointmentStatus,
  rescheduleAppointment,
  getAvailableSlots,
  getCoachAvailability,
  updateCoachAvailability,
  saveSessionNotes,
  getSessionNotes,
  getSchedulingStats,
} from "@/lib/scheduling/engine";

export const coachScheduleRouter = router({
  // Get trainer profile (for schedule settings like capacity)
  getProfile: trainerProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.trainerProfiles.findFirst({
      where: eq(trainerProfiles.userId, ctx.dbUserId),
    });

    return profile
      ? {
          capacity: profile.capacity,
          acceptingClients: profile.acceptingClients,
          packages: profile.packages,
        }
      : null;
  }),

  // List appointments for a week
  listAppointments: trainerProcedure
    .input(
      z.object({
        weekStart: z.string().describe("ISO date string for the start of the week"),
      })
    )
    .query(async ({ ctx, input }) => {
      return { appointments: getAppointmentsForWeek(ctx.dbUserId, input.weekStart) };
    }),

  // Get calendar view for a week
  getCalendarWeek: trainerProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      return getCalendarWeek(ctx.dbUserId, input.weekStart);
    }),

  // Get all appointments with optional filter
  listAll: trainerProcedure
    .input(
      z.object({
        filter: z.enum(["upcoming", "past", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getCoachAppointments(ctx.dbUserId, input?.filter ?? "all");
    }),

  // Get a specific appointment
  getAppointment: trainerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appt = getAppointment(input.appointmentId);
      if (!appt || appt.coachId !== ctx.dbUserId) {
        throw new Error("Appointment not found");
      }
      return appt;
    }),

  // Create an appointment
  createAppointment: trainerProcedure
    .input(
      z.object({
        clientId: z.string(),
        clientName: z.string(),
        sessionType: z.string(),
        date: z.string(),
        startTime: z.string(),
        meetingType: z.enum(["video", "phone", "in_person"]),
        notes: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createAppointment({
        coachId: ctx.dbUserId,
        clientId: input.clientId,
        clientName: input.clientName,
        coachName: "Trainer",
        sessionType: input.sessionType as "follow_up",
        meetingType: input.meetingType,
        date: input.date,
        startTime: input.startTime,
        notes: input.notes,
      });
    }),

  // Update appointment status
  updateStatus: trainerProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appt = getAppointment(input.appointmentId);
      if (!appt || appt.coachId !== ctx.dbUserId) {
        throw new Error("Appointment not found");
      }
      return updateAppointmentStatus(input.appointmentId, input.status, input.reason);
    }),

  // Reschedule an appointment
  reschedule: trainerProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        newDate: z.string(),
        newStartTime: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appt = getAppointment(input.appointmentId);
      if (!appt || appt.coachId !== ctx.dbUserId) {
        throw new Error("Appointment not found");
      }
      return rescheduleAppointment(input.appointmentId, input.newDate, input.newStartTime);
    }),

  // Get available slots for a date
  getAvailableSlots: trainerProcedure
    .input(
      z.object({
        date: z.string(),
        durationMinutes: z.number().min(15).max(120),
      })
    )
    .query(async ({ ctx, input }) => {
      return getAvailableSlots(ctx.dbUserId, input.date, input.durationMinutes);
    }),

  // Get/update availability settings
  getAvailability: trainerProcedure
    .query(async ({ ctx }) => {
      return getCoachAvailability(ctx.dbUserId);
    }),

  updateAvailability: trainerProcedure
    .input(
      z.object({
        bufferMinutes: z.number().min(0).max(60).optional(),
        blockedDates: z.array(z.string()).optional(),
        weeklySchedule: z.array(z.object({
          dayOfWeek: z.number().min(0).max(6),
          enabled: z.boolean(),
          slots: z.array(z.object({
            start: z.string(),
            end: z.string(),
          })),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateCoachAvailability(ctx.dbUserId, input as Record<string, unknown>);
    }),

  // Session notes
  saveSessionNotes: trainerProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        summary: z.string(),
        keyFindings: z.array(z.string()),
        actionItems: z.array(z.string()),
        nextSessionFocus: z.string(),
        privateNotes: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return saveSessionNotes(input.appointmentId, ctx.dbUserId, {
        summary: input.summary,
        keyFindings: input.keyFindings,
        actionItems: input.actionItems,
        nextSessionFocus: input.nextSessionFocus,
        privateNotes: input.privateNotes,
      });
    }),

  getSessionNotes: trainerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ input }) => {
      return getSessionNotes(input.appointmentId);
    }),

  // Scheduling stats
  getStats: trainerProcedure
    .query(async ({ ctx }) => {
      return getSchedulingStats(ctx.dbUserId);
    }),
});
