import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { appointments } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/calendar/export?appointmentId=xxx
 *
 * Returns an .ics calendar file for a specific appointment.
 * Compatible with Gmail, Outlook, iOS Calendar, and other calendar apps.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointmentId = req.nextUrl.searchParams.get("appointmentId");
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Build date/time strings for the .ics file
    // Format: YYYYMMDDTHHMMSSZ (UTC)
    const dateStr = typeof appt.date === "string" ? appt.date : new Date(appt.date).toISOString().split("T")[0];
    const startTime = appt.startTime ?? "09:00";
    const endTime = appt.endTime ?? addMinutesToTime(startTime, appt.durationMinutes ?? 30);

    const dtStart = formatIcsDateTime(dateStr, startTime);
    const dtEnd = formatIcsDateTime(dateStr, endTime);

    // Build event details
    const sessionLabel = formatSessionType(appt.sessionType ?? "session");
    const summary = `${sessionLabel} — ${appt.clientName ?? "Client"} & ${appt.coachName ?? "Coach"}`;
    const meetingTypeLabel = appt.meetingType === "video" ? "Video Call" : appt.meetingType === "phone" ? "Phone Call" : "In Person";

    let description = `Session Type: ${sessionLabel}\\nMeeting Type: ${meetingTypeLabel}`;
    if (appt.meetingLink) {
      description += `\\n\\nJoin Video Call:\\n${appt.meetingLink}`;
    }
    if (appt.notes) {
      description += `\\n\\nNotes: ${appt.notes.replace(/\n/g, "\\n")}`;
    }

    let location = "";
    if (appt.meetingLink) {
      location = appt.meetingLink;
    } else if (appt.meetingType === "phone") {
      location = "Phone Call";
    }

    // Generate unique ID for the event
    const uid = `${appt.id}@everist.ai`;
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    // Build .ics content (RFC 5545)
    const icsContent = [
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
      ...(appt.meetingLink ? [`URL:${appt.meetingLink}`] : []),
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(sessionLabel)} in 15 minutes`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // Return as downloadable .ics file
    const fileName = `everist-session-${dateStr}.ics`;
    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err) {
    console.error("[Calendar Export Error]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function formatIcsDateTime(dateStr: string, timeStr: string): string {
  // dateStr: "2025-01-15", timeStr: "09:00" or "09:00:00"
  const [y, m, d] = dateStr.split("-");
  const [h, min] = timeStr.split(":");
  return `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${h.padStart(2, "0")}${min.padStart(2, "0")}00`;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function formatSessionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
