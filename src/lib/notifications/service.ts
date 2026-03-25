/**
 * KAIROS Notification Dispatch Service
 *
 * DB-backed notification creation, channel routing,
 * quiet hours enforcement, and delivery tracking.
 */

import type {
  Notification,
  DispatchRequest,
  NotificationPreferences,
  DeliveryChannel,
  DeliveryStatus,
  NotificationPriority,
  NotificationCategory,
} from "./types";
import { DEFAULT_PREFERENCES } from "./types";
import { NOTIFICATION_TEMPLATES, interpolateTemplate } from "./templates";
import type { Database } from "@/server/db";
import {
  notifications as notificationsTable,
  notificationPreferences as prefsTable,
} from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ─── Core Service ────────────────────────────────────────────────────────────

/**
 * Dispatch a notification to a user (persisted to DB).
 */
export async function dispatchNotification(
  db: Database,
  request: DispatchRequest
): Promise<Notification> {
  const prefs = await getUserPreferences(db, request.userId);

  // Determine priority
  const template = Object.values(NOTIFICATION_TEMPLATES).find(
    (t) => t.category === request.category
  );
  const priority = request.priority ?? template?.defaultPriority ?? "normal";

  // Determine channels
  let channels: DeliveryChannel[];
  if (request.channelOverride) {
    channels = request.channelOverride;
  } else {
    channels = getEnabledChannels(prefs, request.category, priority);
  }

  // Enforce quiet hours (urgent bypasses)
  if (priority !== "urgent" && isQuietHours(prefs)) {
    channels = channels.filter((c) => c === "in_app");
  }

  const deliveryStatus = buildDeliveryStatus(channels);

  // Insert into DB
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: request.userId,
      category: request.category as Notification["category"],
      priority,
      title: request.title,
      body: request.body,
      actionUrl: request.actionUrl,
      actionLabel: request.actionLabel,
      metadata: request.metadata,
      channels: channels as string[],
      deliveryStatus: deliveryStatus as Record<string, string>,
      read: false,
      archived: false,
    })
    .returning();

  const notification: Notification = {
    id: row.id,
    userId: row.userId,
    category: row.category as NotificationCategory,
    priority: row.priority as NotificationPriority,
    title: row.title,
    body: row.body,
    actionUrl: row.actionUrl ?? undefined,
    actionLabel: row.actionLabel ?? undefined,
    metadata: row.metadata ?? undefined,
    channels: (row.channels ?? []) as DeliveryChannel[],
    deliveryStatus: (row.deliveryStatus ?? {}) as Record<DeliveryChannel, DeliveryStatus>,
    read: row.read,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
  };

  // Trigger delivery per channel (async, fire-and-forget)
  for (const channel of channels) {
    deliverToChannel(db, notification, channel);
  }

  return notification;
}

/**
 * Dispatch from a named template with variable interpolation.
 */
