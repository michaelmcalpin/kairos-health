/**
 * EVERIST Appointment Booking Notifications
 *
 * Shared, best-effort side effects fired after an appointment row is created
 * — from BOTH booking paths (a client booking their coach, or a coach booking
 * for a client). Everything here is NON-FATAL: each step is wrapped so a
 * notification / email / calendar failure can never fail the booking mutation.
 *
 * Fans out:
 *   1. Coach notification  (in-app + push + sms per prefs; email via the .ics)
 *   2. Client notification (in-app + push per prefs; email via the .ics)
 *   3. Calendar invite email (.ics) to both parties — same helper both paths use
 *   4. Google Calendar event (if the coach connected Google) inviting both
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import { users, coachAvailability, calendarConnections } from "@/server/db/schema";
import { dispatchNotification, getUserPreferences } from "@/lib/notifications/service";
import type { DeliveryChannel } from "@/lib/notifications/types";
import { generateIcsContent } from "@/lib/calendar/ics";
import { sendAppointmentConfirmationEmail } from "@/lib/email/sender";
import { timezoneLabel } from "@/lib/timezone";
import {
  isGoogleConfigured,
  getValidAccessToken,
  createCalendarEvent,
} from "@/lib/integrations/google-calendar";

// Keep the session-type → human label mapping consistent with the schedulers.
const SESSION_LABELS: Record<string, string> = {
  initial_consultation: "Initial Consultation",
  follow_up: "Follow-Up",
  protocol_review: "Protocol Review",
  lab_review: "Lab Review",
  goal_setting: "Goal Setting",
  ad_hoc: "Ad Hoc",
};

function sessionLabel(type: string): string {
  return SESSION_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function meetingLabel(type: string): string {
  return type === "video" ? "Video Call" : type === "phone" ? "Phone Call" : "In Person";
}

/** Shape needed for notifications — matches an inserted `appointments` row. */
export interface AppointmentForNotify {
  id: string;
  coachId: string;
  clientId: string;
  coachName: string | null;
  clientName: string | null;
  sessionType: string;
  meetingType: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  meetingLink?: string | null;
  notes?: string | null;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Build the per-user delivery channels honoring the user's "appointment"
 * category prefs, optionally excluding a channel (email is excluded when a
 * rich .ics confirmation email already covers it, so we never double-email).
 */
function appointmentChannels(
  prefs: Awaited<ReturnType<typeof getUserPreferences>>,
  exclude: DeliveryChannel[] = [],
): DeliveryChannel[] {
  if (!prefs.enabled) return ["in_app"];
  const cat = prefs.categories.appointment;
  const channels: DeliveryChannel[] = [];
  if (cat?.in_app) channels.push("in_app");
  if (cat?.email) channels.push("email");
  if (cat?.push) channels.push("push");
  if (cat?.sms) channels.push("sms");
  const filtered = channels.filter((c) => !exclude.includes(c));
  return filtered.length > 0 ? filtered : ["in_app"];
}

/**
 * Fire all post-booking notifications + calendar invites. Best-effort:
 * catches and logs every failure so the booking mutation still succeeds.
 */
export async function notifyAppointmentCreated(
  db: Database,
  appt: AppointmentForNotify,
  opts: { bookedByRole: "coach" | "client" },
): Promise<void> {
  try {
    const duration = appt.durationMinutes ?? 30;
    const endTime = appt.endTime ?? addMinutes(appt.startTime, duration);
    const label = sessionLabel(appt.sessionType);
    const meeting = meetingLabel(appt.meetingType);
    const clientName = appt.clientName ?? "Your client";
    const coachName = appt.coachName ?? "your coach";

    // Look up both users + the coach's timezone in parallel.
    const [coachUser, clientUser, avail] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, appt.coachId) }),
      db.query.users.findFirst({ where: eq(users.id, appt.clientId) }),
      db.query.coachAvailability.findFirst({ where: eq(coachAvailability.coachId, appt.coachId) }),
    ]);

    const coachTz = avail?.timezone ?? null;

    // Human date/time (coach wall-clock — start times are stored in coach tz).
    const dateObj = new Date(`${appt.date}T12:00:00`);
    const displayDate = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const [h, m] = appt.startTime.split(":");
    const hour = parseInt(h, 10);
    const displayTime = `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    const tzSuffix = coachTz ? ` (${timezoneLabel(coachTz)})` : "";
    const whenText = `${displayDate} at ${displayTime}${tzSuffix}`;

    // ── 1. Notify the COACH ──────────────────────────────────────────────
    // Email is delivered via the .ics confirmation email below, so exclude it
    // from the notification channels to avoid double-emailing.
    try {
      const coachPrefs = await getUserPreferences(db, appt.coachId);
      const clientInitiated = opts.bookedByRole === "client";
      await dispatchNotification(db, {
        userId: appt.coachId,
        category: "appointment",
        priority: clientInitiated ? "high" : "normal",
        title: `New booking: ${clientName} — ${label}`,
        body: `${clientName} ${clientInitiated ? "requested" : "is booked for"} a ${label.toLowerCase()} (${meeting.toLowerCase()}) on ${whenText}.`,
        actionUrl: "/trainer/schedule",
        actionLabel: "View",
        metadata: {
          clientName,
          sessionType: appt.sessionType,
          appointmentId: appt.id,
          start: `${appt.date}T${appt.startTime}`,
        },
        channelOverride: appointmentChannels(coachPrefs, ["email"]),
      });
    } catch (err) {
      console.error("[Scheduling] Coach notification failed (non-fatal):", err);
    }

    // ── 2. Notify the CLIENT ─────────────────────────────────────────────
    // Email delivered via the .ics confirmation email below — exclude here.
    try {
      const clientPrefs = await getUserPreferences(db, appt.clientId);
      const requested = opts.bookedByRole === "client";
      let body = `Your ${label.toLowerCase()} (${meeting.toLowerCase()}) with ${coachName} is ${requested ? "requested" : "confirmed"} for ${whenText}.`;
      if (appt.meetingLink) body += `\n\nJoin: ${appt.meetingLink}`;
      await dispatchNotification(db, {
        userId: appt.clientId,
        category: "appointment",
        priority: "normal",
        title: requested ? "Booking requested" : "Appointment confirmed with your coach",
        body,
        actionUrl: "/appointments",
        actionLabel: "View",
        metadata: {
          coachName,
          sessionType: appt.sessionType,
          appointmentId: appt.id,
          start: `${appt.date}T${appt.startTime}`,
        },
        channelOverride: appointmentChannels(clientPrefs, ["email"]),
      });
    } catch (err) {
      console.error("[Scheduling] Client notification failed (non-fatal):", err);
    }

    // ── 3. Calendar invite (.ics) emailed to both parties ────────────────
    try {
      const icsContent = generateIcsContent({
        id: appt.id,
        date: appt.date,
        startTime: appt.startTime,
        endTime,
        durationMinutes: duration,
        sessionType: appt.sessionType,
        meetingType: appt.meetingType,
        clientName,
        coachName,
        meetingLink: appt.meetingLink ?? null,
        notes: appt.notes ?? null,
      });

      const emailParams = {
        sessionType: appt.sessionType,
        meetingType: appt.meetingType,
        date: appt.date,
        startTime: appt.startTime,
        endTime,
        durationMinutes: duration,
        coachName,
        clientName,
        meetingLink: appt.meetingLink ?? null,
        notes: appt.notes ?? null,
        icsContent,
      };

      if (coachUser?.email) {
        sendAppointmentConfirmationEmail({
          to: coachUser.email,
          recipientName: coachUser.firstName ?? coachName,
          recipientRole: "coach",
          ...emailParams,
        }).catch((err) => console.error("[Scheduling] Coach .ics email failed (non-fatal):", err));
      }
      if (clientUser?.email) {
        sendAppointmentConfirmationEmail({
          to: clientUser.email,
          recipientName: clientUser.firstName ?? clientName,
          recipientRole: "client",
          ...emailParams,
        }).catch((err) => console.error("[Scheduling] Client .ics email failed (non-fatal):", err));
      }
    } catch (err) {
      console.error("[Scheduling] Calendar invite email failed (non-fatal):", err);
    }

    // ── 4. Google Calendar event (if the coach connected Google) ─────────
    try {
      if (isGoogleConfigured()) {
        const connection = await db.query.calendarConnections.findFirst({
          where: eq(calendarConnections.coachId, appt.coachId),
        });
        if (
          connection &&
          connection.provider === "google" &&
          connection.status === "connected"
        ) {
          const accessToken = await getValidAccessToken(db, connection);
          if (accessToken) {
            const timeZone = coachTz ?? "America/Denver";
            let description = `Session Type: ${label}\nMeeting Type: ${meeting}`;
            if (appt.meetingLink) description += `\n\nJoin: ${appt.meetingLink}`;
            if (appt.notes) description += `\n\nNotes: ${appt.notes}`;
            const attendeeEmails = [coachUser?.email, clientUser?.email].filter(
              (e): e is string => Boolean(e),
            );
            await createCalendarEvent(accessToken, connection.calendarId ?? "primary", {
              summary: `${label} — ${clientName}`,
              description,
              startISO: `${appt.date}T${appt.startTime}:00`,
              endISO: `${appt.date}T${endTime}:00`,
              timeZone,
              attendeeEmails,
            });
            // NOTE: no `googleEventId`/`externalEventId` column on `appointments`,
            // so the returned event id is not persisted here (invite still sent).
          }
        }
      }
    } catch (err) {
      console.error("[Scheduling] Google Calendar event failed (non-fatal):", err);
    }
  } catch (err) {
    // Absolute backstop — booking must never fail because of notifications.
    console.error("[Scheduling] notifyAppointmentCreated failed (non-fatal):", err);
  }
}
