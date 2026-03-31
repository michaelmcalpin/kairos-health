/**
 * SSE endpoint for live glucose readings
 * GET /api/realtime/glucose
 *
 * Streams glucose readings and alerts in real-time for the authenticated client.
 * Events are published by the sync engine when new Dexcom/CGM data arrives.
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
    eventTypes: ["glucose:reading", "glucose:alert"],
    lastEventId,
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
