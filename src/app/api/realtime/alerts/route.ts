/**
 * SSE endpoint for coach alert feed
 * GET /api/realtime/alerts
 *
 * Streams client alerts to coaches in real-time.
 * In demo mode, generates simulated alerts from assigned clients.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createSSEStream,
  SSE_HEADERS,
  eventBus,
  createRealtimeEvent,
  type AlertPayload,
} from "@/lib/realtime";

const DEMO_CLIENTS = [
  { id: "client_1", name: "Sarah Chen" },
  { id: "client_2", name: "Michael Torres" },
  { id: "client_3", name: "Emily Brooks" },
  { id: "client_4", name: "James Kim" },
  { id: "client_5", name: "Rachel Adams" },
];

const ALERT_TEMPLATES: Omit<AlertPayload, "alertId" | "clientId" | "clientName">[] = [
  { type: "glucose_high", severity: "high", title: "High Glucose Alert", message: "Blood glucose exceeded 180 mg/dL threshold" },
  { type: "glucose_low", severity: "critical", title: "Low Glucose Alert", message: "Blood glucose dropped below 65 mg/dL" },
  { type: "sleep_deficit", severity: "medium", title: "Sleep Deficit", message: "Less than 5 hours of sleep recorded last night" },
  { type: "missed_checkin", severity: "low", title: "Missed Check-in", message: "No daily check-in for 2 consecutive days" },
  { type: "supplement_adherence", severity: "medium", title: "Low Supplement Adherence", message: "Supplement adherence dropped below 60% this week" },
  { type: "hrv_decline", severity: "high", title: "HRV Decline", message: "Heart rate variability decreased 25% from baseline" },
  { type: "workout_streak", severity: "low", title: "Workout Streak Broken", message: "No workout logged in 5 days" },
];

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const demo = url.searchParams.get("demo") === "true";
  const lastEventId = req.headers.get("Last-Event-ID") ?? undefined;

  // Coaches subscribe to all alert types for their clients
  // Using "*" as userId to receive all alerts (coach-level access)
  const stream = createSSEStream({
    userId: demo ? "*" : userId,
    eventTypes: ["alert:new", "alert:updated", "alert:resolved"],
    lastEventId,
  });

  if (demo) {
    const demoInterval = setInterval(() => {
      const client = DEMO_CLIENTS[Math.floor(Math.random() * DEMO_CLIENTS.length)];
      const template = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];

      const alert: AlertPayload = {
        alertId: `alert_${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        ...template,
      };

      eventBus.publish(createRealtimeEvent("alert:new", "*", alert));
    }, 8000); // New alert every 8 seconds for demo

    req.signal.addEventListener("abort", () => clearInterval(demoInterval));
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
