import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import { appointments, sessionNotes, coachAvailability, trainerProfiles, users, notificationPreferences } from "@/server/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getWeekDates(weekStart: string): { start: string; end: string } {
  const d = new Date(weekStart);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return { start: d.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

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

  // Update trainer profile
  updateProfile: trainerProcedure
    .input(
      z.object({
        bio: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        credentials: z.array(z.string()).optional(),
        capacity: z.number().min(1).max(100).optional(),
        acceptingClients: z.boolean().optional(),
        monthlyRate: z.string().optional(),
        packages: z
          .array(
            z.object({
              name: z.string(),
              price: z.number(),
              description: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.trainerProfiles.findFirst({
        where: eq(trainerProfiles.userId, ctx.dbUserId),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(trainerProfiles)
          .set(input)
          .where(eq(trainerProfiles.userId, ctx.dbUserId))
          .returning();
        return updated;
      } else {
        const [created] = await ctx.db
          .insert(trainerProfiles)
          .values({ userId: ctx.dbUserId, ...input })
          .returning();
        return created;
      }
    }),

  // Get notification preferences
  getNotificationPreferences: trainerProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, ctx.dbUserId),
    });
    return prefs ?? { enabled: true, categories: null, quietHoursStart: null, quietHoursEnd: null };
  }),

  // Update notification preferences
  updateNotificationPreferences: trainerProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        quietHoursStart: z.string().nullable().optional(),
        quietHoursEnd: z.string().nullable().optional(),
        categories: z.record(z.string(), z.object({
          in_app: z.boolean(),
          email: z.boolean(),
          push: z.boolean(),
          sms: z.boolean(),
        })).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.dbUserId),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(notificationPreferences)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, ctx.dbUserId))
          .returning();
        return updated;
      } else {
        const [created] = await ctx.db
          .insert(notificationPreferences)
          .values({
            userId: ctx.dbUserId,
            enabled: input.enabled ?? true,
            quietHoursStart: input.quietHoursStart,
            quietHoursEnd: input.quietHoursEnd,
            categories: input.categories,
          })
          .returning();
        return created;
      }
    }),

  // List appointments for a week
  listAppointments: trainerProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getWeekDates(input.weekStart);
      const results = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, ctx.dbUserId),
          gte(appointments.date, start),
          lte(appointments.date, end),
        ),
        orderBy: [appointments.date, appointments.startTime],
      });
      return { appointments: results };
    }),

  // Get calendar view for a week
  getCalendarWeek: trainerProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getWeekDates(input.weekStart);
      const appts = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, ctx.dbUserId),
          gte(appointments.date, start),
          lte(appointments.date, end),
          sql`${appointments.status} NOT IN ('cancelled')`,
        ),
        orderBy: [appointments.date, appointments.startTime],
      });

      // Group by day
      const days: Record<string, typeof appts> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(input.weekStart);
        d.setDate(d.getDate() + i);
        days[d.toISOString().split("T")[0]] = [];
      }
      for (const a of appts) {
        const key = typeof a.date === "string" ? a.date : new Date(a.date).toISOString().split("T")[0];
        if (days[key]) days[key].push(a);
      }

      return { weekStart: start, weekEnd: end, days };
    }),

  // Get all appointments with optional filter
  listAll: trainerProcedure
    .input(
      z.object({
        filter: z.enum(["upcoming", "past", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter ?? "all";
      const today = new Date().toISOString().split("T")[0];
      const conditions = [eq(appointments.coachId, ctx.dbUserId)];

      if (filter === "upcoming") conditions.push(gte(appointments.date, today));
      if (filter === "past") conditions.push(lte(appointments.date, today));

      return ctx.db.query.appointments.findMany({
        where: and(...conditions),
        orderBy: filter === "past" ? desc(appointments.date) : appointments.date,
      });
    }),

  // Get a specific appointment
  getAppointment: trainerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.coachId, ctx.dbUserId),
        ),
      });
      if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
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
      const coachUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.dbUserId),
      });
      const coachName = coachUser
        ? `${coachUser.firstName ?? ""} ${coachUser.lastName ?? ""}`.trim() || coachUser.email
        : "Coach";

      const [created] = await ctx.db
        .insert(appointments)
        .values({
          coachId: ctx.dbUserId,
          clientId: input.clientId,
          clientName: input.clientName,
          coachName,
          sessionType: input.sessionType as "follow_up",
          meetingType: input.meetingType,
          date: input.date,
          startTime: input.startTime,
          endTime: addMinutes(input.startTime, 60),
          durationMinutes: 60,
          notes: input.notes,
        })
        .returning();

      return created;
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
      const [updated] = await ctx.db
        .update(appointments)
        .set({
          status: input.status,
          cancellationReason: input.status === "cancelled" ? input.reason : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.coachId, ctx.dbUserId),
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      return updated;
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
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.coachId, ctx.dbUserId),
        ),
      });
      if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });

      const [updated] = await ctx.db
        .update(appointments)
        .set({
          date: input.newDate,
          startTime: input.newStartTime,
          endTime: addMinutes(input.newStartTime, appt.durationMinutes ?? 60),
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, input.appointmentId))
        .returning();

      return updated;
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
      const avail = await ctx.db.query.coachAvailability.findFirst({
        where: eq(coachAvailability.coachId, ctx.dbUserId),
      });

      const dayOfWeek = new Date(input.date).getDay();
      const schedule = avail?.weeklySchedule ?? [];
      const daySchedule = schedule.find((d) => d.dayOfWeek === dayOfWeek);

      if (!daySchedule?.enabled || !daySchedule.slots.length) return [];

      const existing = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, ctx.dbUserId),
          eq(appointments.date, input.date),
          sql`${appointments.status} NOT IN ('cancelled')`,
        ),
      });

      const bookedSlots = existing.map((a) => ({
        start: a.startTime,
        end: a.endTime ?? addMinutes(a.startTime, a.durationMinutes ?? 60),
      }));

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

  // Get/update availability settings
  getAvailability: trainerProcedure.query(async ({ ctx }) => {
    const avail = await ctx.db.query.coachAvailability.findFirst({
      where: eq(coachAvailability.coachId, ctx.dbUserId),
    });
    return avail ?? { weeklySchedule: [], bufferMinutes: 15, blockedDates: [] };
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
      const existing = await ctx.db.query.coachAvailability.findFirst({
        where: eq(coachAvailability.coachId, ctx.dbUserId),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(coachAvailability)
          .set({
            ...(input.bufferMinutes !== undefined && { bufferMinutes: input.bufferMinutes }),
            ...(input.blockedDates !== undefined && { blockedDates: input.blockedDates }),
            ...(input.weeklySchedule !== undefined && { weeklySchedule: input.weeklySchedule }),
            updatedAt: new Date(),
          })
          .where(eq(coachAvailability.coachId, ctx.dbUserId))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(coachAvailability)
        .values({
          coachId: ctx.dbUserId,
          bufferMinutes: input.bufferMinutes ?? 15,
          blockedDates: input.blockedDates ?? [],
          weeklySchedule: input.weeklySchedule ?? [],
        })
        .returning();

      return created;
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
      // Verify appointment belongs to coach
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.coachId, ctx.dbUserId),
        ),
      });
      if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });

      // Upsert
      const existing = await ctx.db.query.sessionNotes.findFirst({
        where: eq(sessionNotes.appointmentId, input.appointmentId),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(sessionNotes)
          .set({
            summary: input.summary,
            keyFindings: input.keyFindings,
            actionItems: input.actionItems,
            nextSessionFocus: input.nextSessionFocus,
            privateNotes: input.privateNotes,
            updatedAt: new Date(),
          })
          .where(eq(sessionNotes.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(sessionNotes)
        .values({
          appointmentId: input.appointmentId,
          coachId: ctx.dbUserId,
          summary: input.summary,
          keyFindings: input.keyFindings,
          actionItems: input.actionItems,
          nextSessionFocus: input.nextSessionFocus,
          privateNotes: input.privateNotes,
        })
        .returning();
      return created;
    }),

  getSessionNotes: trainerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.coachId, ctx.dbUserId),
        ),
      });
      if (!appt) return null;

      return ctx.db.query.sessionNotes.findFirst({
        where: eq(sessionNotes.appointmentId, input.appointmentId),
      });
    }),

  // Scheduling stats
  getStats: trainerProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const upcoming = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        eq(appointments.coachId, ctx.dbUserId),
        gte(appointments.date, today),
        sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
      ));

    const todayAppts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        eq(appointments.coachId, ctx.dbUserId),
        eq(appointments.date, today),
        sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
      ));

    const weekAppts = await ctx.db
      .select({ count: sql<number>`count(*)`, totalMin: sql<number>`coalesce(sum(${appointments.durationMinutes}), 0)` })
      .from(appointments)
      .where(and(
        eq(appointments.coachId, ctx.dbUserId),
        gte(appointments.date, weekStartStr),
        lte(appointments.date, today),
        eq(appointments.status, "completed"),
      ));

    return {
      upcomingAppointments: Number(upcoming[0]?.count ?? 0),
      todayAppointments: Number(todayAppts[0]?.count ?? 0),
      hoursBookedThisWeek: Math.round(Number(weekAppts[0]?.totalMin ?? 0) / 60 * 10) / 10,
      completedThisWeek: Number(weekAppts[0]?.count ?? 0),
    };
  }),
});