export async function dispatchFromTemplate(
  db: Database,
  userId: string,
  templateKey: string,
  variables: Record<string, string | number>,
  overrides?: Partial<DispatchRequest>
): Promise<Notification> {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Notification template "${templateKey}" not found`);
  }

  return dispatchNotification(db, {
    userId,
    category: template.category,
    priority: overrides?.priority ?? template.defaultPriority,
    title: interpolateTemplate(template.titleTemplate, variables),
    body: interpolateTemplate(template.bodyTemplate, variables),
    actionUrl: template.actionUrlTemplate
      ? interpolateTemplate(template.actionUrlTemplate, variables)
      : undefined,
    actionLabel: template.actionLabel,
    ...overrides,
  });
}

// ─── Query Functions ─────────────────────────────────────────────────────────

export async function getUserNotifications(
  db: Database,
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number } = {}
): Promise<Notification[]> {
  const conditions = [eq(notificationsTable.userId, userId), eq(notificationsTable.archived, false)];

  if (options.unreadOnly) {
    conditions.push(eq(notificationsTable.read, false));
  }
  if (options.category) {
    conditions.push(eq(notificationsTable.category, options.category as NotificationCategory));
  }

  const rows = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: desc(notificationsTable.createdAt),
    limit: options.limit ?? 50,
  });

  return rows.map(mapRowToNotification);
}

export async function getUnreadCount(db: Database, userId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.read, false),
        eq(notificationsTable.archived, false)
      )
    );
  return Number(result?.count ?? 0);
}

export async function markAsRead(
  db: Database,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning();
  return !!updated;
}

export async function markAllAsRead(db: Database, userId: string): Promise<number> {
  const result = await db
    .update(notificationsTable)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)))
    .returning({ id: notificationsTable.id });
  return result.length;
}

export async function archiveNotification(
  db: Database,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const [updated] = await db
    .update(notificationsTable)
    .set({ archived: true })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning();
  return !!updated;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getUserPreferences(
  db: Database,
  userId: string
): Promise<NotificationPreferences> {
  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(prefsTable.userId, userId),
  });

  if (existing) {
    return {
      userId,
      enabled: existing.enabled,
      quietHoursStart: existing.quietHoursStart ?? undefined,
      quietHoursEnd: existing.quietHoursEnd ?? undefined,
      categories: (existing.categories ?? DEFAULT_PREFERENCES.categories) as NotificationPreferences["categories"],
    };
  }

  // Insert defaults on first access
  await db.insert(prefsTable).values({
    userId,
    enabled: DEFAULT_PREFERENCES.enabled,
    quietHoursStart: DEFAULT_PREFERENCES.quietHoursStart,
    quietHoursEnd: DEFAULT_PREFERENCES.quietHoursEnd,
    categories: DEFAULT_PREFERENCES.categories as Record<string, { in_app: boolean; email: boolean; push: boolean; sms: boolean }>,
  }).onConflictDoNothing();

  return { userId, ...DEFAULT_PREFERENCES };
}

export async function updateUserPreferences(
  db: Database,
  userId: string,
  updates: Partial<Omit<NotificationPreferences, "userId">>
): Promise<NotificationPreferences> {
  const current = await getUserPreferences(db, userId);
  const merged = { ...current, ...updates };

  await db
    .update(prefsTable)
    .set({
      enabled: merged.enabled,
      quietHoursStart: merged.quietHoursStart,
      quietHoursEnd: merged.quietHoursEnd,
      categories: merged.categories as Record<string, { in_app: boolean; email: boolean; push: boolean; sms: boolean }>,
      updatedAt: new Date(),
    })
    .where(eq(prefsTable.userId, userId));

  return merged;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function mapRowToNotification(row: typeof notificationsTable.$inferSelect): Notification {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category as NotificationCategory,
    priority: row.priority as NotificationPriority,
    title: row.title,
    body: row.body,
    actionUrl: row.actionUrl ?? undefined,
    actionLabel: row.actionLabel ?? undefined,
    metadata: row.metadata ?? undefined,
    channels: (row.channels ?? []) as DeliveryChannel[],
    deliveryStatus: (row.deliveryStatus ?? {}) as Record<DeliveryChannel, DeliveryStatus>,
    read: row.read,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
  };
}

function getEnabledChannels(
  prefs: NotificationPreferences,
  category: string,
  priority: NotificationPriority
): DeliveryChannel[] {
  if (!prefs.enabled) return ["in_app"];

  const categoryPrefs = prefs.categories[category as keyof typeof prefs.categories];
  if (!categoryPrefs) return ["in_app"];

  const channels: DeliveryChannel[] = [];
  if (categoryPrefs.in_app) channels.push("in_app");
  if (categoryPrefs.email) channels.push("email");
  if (categoryPrefs.push) channels.push("push");
  if (categoryPrefs.sms && (priority === "urgent" || priority === "high")) {
    channels.push("sms");
  }

  return channels.length > 0 ? channels : ["in_app"];
}

function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }
  return currentTime >= startTime && currentTime < endTime;
}

function buildDeliveryStatus(channels: DeliveryChannel[]): Record<DeliveryChannel, DeliveryStatus> {
  const status: Record<string, DeliveryStatus> = {};
  for (const channel of channels) {
    status[channel] = "pending";
  }
  return status as Record<DeliveryChannel, DeliveryStatus>;
}

function deliverToChannel(db: Database, notification: Notification, channel: DeliveryChannel): void {
  // In production, call actual delivery providers (Resend, FCM, Twilio, etc.)
  // For now, update delivery status to "sent" after short delay
  setTimeout(async () => {
    try {
      const currentStatus = { ...(notification.deliveryStatus ?? {}) };
      currentStatus[channel] = "sent";
      await db
        .update(notificationsTable)
        .set({ deliveryStatus: currentStatus as Record<string, string> })
        .where(eq(notificationsTable.id, notification.id));
    } catch {
      // Non-critical — delivery status update failure is logged but not thrown
    }
  }, 100);
}

// ─── Clear Store (for testing — noop with DB, tests use transactions) ────────

export function clearNotificationStore(): void {
  // No-op; tests should use transaction rollbacks or direct DB cleanup
}
