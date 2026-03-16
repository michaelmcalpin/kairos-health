/**
 * SSE endpoint for live glucose readings
 * GET /api/realtime/glucose
 *
 * Streams glucose readings in real-time for the authenticated client.
 * In demo mode, generates simulated CGM data every 5 minutes.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createSSEStream,
  SSE_HEADERS,
  eventBus,
  createRealtimeEvent,
  type GlucoseReadingPayload,
  type GlucoseAlertPayload,
} from "@/lib/realtime";

// Simulated CGM data generator for demo mode
function generateGlucoseReading(baseValue: number): GlucoseReadingPayload {
  const variation = (Math.random() - 0.5) * 20;
  const value = Math.round(baseValue + variation);
  const trend =
    variation > 8 ? "rising_fast" as const :
    variation > 3 ? "rising" as const :
    variation < -8 ? "falling_fast" as const :
    variation < -3 ? "falling" as const :
    "stable" as const;

  return {
    readingId: `gr_${Date.now()}`,
    value,
    unit: "mg/dL",
    trend,
    source: "dexcom_g7_demo",
  };
}

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
    eventTypes: ["glucose:reading", "glucose:alert"],
    lastEventId,
  });

  // In demo mode, generate simulated readings
  if (demo) {
    let baseGlucose = 95;
    const demoInterval = setInterval(() => {
      // Simulate natural glucose fluctuation
      baseGlucose += (Math.random() - 0.48) * 5;
      baseGlucose = Math.max(65, Math.min(180, baseGlucose));

      const reading = generateGlucoseReading(baseGlucose);
      const event = createRealtimeEvent("glucose:reading", userId, reading);
      eventBus.publish(event);

      // Check for alert conditions
      if (reading.value > 160 || reading.value < 70) {
        const alert: GlucoseAlertPayload = {
          readingId: reading.readingId,
          value: reading.value,
          threshold: reading.value > 160 ? 160 : 70,
          direction: reading.value > 160 ? "high" : "low",
          severity: reading.value > 180 || reading.value < 60 ? "critical" : "warning",
        };
        eventBus.publish(createRealtimeEvent("glucose:alert", userId, alert));
      }
    }, 5000); // Every 5 seconds for demo (real CGM: 5 min)

    // Cleanup on stream close
    req.signal.addEventListener("abort", () => clearInterval(demoInterval));
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
