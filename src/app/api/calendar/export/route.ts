import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { appointments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { generateIcsContent, generateIcsFilename, addMinutesToTime } from "@/lib/calendar/ics";

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

    const dateStr = typeof appt.date === "string" ? appt.date : new Date(appt.date).toISOString().split("T")[0];
    const startTime = appt.startTime ?? "09:00";
    const endTime = appt.endTime ?? addMinutesToTime(startTime, appt.durationMinutes ?? 30);

    const icsContent = generateIcsContent({
      id: appt.id,
      date: dateStr,
      startTime,
      endTime,
      durationMinutes: appt.durationMinutes,
      sessionType: appt.sessionType ?? "session",
      meetingType: appt.meetingType ?? "video",
      clientName: appt.clientName ?? "Client",
      coachName: appt.coachName ?? "Coach",
      meetingLink: appt.meetingLink,
      notes: appt.notes,
    });

    const fileName = generateIcsFilename(dateStr);
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
