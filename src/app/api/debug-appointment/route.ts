import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  const sql = postgres(process.env.DATABASE_URL ?? "", {
    ssl: "require",
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });

  const results: Record<string, unknown> = {};

  try {
    // 1. Add missing columns: meeting_link and zoom_meeting_id
    try {
      await sql`
        ALTER TABLE appointments
        ADD COLUMN IF NOT EXISTS meeting_link varchar(500),
        ADD COLUMN IF NOT EXISTS zoom_meeting_id varchar(50)
      `;
      results.addColumns = "success";
    } catch (e) {
      results.addColumnsError = e instanceof Error ? e.message : String(e);
    }

    // 2. Verify columns now exist
    try {
      const cols = await sql`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position
      `;
      results.columns = cols.map(c => c.column_name);
    } catch (e) {
      results.columnsError = e instanceof Error ? e.message : String(e);
    }

    // 3. Test a Drizzle-style INSERT (with all 18 columns)
    try {
      const inserted = await sql`
        INSERT INTO appointments (
          coach_id, client_id, coach_name, client_name,
          session_type, meeting_type, date, start_time,
          end_time, duration_minutes, notes,
          meeting_link, zoom_meeting_id
        ) VALUES (
          '629ce212-9831-4e71-8060-8a6c2f73cbb6',
          '629ce212-9831-4e71-8060-8a6c2f73cbb6',
          'Michael', 'Test With Zoom Cols',
          'follow_up', 'phone', '2026-12-31', '09:00',
          '09:30', 30, 'test with zoom columns',
          NULL, NULL
        ) RETURNING id
      `;
      results.insertWithZoomCols = "success";
      results.insertedId = inserted[0]?.id;

      // Clean up
      if (inserted[0]?.id) {
        await sql`DELETE FROM appointments WHERE id = ${inserted[0].id}`;
        results.cleaned = true;
      }
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      results.insertWithZoomCols = "failed";
      results.insertError = {
        message: e instanceof Error ? e.message : String(e),
        code: err?.code,
        detail: err?.detail,
      };
    }

    await sql.end();
    return NextResponse.json(results);
  } catch (e) {
    await sql.end();
    return NextResponse.json({
      fatalError: e instanceof Error ? e.message : String(e),
      results,
    }, { status: 500 });
  }
}
