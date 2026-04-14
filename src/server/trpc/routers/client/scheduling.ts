import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { appointments, sessionNotes, coachAvailability, users } from "@/server/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

const SESSION_TYPES = [
  { id: "initial_consultation", label: "Initial Consultation", duration: 60, description: "First meeting to discuss goals and health history" },
  { id: "follow_up", label: "Follow-Up", duration: 30, description: "Regular check-in on progress" },
  { id: "protocol_review", label: "Protocol Review", duration: 45, description: "Review and adjust supplement/medication protocol" },
  { id: "lab_review", label: "Lab Review", duration: 45, description: "Review lab results and adjust plan" },
  { id: "goal_setting", label: "Goal Setting", duration: 60, description: "Set or revise health goals" },
  { id: "ad_hoc", label: "Ad Hoc", duration: 30, description: "Quick session for specific concerns" },
] as const;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

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
      const today = new Date().toISOString().split("T")[0];
      const conditions = [eq(appointments.clientId, ctx.dbUserId)];

      if (filter === "upcoming") conditions.push(gte(appointments.date, today));
      if (filter === "past") conditions.push(lte(appointments.date, today));

      const results = await ctx.db.query.appointments.findMany({
        where: and(...conditions),
        orderBy: filter === "past" ? desc(appointments.date) : appointments.date,
      });

      return results;
    }),

  // Get a specific appointment
  getAppointment: clientProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.clientId, ctx.dbUserId),
        ),
      });
      if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      return appt;
    }),

  // Get available session types
  getSessionTypes: clientProcedure.query(async () => {
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
    .query(async ({ ctx, input }) => {
      // Get coach availability settings
      const avail = await ctx.db.query.coachAvailability.findFirst({
        where: eq(coachAvailability.coachId, input.coachId),
      });

      const dayOfWeek = new Date(input.date).getDay();
      const schedule = avail?.weeklySchedule ?? [];
      const daySchedule = schedule.find((d) => d.dayOfWeek === dayOfWeek);

      if (!daySchedule?.enabled || !daySchedule.slots.length) return [];

      // Get existing appointments for that day
      const existing = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, input.coachId),
          eq(appointments.date, input.date),
          sql`${appointments.status} NOT IN ('cancelled')`,
        ),
      });

      const bookedSlots = existing.map((a) => ({
        start: a.startTime,
        end: a.endTime ?? addMinutes(a.startTime, a.durationMinutes ?? 60),
      }));

      // Generate available slots
      const buffer = avail?.bufferMinutes ?? 15;
      const slots: { start: string; end: string }[] = [];

      for (const window of daySchedule.slots) {
        let cursor = window.start;
        while (cursor < window.end) {
          const end = addMinutes(cursor, input.durationMinutes);
          if (end > window.end) break;

          const conflicts = bookedSlots.some(
            (b) => cursor < b.end && end > b.start
          );

          if (!conflicts) {
            slots.push({ start: cursor, end });
          }
          cursor = addMinutes(cursor, buffer + input.durationMinutes);
        }
      }

      return slots;
    }),

  // Get coach availability settings
  getCoachAvailability: clientProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      const avail = await ctx.db.query.coachAvailability.findFirst({
        where: eq(coachAvailability.coachId, input.coachId),
      });
      return avail ?? { weeklySchedule: [], bufferMinutes: 15, blockedDates: [] };
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
      const clientUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.dbUserId),
      });
      const clientName = clientUser
        ? `${clientUser.firstName ?? ""} ${clientUser.lastName ?? ""}`.trim() || clientUser.email
        : "Client";

      const sessionInfo = SESSION_TYPES.find((s) => s.id === input.sessionType);
      const duration = sessionInfo?.duration ?? 60;

      const [created] = await ctx.db
        .insert(appointments)
        .values({
          coachId: input.coachId,
          clientId: ctx.dbUserId,
          coachName: input.coachName,
          clientName,
          sessionType: input.sessionType as "follow_up",
          meetingType: input.meetingType,
          date: input.date,
          startTime: input.startTime,
          endTime: addMinutes(input.startTime, duration),
          durationMinutes: duration,
          notes: input.notes,
        })
        .returning();

      return created;
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
      const [updated] = await ctx.db
        .update(appointments)
        .set({
          status: "cancelled",
          cancellationReason: input.reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.clientId, ctx.dbUserId),
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      return updated;
    }),

  // Get session notes for an appointment
  getSessionNotes: clientProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify appointment belongs to client
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.clientId, ctx.dbUserId),
        ),
      });
      if (!appt) return null;

      return ctx.db.query.sessionNotes.findFirst({
        where: eq(sessionNotes.appointmentId, input.appointmentId),
      });
    }),
});
