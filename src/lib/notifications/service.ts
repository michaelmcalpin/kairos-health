/**
 * KAIROS Notification Dispatch Service
 *
 * Handles notification creation, channel routing,
 * quiet hours enforcement, and delivery tracking.
 */

import type {
  Notification,
  DispatchRequest,
  NotificationPreferences,
  DeliveryChannel,
  DeliveryStatus,
  NotificationPriority,
} from "./types";
import { DEFAULT_PREFERENCES } from "./types";
import { NOTIFICATION_TEMPLATES, interpolateTemplate } from "./templates";

// ─── In-memory store (production would use database) ─────────────────────────

const notificationStore: Map<string, Notification[]> = new Map();
const preferencesStore: Map<string, NotificationPreferences> = new Map();

// ─── Notification ID Generator ───────────────────────────────────────────────

function generateId(): string {
  return `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Core Service ────────────────────────────────────────────────────────────

/**
 * Dispatch a notification to a user.
 * Respects user preferences, quiet hours, and priority overrides.
 */
export function dispatchNotification(request: DispatchRequest): Notification {
  const prefs = getUserPreferences(request.userId);

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
    channels = channels.filter((c) => c === "in_app"); // Only in-app during quiet hours
  }

  // Create notification
  const notification: Notification = {
    id: generateId(),
    userId: request.userId,
    category: request.category,
    priority,
    title: request.title,
    body: request.body,
    actionUrl: request.actionUrl,
    actionLabel: request.actionLabel,
    metadata: request.metadata,
    channels,
    deliveryStatus: buildDeliveryStatus(channels),
    read: false,
    archived: false,
    createdAt: new Date().toISOString(),
  };

  // Store notification
  const userNotifications = notificationStore.get(request.userId) ?? [];
  userNotifications.unshift(notification);
  notificationStore.set(request.userId, userNotifications);

  // Trigger delivery per channel (async, fire-and-forget)
  for (const channel of channels) {
    deliverToChannel(notification, channel);
  }

  return notification;
}

/**
 * Dispatch from a named template with variable interpolation.
 */
export function dispatchFromTemplate(
  userId: string,
  templateKey: string,
  variables: Record<string, string | number>,
  overrides?: Partial<DispatchRequest>
): Notification {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Notification template "${templateKey}" not found`);
  }

  return dispatchNotification({
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

export function getUserNotifications(
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number } = {}
): Notification[] {
  let notifications = notificationStore.get(userId) ?? [];

  if (options.unreadOnly) {
    notifications = notifications.filter((n) => !n.read);
  }
  if (options.category) {
    notifications = notifications.filter((n) => n.category === options.category);
  }
  if (options.limit) {
    notifications = notifications.slice(0, options.limit);
  }

  return notifications;
}

export function getUnreadCount(userId: string): number {
  const notifications = notificationStore.get(userId) ?? [];
  return notifications.filter((n) => !n.read && !n.archived).length;
}

export function markAsRead(userId: string, notificationId: string): boolean {
  const notifications = notificationStore.get(userId);
  if (!notifications) return false;

  const notification = notifications.find((n) => n.id === notificationId);
  if (!notification) return false;

  notification.read = true;
  notification.readAt = new Date().toISOString();
  return true;
}

export function markAllAsRead(userId: string): number {
  const notifications = notificationStore.get(userId);
  if (!notifications) return 0;

  let count = 0;
  const now = new Date().toISOString();
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      n.readAt = now;
      count++;
    }
  }
  return count;
}

export function archiveNotification(userId: string, notificationId: string): boolean {
  const notifications = notificationStore.get(userId);
  if (!notifications) return false;

  const notification = notifications.find((n) => n.id === notificationId);
  if (!notification) return false;

  notification.archived = true;
  return true;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export function getUserPreferences(userId: string): NotificationPreferences {
  const existing = preferencesStore.get(userId);
  if (existing) return existing;

  const defaults: NotificationPreferences = { userId, ...DEFAULT_PREFERENCES };
  preferencesStore.set(userId, defaults);
  return defaults;
}

export function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, "userId">>
): NotificationPreferences {
  const current = getUserPreferences(userId);
  const updated = { ...current, ...updates };
  preferencesStore.set(userId, updated);
  return updated;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function getEnabledChannels(
  prefs: NotificationPreferences,
  category: string,
  priority: NotificationPriority
): DeliveryChannel[] {
  if (!prefs.enabled) return ["in_app"]; // Always deliver in-app minimum

  const categoryPrefs = prefs.categories[category as keyof typeof prefs.categories];
  if (!categoryPrefs) return ["in_app"];

  const channels: DeliveryChannel[] = [];
  if (categoryPrefs.in_app) channels.push("in_app");
  if (categoryPrefs.email) channels.push("email");
  if (categoryPrefs.push) channels.push("push");
  if (categoryPrefs.sms && (priority === "urgent" || priority === "high")) {
    channels.push("sms"); // SMS only for high/urgent
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

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
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

function deliverToChannel(notification: Notification, channel: DeliveryChannel): void {
  // In production, this would call actual delivery providers
  // For now, mark as sent immediately
  setTimeout(() => {
    notification.deliveryStatus[channel] = "sent";
  }, 100);
}

// ─── Clear Store (for testing) ───────────────────────────────────────────────

export function clearNotificationStore(): void {
  notificationStore.clear();
  preferencesStore.clear();
}
