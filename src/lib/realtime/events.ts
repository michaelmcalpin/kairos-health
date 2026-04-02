/**
 * KAIROS Real-Time Event System
 *
 * Server-Sent Events (SSE) based real-time data streaming.
 * Uses an in-memory event bus for pub/sub between server processes.
 * When scaling horizontally, replace with Redis pub/sub.
 */

import crypto from "crypto";
import { logger } from "@/lib/middleware/logger";

// ─── Event Types ────────────────────────────────────────────────────────────

export type RealtimeEventType =
  | "glucose:reading"
  | "glucose:alert"
  | "sleep:session"
  | "vitals:heartRate"
  | "vitals:hrv"
  | "alert:new"
  | "alert:updated"
  | "alert:resolved"
  | "notification:new"
  | "checkin:completed"
  | "workout:completed"
  | "coach:message"
  | "admin:audit"
  | "system:maintenance";

export interface RealtimeEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  userId: string;
  payload: T;
}

// ─── Payload Types ──────────────────────────────────────────────────────────

export interface GlucoseReadingPayload {
  readingId: string;
  value: number;
  unit: "mg/dL" | "mmol/L";
  trend: "rising_fast" | "rising" | "stable" | "falling" | "falling_fast";
  source: string;
}

export interface GlucoseAlertPayload {
  readingId: string;
  value: number;
  threshold: number;
  direction: "high" | "low";
  severity: "warning" | "critical";
}

export interface AlertPayload {
  alertId: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  clientId?: string;
  clientName?: string;
}

export interface NotificationPayload {
  notificationId: string;
  title: string;
  body: string;
  category: "health" | "coaching" | "billing" | "system";
  actionUrl?: string;
  read: boolean;
}

export interface CoachMessagePayload {
  messageId: string;
  fromUserId: string;
  fromName: string;
  preview: string;
  threadId?: string;
}

export interface AuditPayload {
  entryId: string;
  action: string;
  actor: string;
  resource: string;
  details?: string;
}

// ─── Event Bus ──────────────────────────────────────────────────────────────

type EventHandler = (event: RealtimeEvent) => void;

interface Subscription {
  id: string;
  userId: string;
  types: RealtimeEventType[] | "*";
  handler: EventHandler;
}

class EventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistory = 100;

  /**
   * Subscribe to events for a specific user
   */
  subscribe(
    userId: string,
    types: RealtimeEventType[] | "*",
    handler: EventHandler
  ): string {
    const id = `sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    this.subscriptions.set(id, { id, userId, types, handler });
    return id;
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Publish an event to all matching subscribers
   */
  publish(event: RealtimeEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    // Dispatch to matching subscribers
    const subs = Array.from(this.subscriptions.values());
    for (const sub of subs) {
      const matchesUser = sub.userId === event.userId || sub.userId === "*";
      const matchesType = sub.types === "*" || sub.types.includes(event.type);

      if (matchesUser && matchesType) {
        try {
          sub.handler(event);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error("realtime", "Event handler error", { subscriptionId: sub.id, eventType: event.type, error: errorMsg });
        }
      }
    }
  }

  /**
   * Get recent events for a user (for catch-up on reconnect)
   */
  getRecentEvents(userId: string, since?: string): RealtimeEvent[] {
    return this.eventHistory.filter((e) => {
      const matchesUser = e.userId === userId;
      const matchesTime = since ? e.timestamp > since : true;
      return matchesUser && matchesTime;
    });
  }

  /**
   * Get active subscription count (for monitoring)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Singleton event bus
export const eventBus = new EventBus();

// ─── Helper: Create Event ───────────────────────────────────────────────────

export function createRealtimeEvent<T>(
  type: RealtimeEventType,
  userId: string,
  payload: T
): RealtimeEvent<T> {
  return {
    id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    type,
    timestamp: new Date().toISOString(),
    userId,
    payload,
  };
}
