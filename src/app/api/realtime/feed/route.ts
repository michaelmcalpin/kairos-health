/**
 * SSE endpoint for admin activity feed
 * GET /api/realtime/feed
 *
 * Streams platform-wide activity events to admin users.
 * Includes audit events, system metrics, and aggregated alerts.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createSSEStream,
  SSE_HEADERS,
} from "@/lib/realtime";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastEventId = req.headers.get("Last-Event-ID") ?? undefined;

  const stream = createSSEStream({
    userId,
    eventTypes: ["admin:audit"],
    lastEventId,
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
