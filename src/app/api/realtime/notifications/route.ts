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
  eventBus,
  createRealtimeEvent,
  type NotificationPayload,
} from "@/lib/realtime";

const DEMO_NOTIFICATIONS: Omit<NotificationPayload, "notificationId" | "read">[] = [
  { title: "Glucose In Range", body: "Your time-in-range improved to 87% today!", category: "health", actionUrl: "/glucose" },
  { title: "Coach Message", body: "Dr. Williams commented on your sleep data", category: "coaching", actionUrl: "/sleep" },
  { title: "Supplement Reminder", body: "Don't forget your evening supplement stack", category: "health", actionUrl: "/supplements" },
  { title: "Lab Results Ready", body: "Your comprehensive metabolic panel results are in", category: "health", actionUrl: "/labs" },
  { title: "Weekly Summary", body: "Your weekly health report is ready to review", category: "health", actionUrl: "/dashboard" },
  { title: "Payment Processed", body: "Your subscription renewal was successful", category: "billing", actionUrl: "/payments" },
  { title: "New Achievement", body: "You've maintained a 30-day workout streak!", category: "health", actionUrl: "/workouts" },
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
    userId,
    eventTypes: ["notification:new"],
    lastEventId,
  });

  if (demo) {
    let idx = 0;
    const demoInterval = setInterval(() => {
      const template = DEMO_NOTIFICATIONS[idx % DEMO_NOTIFICATIONS.length];
      idx++;

      const notification: NotificationPayload = {
        notificationId: `notif_${Date.now()}`,
        read: false,
        ...template,
      };

      eventBus.publish(createRealtimeEvent("notification:new", userId, notification));
    }, 12000); // New notification every 12 seconds for demo

    req.signal.addEventListener("abort", () => clearInterval(demoInterval));
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
