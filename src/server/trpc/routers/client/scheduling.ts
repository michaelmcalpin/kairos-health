import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import {
  createAppointment,
  getClientAppointments,
  getAppointment,
  updateAppointmentStatus,
  getAvailableSlots,
  getCoachAvailability,
} from "@/lib/scheduling/engine";
import { SESSION_TYPES } from "@/lib/scheduling/types";

export const clientSchedulingRouter = router({
  // Get upcoming and past appointments
  listAppointments: clientProcedure
    .input(
      z.object({
        filter: z.enum(["upcoming", "past", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter ?? "all";
      return getClientAppointments(ctx.dbUserId, filter);
    }),

  // Get a specific appointment
  getAppointment: clientProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appt = getAppointment(input.appointmentId);
      if (!appt || appt.clientId !== ctx.dbUserId) {
        throw new Error("Appointment not found");
      }
      return appt;
    }),

  // Get available session types
  getSessionTypes: clientProcedure
    .query(async () => {
      return SESSION_TYPES;
    }),

  // Get coach availability for a specific date
  getAvailableSlots: clientProcedure
    .input(
      z.object({
        coachId: z.string(),
        date: z.string(),
        durationMinutes: z.number().min(15).max(120),
      })
    )
    .query(async ({ input }) => {
      return getAvailableSlots(input.coachId, input.date, input.durationMinutes);
    }),

  // Get coach availability settings
  getCoachAvailability: clientProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ input }) => {
      return getCoachAvailability(input.coachId);
    }),

  // Book an appointment
  bookAppointment: clientProcedure
    .input(
      z.object({
        coachId: z.string(),
        coachName: z.string(),
        sessionType: z.string(),
        meetingType: z.enum(["video", "phone", "in_person"]),
        date: z.string(),
        startTime: z.string(),
        notes: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createAppointment({
        coachId: input.coachId,
        clientId: ctx.dbUserId,
        clientName: "Client", // In production, fetch from profile
        coachName: input.coachName,
        sessionType: input.sessionType as "follow_up",
        meetingType: input.meetingType,
        date: input.date,
        startTime: input.startTime,
        notes: input.notes,
      });
    }),

  // Cancel an appointment
  cancelAppointment: clientProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appt = getAppointment(input.appointmentId);
      if (!appt || appt.clientId !== ctx.dbUserId) {
        throw new Error("Appointment not found");
      }
      return updateAppointmentStatus(input.appointmentId, "cancelled", input.reason);
    }),
});
