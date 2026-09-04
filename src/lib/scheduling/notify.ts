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
import { users, coachAvailability, calendarConnections, userContactInfo } from "@/server/db/schema";
import { dispatchNotification, getUserPreferences } from "@/lib/notifications/service";
import type { DeliveryChannel } from "@/lib/notifications/types";
import { generateIcsContent } from "@/lib/calendar/ics";
import { sendAppointmentConfirmationEmail } from "@/lib/email/sender";
import { buildAppointmentConfirmationEmail } from "@/lib/email/templates";
import { sendCoachEmail } from "@/lib/integrations/coach-email";
import { timezoneLabel } from "@/lib/timezone";
import {
  isGoogleConfigured,
  getValidAccessToken,
  createCalendarEvent,
} from "@/lib/integrations/google-calendar";
import {
  isMicrosoftConfigured,
  getMicrosoftValidAccessToken,
  createMicrosoftEvent,
} from "@/lib/integrations/microsoft-calendar";

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
  // Absolute UTC instant of the start — used to translate the time into each
  // recipient's own timezone and to encode the .ics absolutely.
  startsAt?: string | Date | null;
  durationMinutes?: number | null;
  meetingLink?: string | null;
  notes?: string | null;
}

/** Format an absolute instant into {date, time} strings in a given IANA zone. */
function formatInZone(instant: Date, tz: string): { date: string; time: string } {
  const date = instant.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = instant.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { date, time };
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

    // Look up both users, the coach's timezone, and the client's saved timezone.
    const [coachUser, clientUser, avail, clientContact] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, appt.coachId) }),
      db.query.users.findFirst({ where: eq(users.id, appt.clientId) }),
      db.query.coachAvailability.findFirst({ where: eq(coachAvailability.coachId, appt.coachId) }),
      db.query.userContactInfo.findFirst({ where: eq(userContactInfo.userId, appt.clientId) }),
    ]);

    const coachTz = avail?.timezone ?? "America/Denver";
    // The client's zone for their email/notification. We can't read the client's
    // live device zone server-side, so use their saved timezone if set, else the
    // coach's zone. The .ics is absolute, so their calendar is always correct.
    const clientTz = clientContact?.timezone || coachTz;

    // Per-recipient "when" strings from the absolute instant, each in that
    // recipient's OWN timezone. Fall back to coach wall-clock for legacy rows.
    const instant = appt.startsAt ? new Date(appt.startsAt) : null;
    const validInstant = instant && !Number.isNaN(instant.getTime()) ? instant : null;

    let coachWhen: string;
    let clientWhen: string;
    let coachFmt: { date: string; time: string } | null = null;
    let clientFmt: { date: string; time: string } | null = null;
    if (validInstant) {
      coachFmt = formatInZone(validInstant, coachTz);
      clientFmt = formatInZone(validInstant, clientTz);
      coachWhen = `${coachFmt.date} at ${coachFmt.time}`;
      clientWhen = `${clientFmt.date} at ${clientFmt.time}`;
    } else {
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
      const zonedTime = `${displayTime} (${timezoneLabel(coachTz)})`;
      // Always carry a timezone label, even on the legacy wall-clock fallback.
      coachFmt = { date: displayDate, time: zonedTime };
      clientFmt = coachFmt;
      coachWhen = `${displayDate} at ${zonedTime}`;
      clientWhen = coachWhen;
    }

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
        body: `${clientName} ${clientInitiated ? "requested" : "is booked for"} a ${label.toLowerCase()} (${meeting.toLowerCase()}) on ${coachWhen}.`,
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
      let body = `Your ${label.toLowerCase()} (${meeting.toLowerCase()}) with ${coachName} is ${requested ? "requested" : "confirmed"} for ${clientWhen}.`;
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
        startsAt: appt.startsAt ?? null,
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

      // Coach's own copy stays on the system sender.
      if (coachUser?.email) {
        sendAppointmentConfirmationEmail({
          to: coachUser.email,
          recipientName: coachUser.firstName ?? coachName,
          recipientRole: "coach",
          // Coach sees the time in their own timezone.
          displayDateOverride: coachFmt?.date,
          displayTimeOverride: coachFmt?.time,
          ...emailParams,
        }).catch((err) => console.error("[Scheduling] Coach .ics email failed (non-fatal):", err));
      }

      // The CLIENT's .ics confirmation is sent AS THE COACH (from their Gmail
      // when connected + scoped), falling back to the system sender otherwise.
      // sendCoachEmail replaces the previous system send here — no double-send.
      if (clientUser?.email) {
        // Short date for the subject, in the client's zone when we have the
        // instant, else from the stored calendar date.
        const shortDate = validInstant
          ? validInstant.toLocaleDateString("en-US", { timeZone: clientTz, month: "short", day: "numeric" })
          : new Date(`${appt.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const clientHtml = buildAppointmentConfirmationEmail({
          recipientName: clientUser.firstName ?? clientName,
          recipientRole: "client",
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
          // Client sees the time in their own timezone.
          displayDateOverride: clientFmt?.date,
          displayTimeOverride: clientFmt?.time,
        });
        sendCoachEmail(db, appt.coachId, {
          to: clientUser.email,
          subject: `Session Confirmed: ${label} with ${coachName} — ${shortDate}`,
          html: clientHtml,
          icsContent,
          icsFilename: `everist-session-${appt.date}.ics`,
          fromName: coachName,
        }).catch((err) =>
          console.error("[Scheduling] Client send-as-coach email failed (non-fatal):", err),
        );
      }
    } catch (err) {
      console.error("[Scheduling] Calendar invite email failed (non-fatal):", err);
    }

    // ── 4. Calendar event(s) — create on EVERY provider the coach connected
    // (Google and/or Microsoft). Each provider auto-emails invites to
    // attendees. All non-fatal. NOTE: no `googleEventId`/`externalEventId`
    // column on `appointments`, so returned event ids aren't persisted here
    // (invites still sent).
    try {
      const timeZone = coachTz ?? "America/Denver";
      let description = `Session Type: ${label}\nMeeting Type: ${meeting}`;
      if (appt.meetingLink) description += `\n\nJoin: ${appt.meetingLink}`;
      if (appt.notes) description += `\n\nNotes: ${appt.notes}`;
      const attendeeEmails = [coachUser?.email, clientUser?.email].filter(
        (e): e is string => Boolean(e),
      );
      const startISO = `${appt.date}T${appt.startTime}:00`;
      const endISO = `${appt.date}T${endTime}:00`;
      const summary = `${label} — ${clientName}`;

      const connections = await db.query.calendarConnections.findMany({
        where: eq(calendarConnections.coachId, appt.coachId),
      });

      for (const connection of connections) {
        if (connection.status !== "connected") continue;

        if (connection.provider === "google" && isGoogleConfigured()) {
          const accessToken = await getValidAccessToken(db, connection);
          if (accessToken) {
            await createCalendarEvent(accessToken, connection.calendarId ?? "primary", {
              summary,
              description,
              startISO,
              endISO,
              timeZone,
              attendeeEmails,
            });
          }
        } else if (connection.provider === "microsoft" && isMicrosoftConfigured()) {
          const accessToken = await getMicrosoftValidAccessToken(db, connection);
          if (accessToken) {
            await createMicrosoftEvent(accessToken, {
              subject: summary,
              // Graph expects HTML body content — preserve the plain-text
              // description's line breaks.
              bodyHtml: description.replace(/\n/g, "<br>"),
              startISO,
              endISO,
              timeZone,
              attendeeEmails,
            });
          }
        }
      }
    } catch (err) {
      console.error("[Scheduling] Calendar event creation failed (non-fatal):", err);
    }
  } catch (err) {
    // Absolute backstop — booking must never fail because of notifications.
    console.error("[Scheduling] notifyAppointmentCreated failed (non-fatal):", err);
  }
}
