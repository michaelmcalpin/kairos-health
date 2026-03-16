/**
 * KAIROS Notification System — Type Definitions
 *
 * Covers notification categories, channels, delivery status,
 * and user preference structures.
 */

// ─── Notification Categories ─────────────────────────────────────────────────

export type NotificationCategory =
  | "health_alert"      // Glucose spike, low HRV, etc.
  | "insight"           // AI-generated insight ready
  | "weekly_report"     // Weekly health report available
  | "coach_message"     // Message from assigned coach
  | "appointment"       // Appointment reminder
  | "lab_result"        // Lab results available
  | "supplement"        // Supplement reminder
  | "fasting"           // Fasting window reminder
  | "streak"            // Streak milestone
  | "billing"           // Subscription/payment event
  | "system"            // Platform announcements
  | "onboarding";       // Onboarding nudges

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type DeliveryChannel = "in_app" | "email" | "push" | "sms";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "failed" | "read";

// ─── Core Notification ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  channels: DeliveryChannel[];
  deliveryStatus: Record<DeliveryChannel, DeliveryStatus>;
  read: boolean;
  archived: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

// ─── Notification Templates ──────────────────────────────────────────────────

export interface NotificationTemplate {
  category: NotificationCategory;
  defaultPriority: NotificationPriority;
  defaultChannels: DeliveryChannel[];
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
  actionLabel?: string;
}

// ─── User Preferences ────────────────────────────────────────────────────────

export interface ChannelPreferences {
  in_app: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
  categories: Record<NotificationCategory, ChannelPreferences>;
}

export const DEFAULT_CHANNEL_PREFS: ChannelPreferences = {
  in_app: true,
  email: true,
  push: true,
  sms: false,
};

export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "userId"> = {
  enabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  categories: {
    health_alert: { in_app: true, email: true, push: true, sms: true },
    insight: { in_app: true, email: true, push: false, sms: false },
    weekly_report: { in_app: true, email: true, push: false, sms: false },
    coach_message: { in_app: true, email: true, push: true, sms: false },
    appointment: { in_app: true, email: true, push: true, sms: true },
    lab_result: { in_app: true, email: true, push: true, sms: false },
    supplement: { in_app: true, email: false, push: true, sms: false },
    fasting: { in_app: true, email: false, push: true, sms: false },
    streak: { in_app: true, email: false, push: true, sms: false },
    billing: { in_app: true, email: true, push: false, sms: false },
    system: { in_app: true, email: true, push: false, sms: false },
    onboarding: { in_app: true, email: true, push: false, sms: false },
  },
};

// ─── Delivery Event ──────────────────────────────────────────────────────────

export interface DeliveryEvent {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  timestamp: string;
  error?: string;
}

// ─── Dispatch Request ────────────────────────────────────────────────────────

export interface DispatchRequest {
  userId: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  channelOverride?: DeliveryChannel[];
}
