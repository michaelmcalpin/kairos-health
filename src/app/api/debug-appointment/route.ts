import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { appointments } from "@/server/db/schema";

export async function GET() {
  // Try to insert a test appointment and capture the exact error
  try {
    const [created] = await db
      .insert(appointments)
      .values({
        coachId: "629ce212-9831-4e71-8060-8a6c2f73cbb6", // Michael's ID
        clientId: "629ce212-9831-4e71-8060-8a6c2f73cbb6", // Self — just for testing
        clientName: "Test Debug",
        coachName: "Michael",
        sessionType: "follow_up",
        meetingType: "phone",
        date: "2026-12-31",
        startTime: "09:00",
        endTime: "09:30",
        durationMinutes: 30,
        notes: "debug test",
      })
      .returning();

    // If it succeeds, delete the test row
    if (created) {
      const { eq } = await import("drizzle-orm");
      await db.delete(appointments).where(eq(appointments.id, created.id));
    }

    return NextResponse.json({ success: true, created: created?.id });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    return NextResponse.json({
      success: false,
      errorType: err?.constructor?.name,
      message: err instanceof Error ? err.message : String(err),
      code: e?.code,
      constraint: e?.constraint,
      detail: e?.detail,
      table: e?.table,
      column: e?.column,
      schema: e?.schema,
      dataType: e?.dataType,
      severity: e?.severity,
      routine: e?.routine,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
