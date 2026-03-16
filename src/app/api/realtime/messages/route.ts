/**
 * SSE endpoint for real-time messaging
 * GET /api/realtime/messages
 *
 * Streams new messages and typing indicators to clients and coaches.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createSSEStream,
  SSE_HEADERS,
} from "@/lib/realtime";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stream = createSSEStream({
    userId,
    eventTypes: ["coach:message"],
    heartbeatInterval: 30000,
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
