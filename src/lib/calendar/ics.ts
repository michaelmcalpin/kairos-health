/**
 * ICS Calendar File Generator
 *
 * Generates RFC 5545 compliant .ics content for appointments.
 * Used by both the /api/calendar/export endpoint (download) and
 * by the email sender (attachment on appointment creation).
 */

export interface IcsEventInput {
  id: string;
  date: string;            // "YYYY-MM-DD"
  startTime: string;       // "HH:MM"
  endTime?: string | null;
  durationMinutes?: number | null;
  sessionType: string;
  meetingType: string;
  clientName: string;
  coachName: string;
  meetingLink?: string | null;
  notes?: string | null;
}

/**
 * Generate .ics calendar content for an appointment.
 *
 * @returns The full .ics file content as a string.
 */
export function generateIcsContent(event: IcsEventInput): string {
  const dateStr = event.date;
  const startTime = event.startTime;
  const endTime = event.endTime ?? addMinutesToTime(startTime, event.durationMinutes ?? 30);

  const dtStart = formatIcsDateTime(dateStr, startTime);
  const dtEnd = formatIcsDateTime(dateStr, endTime);

  const sessionLabel = formatSessionType(event.sessionType);
  const summary = `${sessionLabel} — ${event.clientName} & ${event.coachName}`;
  const meetingTypeLabel =
    event.meetingType === "video" ? "Video Call"
    : event.meetingType === "phone" ? "Phone Call"
    : "In Person";

  let description = `Session Type: ${sessionLabel}\\nMeeting Type: ${meetingTypeLabel}`;
  if (event.meetingLink) {
    description += `\\n\\nJoin Video Call:\\n${event.meetingLink}`;
  }
  if (event.notes) {
    description += `\\n\\nNotes: ${event.notes.replace(/\n/g, "\\n")}`;
  }

  let location = "";
  if (event.meetingLink) {
    location = event.meetingLink;
  } else if (event.meetingType === "phone") {
    location = "Phone Call";
  }

  const uid = `${event.id}@everist.ai`;
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Everist.ai//Health Platform//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    ...(event.meetingLink ? [`URL:${event.meetingLink}`] : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(sessionLabel)} in 15 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Generate a suggested filename for the .ics download.
 */
export function generateIcsFilename(date: string): string {
  return `everist-session-${date}.ics`;
}

// ─── Helpers ────────────────────────────────────────────────────

export function formatIcsDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const [h, min] = timeStr.split(":");
  return `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${h.padStart(2, "0")}${min.padStart(2, "0")}00`;
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function formatSessionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
