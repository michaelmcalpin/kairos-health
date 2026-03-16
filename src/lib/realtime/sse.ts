/**
 * KAIROS Server-Sent Events (SSE) Handler
 *
 * Provides SSE streaming endpoints for real-time data delivery.
 * Compatible with Next.js App Router route handlers.
 */

import { eventBus, type RealtimeEvent, type RealtimeEventType } from "./events";

// ─── SSE Response Builder ───────────────────────────────────────────────────

export interface SSEOptions {
  userId: string;
  eventTypes?: RealtimeEventType[] | "*";
  lastEventId?: string;
  heartbeatInterval?: number; // ms, default 30000
}

/**
 * Create an SSE ReadableStream for use in Next.js route handlers.
 *
 * Usage in a route handler:
 * ```
 * export async function GET(req: Request) {
 *   const stream = createSSEStream({ userId, eventTypes: ["glucose:reading"] });
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       Connection: "keep-alive",
 *     },
 *   });
 * }
 * ```
 */
export function createSSEStream(options: SSEOptions): ReadableStream {
  const { userId, eventTypes = "*", lastEventId, heartbeatInterval = 30000 } = options;

  let subscriptionId: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE-formatted data
      const send = (eventType: string, data: string, id?: string) => {
        try {
          let message = "";
          if (id) message += `id: ${id}\n`;
          message += `event: ${eventType}\n`;
          message += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream closed
          cleanup();
        }
      };

      // Send initial connection event
      send("connected", JSON.stringify({ userId, timestamp: new Date().toISOString() }));

      // If client sent Last-Event-ID, replay missed events
      if (lastEventId) {
        const missedEvents = eventBus.getRecentEvents(userId, lastEventId);
        for (const event of missedEvents) {
          send(event.type, JSON.stringify(event.payload), event.id);
        }
      }

      // Subscribe to real-time events
      subscriptionId = eventBus.subscribe(userId, eventTypes, (event: RealtimeEvent) => {
        send(event.type, JSON.stringify(event.payload), event.id);
      });

      // Heartbeat to keep connection alive
      heartbeatTimer = setInterval(() => {
        send("heartbeat", JSON.stringify({ time: Date.now() }));
      }, heartbeatInterval);

      // Cleanup function
      function cleanup() {
        if (subscriptionId) {
          eventBus.unsubscribe(subscriptionId);
          subscriptionId = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
      }
    },

    cancel() {
      if (subscriptionId) {
        eventBus.unsubscribe(subscriptionId);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    },
  });
}

// ─── SSE Response Headers ───────────────────────────────────────────────────

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // Disable nginx buffering
} as const;
