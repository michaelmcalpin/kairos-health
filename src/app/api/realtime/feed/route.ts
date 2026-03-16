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
  eventBus,
  createRealtimeEvent,
  type AuditPayload,
} from "@/lib/realtime";

const DEMO_ACTIONS = [
  { action: "user.login", actor: "Sarah Chen", resource: "auth", details: "Client portal login" },
  { action: "glucose.reading", actor: "System", resource: "dexcom_sync", details: "Batch import: 12 readings" },
  { action: "coach.review", actor: "Dr. Williams", resource: "client/sarah-chen", details: "Reviewed sleep data" },
  { action: "alert.resolved", actor: "Dr. Martinez", resource: "alert/hrv_decline", details: "Acknowledged HRV alert for James Kim" },
  { action: "subscription.renewed", actor: "System", resource: "billing", details: "Tier 1 renewal: Emily Brooks" },
  { action: "lab.uploaded", actor: "LabCorp API", resource: "labs", details: "CMP results for Michael Torres" },
  { action: "checkin.completed", actor: "Rachel Adams", resource: "checkin", details: "Daily check-in submitted" },
  { action: "coach.assigned", actor: "Admin", resource: "coach/dr-williams", details: "New client assignment" },
  { action: "report.generated", actor: "System", resource: "analytics", details: "Weekly platform summary" },
  { action: "user.registered", actor: "System", resource: "auth", details: "New Tier 2 client onboarded" },
];

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const demo = url.searchParams.get("demo") === "true";
  const lastEventId = req.headers.get("Last-Event-ID") ?? undefined;

  const stream = createSSEStream({
    userId: demo ? "*" : userId,
    eventTypes: ["admin:audit"],
    lastEventId,
  });

  if (demo) {
    let idx = 0;
    const demoInterval = setInterval(() => {
      const template = DEMO_ACTIONS[idx % DEMO_ACTIONS.length];
      idx++;

      const audit: AuditPayload = {
        entryId: `audit_${Date.now()}`,
        ...template,
      };

      eventBus.publish(createRealtimeEvent("admin:audit", "*", audit));
    }, 6000); // New audit entry every 6 seconds for demo

    req.signal.addEventListener("abort", () => clearInterval(demoInterval));
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
