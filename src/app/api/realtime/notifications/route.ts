/**
 * SSE endpoint for user notifications
 * GET /api/realtime/notifications
 *
 * Streams notifications to any authenticated user.
 * Supports all roles (client, coach, admin).
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
    eventTypes: ["notification:new"],
    lastEventId,
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
