/**
 * SSE endpoint for coach alert feed
 * GET /api/realtime/alerts
 *
 * Streams client alerts to coaches in real-time.
 * Events are published when health thresholds are crossed or check-ins are missed.
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
    eventTypes: ["alert:new", "alert:updated", "alert:resolved"],
    lastEventId,
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
