import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import { appointments, sessionNotes, coachAvailability, trainerProfiles, users, notificationPreferences, alerts, conversations, messages } from "@/server/db/schema";
import { eq, and, desc, gte, lte, lt, ne, sql } from "drizzle-orm";
import { createZoomMeeting, deleteZoomMeeting } from "@/lib/zoom";
import { generateIcsContent } from "@/lib/calendar/ics";
import { sendAppointmentConfirmationEmail } from "@/lib/email/sender";

const SESSION_DURATIONS: Record<string, number> = {
  initial_consultation: 60,
  follow_up: 30,
  protocol_review: 45,
  lab_review: 45,
  goal_setting: 60,
  ad_hoc: 30,
};

const SESSION_LABELS: Record<string, string> = {
  initial_consultation: "Initial Consultation",
  follow_up: "Follow-Up",
  protocol_review: "Protocol Review",
  lab_review: "Lab Review",
  goal_setting: "Goal Setting",
  ad_hoc: "Ad Hoc",
};

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
      // super_admin sees all appointments, trainers see only their own
      const conditions = ctx.userRole === "super_admin"
        ? []
        : [eq(appointments.coachId, ctx.dbUserId)];
      conditions.push(
        gte(appointments.date, start),
        lte(appointments.date, end),
      );
      const results = await ctx.db.query.appointments.findMany({
        where: and(...conditions),
        orderBy: [appointments.date, appointments.startTime],
      });
      return { appointments: results };
    }),

  // Get calendar view for a week
  getCalendarWeek: trainerProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getWeekDates(input.weekStart);
      // super_admin sees all appointments, trainers see only their own
      const conditions = ctx.userRole === "super_admin"
        ? []
        : [eq(appointments.coachId, ctx.dbUserId)];
      conditions.push(
        gte(appointments.date, start),
        lte(appointments.date, end),
        ne(appointments.status, "cancelled"),
      );
      const appts = await ctx.db.query.appointments.findMany({
        where: and(...conditions),
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
      // super_admin sees all appointments
      const conditions = ctx.userRole === "super_admin"
        ? []
        : [eq(appointments.coachId, ctx.dbUserId)];

      if (filter === "upcoming") conditions.push(gte(appointments.date, today));
      if (filter === "past") conditions.push(lt(appointments.date, today));

      return ctx.db.query.appointments.findMany({
        where: and(...conditions),
        orderBy: filter === "past" ? desc(appointments.date) : appointments.date,
      });
    }),

  // Get a specific appointment
  getAppointment: trainerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const apptWhere = ctx.userRole === "super_admin"
        ? eq(appointments.id, input.appointmentId)
        : and(eq(appointments.id, input.appointmentId), eq(appointments.coachId, ctx.dbUserId));
      const appt = await ctx.db.query.appointments.findFirst({
        where: apptWhere,
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
        sessionType: z.enum(["initial_consultation", "follow_up", "protocol_review", "lab_review", "goal_setting", "ad_hoc"]),
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

      const duration = SESSION_DURATIONS[input.sessionType] ?? 30;
      const endTime = addMinutes(input.startTime, duration);

      // Check for overlapping appointments on the same date for this coach
      try {
        const [overlapping] = await ctx.db
          .select({ id: appointments.id, startTime: appointments.startTime, date: appointments.date })
          .from(appointments)
          .where(and(
            eq(appointments.coachId, ctx.dbUserId),
            eq(appointments.date, input.date),
            ne(appointments.status, "cancelled"),
            lt(appointments.startTime, endTime),
            sql`coalesce(${appointments.endTime}, ${appointments.startTime}) > ${input.startTime}`,
          ))
          .limit(1);

        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `This time slot conflicts with an existing appointment at ${overlapping.startTime} on ${overlapping.date}.`,
          });
        }
      } catch (err) {
        // Re-throw CONFLICT errors (overlap found)
        if (err instanceof TRPCError) throw err;
        // Log but don't block appointment creation for overlap-check failures
        console.error("[Schedule] Overlap check failed (non-fatal):", err);
      }

      const sessionLabel = SESSION_LABELS[input.sessionType] ?? input.sessionType;
      const meetingLabel = input.meetingType === "video" ? "Video Call" : input.meetingType === "phone" ? "Phone Call" : "In Person";

      let created;
      try {
        [created] = await ctx.db
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
            endTime,
            durationMinutes: duration,
            notes: input.notes,
          })
          .returning();
      } catch (insertErr) {
        const e = insertErr as Record<string, unknown>;
        console.error("[APPT-ERR] code:", e?.code, "constraint:", e?.constraint, "detail:", e?.detail);
        console.error("[APPT-ERR] msg:", insertErr instanceof Error ? insertErr.message.slice(0, 300) : String(insertErr).slice(0, 300));
        console.error("[APPT-ERR] inputs:", JSON.stringify({ coachId: ctx.dbUserId, clientId: input.clientId, sessionType: input.sessionType, meetingType: input.meetingType, date: input.date, startTime: input.startTime }));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create appointment: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}`,
        });
      }

      // Create Zoom meeting for video appointments
      if (input.meetingType === "video") {
        try {
          const zoomResult = await createZoomMeeting({
            topic: `EVERIST - ${sessionLabel} with ${input.clientName}`,
            startTime: `${input.date}T${input.startTime}:00`,
            duration,
            agenda: input.notes || undefined,
          });
          if (zoomResult) {
            await ctx.db
              .update(appointments)
              .set({
                meetingLink: zoomResult.joinUrl,
                zoomMeetingId: String(zoomResult.meetingId),
              })
              .where(eq(appointments.id, created.id));
            // Update the returned object so downstream code sees the link
            (created as Record<string, unknown>).meetingLink = zoomResult.joinUrl;
            (created as Record<string, unknown>).zoomMeetingId = String(zoomResult.meetingId);
          } else {
            // createZoomMeeting returned null — Zoom env vars are not configured
            console.warn("[Schedule] Zoom not configured — appointment created without video link");
            (created as Record<string, unknown>).zoomError = "Zoom is not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to Vercel environment variables.";
          }
        } catch (zoomError) {
          // Zoom failure is non-fatal — appointment was already created
          console.error("Failed to create Zoom meeting:", zoomError);
          (created as Record<string, unknown>).zoomError = "Failed to create Zoom meeting. Check Zoom credentials.";
        }
      }

      // Format date for display
      const displayDate = new Date(input.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const [h, m] = input.startTime.split(":");
      const hour = parseInt(h, 10);
      const displayTime = `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;

      // Create an alert for the client so the booking shows in their alerts (non-fatal)
      try {
        await ctx.db.insert(alerts).values({
          clientId: input.clientId,
          type: "scheduling",
          priority: "info",
          title: `${sessionLabel} scheduled`,
          message: `${coachName} scheduled a ${sessionLabel.toLowerCase()} (${meetingLabel.toLowerCase()}) for ${displayDate} at ${displayTime}.`,
          data: { appointmentId: created.id, sessionType: input.sessionType, meetingType: input.meetingType },
        });
      } catch (alertErr) {
        console.error("[Schedule] Failed to create alert (non-fatal):", alertErr);
      }

      // Send a chat message if a conversation exists between coach and client (non-fatal)
      try {
        const conversation = await ctx.db.query.conversations.findFirst({
          where: and(eq(conversations.trainerId, ctx.dbUserId), eq(conversations.clientId, input.clientId)),
        });

        if (conversation) {
          await ctx.db.insert(messages).values({
            conversationId: conversation.id,
            senderId: ctx.dbUserId,
            senderRole: "coach",
            body: `I've scheduled a ${sessionLabel.toLowerCase()} (${meetingLabel.toLowerCase()}) for ${displayDate} at ${displayTime}. ${input.notes ? `Notes: ${input.notes}` : "See you then!"}`,
          });
          // Update conversation timestamp and unread count for client
          await ctx.db.update(conversations).set({
            lastMessageAt: new Date(),
            unreadCountClient: sql`${conversations.unreadCountClient} + 1`,
          }).where(eq(conversations.id, conversation.id));
        }
      } catch (msgErr) {
        console.error("[Schedule] Failed to send chat notification (non-fatal):", msgErr);
      }

      // Send calendar invite emails to both coach and client (non-fatal)
      try {
        // Look up both users' emails
        const [coachUserData, clientUserData] = await Promise.all([
          ctx.db.query.users.findFirst({ where: eq(users.id, ctx.dbUserId) }),
          ctx.db.query.users.findFirst({ where: eq(users.id, input.clientId) }),
        ]);

        // Generate the .ics calendar content
        const meetingLink = (created as Record<string, unknown>).meetingLink as string | null | undefined;
        const icsContent = generateIcsContent({
          id: created.id,
          date: input.date,
          startTime: input.startTime,
          endTime,
          durationMinutes: duration,
          sessionType: input.sessionType,
          meetingType: input.meetingType,
          clientName: input.clientName,
          coachName,
          meetingLink: meetingLink ?? null,
          notes: input.notes || null,
        });

        const emailParams = {
          sessionType: input.sessionType,
          meetingType: input.meetingType,
          date: input.date,
          startTime: input.startTime,
          endTime,
          durationMinutes: duration,
          coachName,
          clientName: input.clientName,
          meetingLink: meetingLink ?? null,
          notes: input.notes || null,
          icsContent,
        };

        // Send to coach
        if (coachUserData?.email) {
          const coachFirstName = coachUserData.firstName ?? coachName;
          sendAppointmentConfirmationEmail({
            to: coachUserData.email,
            recipientName: coachFirstName,
            recipientRole: "coach",
            ...emailParams,
          }).catch((err) => console.error("[Schedule] Coach email failed (non-fatal):", err));
        }

        // Send to client
        if (clientUserData?.email) {
          const clientFirstName = clientUserData.firstName ?? input.clientName;
          sendAppointmentConfirmationEmail({
            to: clientUserData.email,
            recipientName: clientFirstName,
            recipientRole: "client",
            ...emailParams,
          }).catch((err) => console.error("[Schedule] Client email failed (non-fatal):", err));
        }
      } catch (emailErr) {
        // Email failure should never block appointment creation
        console.error("[Schedule] Failed to send calendar invite emails (non-fatal):", emailErr);
      }

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
          cancellationReason: input.status === "cancelled" ? input.reason : null,
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

      // Clean up Zoom meeting when appointment is cancelled
      if (input.status === "cancelled" && updated.zoomMeetingId) {
        try {
          await deleteZoomMeeting(updated.zoomMeetingId);
        } catch (zoomError) {
          // Zoom cleanup failure is non-fatal — cancellation should still succeed
          console.error("Failed to delete Zoom meeting:", zoomError);
        }
      }

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

      const duration = appt.durationMinutes ?? 60;
      const newEndTime = addMinutes(input.newStartTime, duration);

      // Check for overlapping appointments (exclude the current one)
      try {
        const [overlapping] = await ctx.db
          .select({ id: appointments.id, startTime: appointments.startTime, date: appointments.date })
          .from(appointments)
          .where(and(
            eq(appointments.coachId, ctx.dbUserId),
            eq(appointments.date, input.newDate),
            ne(appointments.status, "cancelled"),
            ne(appointments.id, input.appointmentId),
            lt(appointments.startTime, newEndTime),
            sql`coalesce(${appointments.endTime}, ${appointments.startTime}) > ${input.newStartTime}`,
          ))
          .limit(1);

        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `This time slot conflicts with an existing appointment at ${overlapping.startTime} on ${overlapping.date}.`,
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[Schedule] Overlap check failed (non-fatal):", err);
      }

      const [updated] = await ctx.db
        .update(appointments)
        .set({
          date: input.newDate,
          startTime: input.newStartTime,
          endTime: newEndTime,
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

      // Check if the requested date is blocked by the trainer
      const blockedDates = avail?.blockedDates ?? [];
      if (blockedDates.includes(input.date)) return [];

      // Append T12:00:00 to avoid UTC midnight interpretation which can
      // return the wrong day-of-week for users in western timezones.
      const dayOfWeek = new Date(input.date + "T12:00:00").getDay();
      const schedule = avail?.weeklySchedule ?? [];
      const daySchedule = schedule.find((d) => d.dayOfWeek === dayOfWeek);

      if (!daySchedule?.enabled || !daySchedule.slots.length) return [];

      const existing = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, ctx.dbUserId),
          eq(appointments.date, input.date),
          ne(appointments.status, "cancelled"),
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
    return avail ?? { weeklySchedule: [], bufferMinutes: 15, blockedDates: [], dateOverrides: {}, timezone: null };
  }),

  updateAvailability: trainerProcedure
    .input(
      z.object({
        bufferMinutes: z.number().min(0).max(60).optional(),
        blockedDates: z.array(z.string()).optional(),
        timezone: z.string().max(64).optional(),
        dateOverrides: z.record(
          z.string(),
          z.object({
            enabled: z.boolean(),
            slots: z.array(z.object({ start: z.string(), end: z.string() })),
          }),
        ).optional(),
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
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.dateOverrides !== undefined && { dateOverrides: input.dateOverrides }),
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
          timezone: input.timezone ?? null,
          dateOverrides: input.dateOverrides ?? {},
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

    // super_admin sees all; trainers see only their own
    const coachFilter = ctx.userRole === "super_admin" ? [] : [eq(appointments.coachId, ctx.dbUserId)];

    const upcoming = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        ...coachFilter,
        gte(appointments.date, today),
        ne(appointments.status, "cancelled"),
        ne(appointments.status, "no_show"),
      ));

    const todayAppts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        ...coachFilter,
        eq(appointments.date, today),
        ne(appointments.status, "cancelled"),
        ne(appointments.status, "no_show"),
      ));

    const weekAppts = await ctx.db
      .select({ count: sql<number>`count(*)`, totalMin: sql<number>`coalesce(sum(${appointments.durationMinutes}), 0)` })
      .from(appointments)
      .where(and(
        ...coachFilter,
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
