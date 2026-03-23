/**
 * KAIROS Notification Templates
 *
 * Pre-defined templates for each notification category
 * with default priority, channels, and content patterns.
 */

import type { NotificationTemplate } from "./types";

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // ─── Health Alerts ─────────────────────────────────────────────────────
  glucose_high: {
    category: "health_alert",
    defaultPriority: "high",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "High Glucose Alert",
    bodyTemplate: "Your glucose reached {{value}} mg/dL — above your {{threshold}} mg/dL target. Consider a post-meal walk.",
    actionUrlTemplate: "/glucose",
    actionLabel: "View Glucose",
  },
  glucose_low: {
    category: "health_alert",
    defaultPriority: "urgent",
    defaultChannels: ["in_app", "push", "sms"],
    titleTemplate: "Low Glucose Warning",
    bodyTemplate: "Your glucose dropped to {{value}} mg/dL. Please address this immediately.",
    actionUrlTemplate: "/glucose",
    actionLabel: "View Glucose",
  },
  hrv_drop: {
    category: "health_alert",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "HRV Below Baseline",
    bodyTemplate: "Your HRV of {{value}}ms is {{percent}}% below your 7-day average. Consider prioritizing recovery today.",
    actionUrlTemplate: "/measurements",
    actionLabel: "View HRV",
  },

  // ─── Insights ──────────────────────────────────────────────────────────
  insight_ready: {
    category: "insight",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "New Health Insight",
    bodyTemplate: "{{category}}: {{title}}",
    actionUrlTemplate: "/insights",
    actionLabel: "View Insight",
  },

  // ─── Weekly Report ─────────────────────────────────────────────────────
  weekly_report_ready: {
    category: "weekly_report",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "Your Weekly Health Report",
    bodyTemplate: "Your health score this week: {{score}}/100 ({{change}} from last week). {{wins}} wins identified.",
    actionUrlTemplate: "/insights?tab=report",
    actionLabel: "View Report",
  },

  // ─── Trainer Messages ──────────────────────────────────────────────────
  coach_message: {
    category: "coach_message",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "push", "email"],
    titleTemplate: "Message from {{trainerName}}",
    bodyTemplate: "{{preview}}",
    actionUrlTemplate: "/messages",
    actionLabel: "Read Message",
  },
  coach_note: {
    category: "coach_message",
    defaultPriority: "low",
    defaultChannels: ["in_app"],
    titleTemplate: "Trainer Note Added",
    bodyTemplate: "{{trainerName}} added a note about your {{topic}}.",
    actionUrlTemplate: "/messages",
    actionLabel: "View Note",
  },

  // ─── Appointments ──────────────────────────────────────────────────────
  appointment_reminder_24h: {
    category: "appointment",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email", "push"],
    titleTemplate: "Appointment Tomorrow",
    bodyTemplate: "Reminder: You have a {{type}} appointment with {{trainerName}} tomorrow at {{time}}.",
    actionUrlTemplate: "/appointments",
    actionLabel: "View Details",
  },
  appointment_reminder_1h: {
    category: "appointment",
    defaultPriority: "high",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "Appointment in 1 Hour",
    bodyTemplate: "Your {{type}} with {{trainerName}} starts at {{time}}.",
    actionUrlTemplate: "/appointments",
    actionLabel: "Join",
  },

  // ─── Lab Results ───────────────────────────────────────────────────────
  lab_results_ready: {
    category: "lab_result",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email", "push"],
    titleTemplate: "Lab Results Available",
    bodyTemplate: "Results for your {{panelName}} panel are ready. {{flagCount}} biomarkers flagged.",
    actionUrlTemplate: "/labs",
    actionLabel: "View Results",
  },

  // ─── Supplement Reminders ──────────────────────────────────────────────
  supplement_morning: {
    category: "supplement",
    defaultPriority: "low",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "Morning Supplements",
    bodyTemplate: "Time to take your morning supplements: {{items}}",
    actionUrlTemplate: "/supplements",
    actionLabel: "Log Taken",
  },
  supplement_evening: {
    category: "supplement",
    defaultPriority: "low",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "Evening Supplements",
    bodyTemplate: "Time for your evening supplements: {{items}}",
    actionUrlTemplate: "/supplements",
    actionLabel: "Log Taken",
  },

  // ─── Fasting ───────────────────────────────────────────────────────────
  fasting_start: {
    category: "fasting",
    defaultPriority: "low",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "Fasting Window Started",
    bodyTemplate: "Your {{hours}}-hour fasting window has begun. Target end: {{endTime}}.",
    actionUrlTemplate: "/fasting",
    actionLabel: "View Timer",
  },
  fasting_complete: {
    category: "fasting",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "Fasting Window Complete!",
    bodyTemplate: "You completed {{hours}} hours of fasting. Great work!",
    actionUrlTemplate: "/fasting",
    actionLabel: "Log Fast",
  },

  // ─── Streaks ───────────────────────────────────────────────────────────
  streak_milestone: {
    category: "streak",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "push"],
    titleTemplate: "{{days}}-Day Streak!",
    bodyTemplate: "You've checked in for {{days}} consecutive days. Keep the momentum going!",
    actionUrlTemplate: "/",
    actionLabel: "Dashboard",
  },

  // ─── Billing ───────────────────────────────────────────────────────────
  payment_success: {
    category: "billing",
    defaultPriority: "low",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "Payment Processed",
    bodyTemplate: "Your {{amount}} payment for the {{tier}} plan has been processed successfully.",
    actionUrlTemplate: "/payments",
    actionLabel: "View Receipt",
  },
  payment_failed: {
    category: "billing",
    defaultPriority: "high",
    defaultChannels: ["in_app", "email", "push"],
    titleTemplate: "Payment Failed",
    bodyTemplate: "We couldn't process your payment. Please update your payment method to avoid service interruption.",
    actionUrlTemplate: "/payments",
    actionLabel: "Update Payment",
  },
  trial_ending: {
    category: "billing",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "Trial Ending Soon",
    bodyTemplate: "Your free trial ends in {{days}} days. Subscribe now to keep your health data and insights.",
    actionUrlTemplate: "/payments",
    actionLabel: "Subscribe",
  },

  // ─── System ────────────────────────────────────────────────────────────
  system_announcement: {
    category: "system",
    defaultPriority: "low",
    defaultChannels: ["in_app"],
    titleTemplate: "KAIROS Update",
    bodyTemplate: "{{message}}",
  },

  // ─── Onboarding ────────────────────────────────────────────────────────
  onboarding_welcome: {
    category: "onboarding",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "Welcome to KAIROS",
    bodyTemplate: "Your health optimization journey begins now. Let's set up your profile and connect your first device.",
    actionUrlTemplate: "/onboarding",
    actionLabel: "Get Started",
  },
  onboarding_connect_device: {
    category: "onboarding",
    defaultPriority: "normal",
    defaultChannels: ["in_app", "email"],
    titleTemplate: "Connect Your First Device",
    bodyTemplate: "Connect a wearable device to start receiving personalized health insights.",
    actionUrlTemplate: "/settings?tab=devices",
    actionLabel: "Connect Device",
  },
};

// ─── Template Interpolation ──────────────────────────────────────────────────

export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return result;
}
