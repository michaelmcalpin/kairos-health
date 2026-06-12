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
    // 1. Check if the appointments table exists and its columns
    try {
      const cols = await sql`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position
      `;
      results.tableColumns = cols;
    } catch (e) {
      results.tableColumnsError = e instanceof Error ? e.message : String(e);
    }

    // 2. Check enum types
    try {
      const enums = await sql`
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname IN ('session_type', 'meeting_type', 'appointment_status')
        ORDER BY t.typname, e.enumsortorder
      `;
      results.enumValues = enums;
    } catch (e) {
      results.enumValuesError = e instanceof Error ? e.message : String(e);
    }

    // 3. Try raw SQL INSERT
    try {
      const inserted = await sql`
        INSERT INTO appointments (
          coach_id, client_id, coach_name, client_name,
          session_type, meeting_type, date, start_time,
          end_time, duration_minutes, notes
        ) VALUES (
          '629ce212-9831-4e71-8060-8a6c2f73cbb6',
          '629ce212-9831-4e71-8060-8a6c2f73cbb6',
          'Michael', 'Test Debug',
          'follow_up', 'phone', '2026-12-31', '09:00',
          '09:30', 30, 'debug raw sql test'
        ) RETURNING id
      `;
      results.insertSuccess = true;
      results.insertedId = inserted[0]?.id;

      // Clean up
      if (inserted[0]?.id) {
        await sql`DELETE FROM appointments WHERE id = ${inserted[0].id}`;
        results.cleaned = true;
      }
    } catch (e: unknown) {
      results.insertSuccess = false;
      const err = e as Record<string, unknown>;
      results.insertError = {
        message: e instanceof Error ? e.message : String(e),
        code: err?.code,
        constraint: err?.constraint_name ?? err?.constraint,
        detail: err?.detail,
        table: err?.table_name ?? err?.table,
        column: err?.column_name ?? err?.column,
        schema: err?.schema_name ?? err?.schema,
        severity: err?.severity,
        routine: err?.routine,
        hint: err?.hint,
        where: err?.where,
        position: err?.position,
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
