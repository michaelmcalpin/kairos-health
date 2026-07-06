"use client";

import { useState } from "react";
import type { NotificationPreferences, NotificationCategory, DeliveryChannel } from "@/lib/notifications/types";

interface NotificationPreferencesPanelProps {
  preferences: NotificationPreferences;
  onSave: (updates: Partial<NotificationPreferences>) => void;
}

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  health_alert: "Health Alerts",
  insight: "AI Insights",
  weekly_report: "Weekly Reports",
  coach_message: "Coach Messages",
  appointment: "Appointments",
  lab_result: "Lab Results",
  supplement: "Supplement Reminders",
  fasting: "Fasting Reminders",
  streak: "Streak Milestones",
  billing: "Billing & Payments",
  system: "System Updates",
  onboarding: "Onboarding Tips",
};

const CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  in_app: "In-App",
  email: "Email",
  push: "Push",
  sms: "SMS",
};

export function NotificationPreferencesPanel({
  preferences,
  onSave,
}: NotificationPreferencesPanelProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const toggleChannel = (category: NotificationCategory, channel: DeliveryChannel) => {
    setLocalPrefs((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          [channel]: !prev.categories[category][channel],
        },
      },
    }));
  };

  const handleSave = () => {
    onSave(localPrefs);
  };

  const categories = Object.entries(CATEGORY_LABELS) as [NotificationCategory, string][];

  return (
    <div className="space-y-6">
      {/* Global toggle */}
      <div className="kairos-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-white">
              Notifications
            </h3>
            <p className="text-xs text-kairos-silver-dark mt-0.5">
              Enable or disable all notifications
            </p>
          </div>
          <button
            onClick={() => setLocalPrefs((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localPrefs.enabled ? "bg-kairos-gold" : "bg-kairos-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                localPrefs.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="kairos-card p-5">
        <h3 className="font-heading text-sm font-semibold text-white mb-3">
          Quiet Hours
        </h3>
        <p className="text-xs text-kairos-silver-dark mb-3">
          Non-urgent notifications will be silenced during these hours.
        </p>
        <div className="flex items-center gap-3">
          <div>
            <label className="kairos-label mb-1 block">Start</label>
            <input
              type="time"
              value={localPrefs.quietHoursStart ?? "22:00"}
              onChange={(e) => setLocalPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
              className="kairos-input text-sm py-1.5 px-2.5 w-28"
            />
          </div>
          <span className="text-kairos-silver-dark mt-5">to</span>
          <div>
            <label className="kairos-label mb-1 block">End</label>
            <input
              type="time"
              value={localPrefs.quietHoursEnd ?? "07:00"}
              onChange={(e) => setLocalPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
              className="kairos-input text-sm py-1.5 px-2.5 w-28"
            />
          </div>
        </div>
      </div>

      {/* Category preferences */}
      <div className="kairos-card p-5">
        <h3 className="font-heading text-sm font-semibold text-white mb-4">
          Channel Preferences
        </h3>

        {/* Header row */}
        <div className="flex items-center gap-2 mb-3 px-2">
          <span className="flex-1 text-xs font-medium text-kairos-silver-dark">Category</span>
          {(Object.entries(CHANNEL_LABELS) as [DeliveryChannel, string][]).map(([channel, label]) => (
            <span key={channel} className="w-14 text-center text-[10px] font-medium text-kairos-silver-dark uppercase">
              {label}
            </span>
          ))}
        </div>

        {/* Category rows */}
        <div className="space-y-1">
          {categories.map(([category, label]) => (
            <div
              key={category}
              className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-kairos-royal-dark/30 transition-colors"
            >
              <span className="flex-1 text-sm text-kairos-silver">{label}</span>
              {(Object.keys(CHANNEL_LABELS) as DeliveryChannel[]).map((channel) => (
                <div key={channel} className="w-14 flex justify-center">
                  <button
                    onClick={() => toggleChannel(category, channel)}
                    className={`h-5 w-5 rounded border transition-colors ${
                      localPrefs.categories[category]?.[channel]
                        ? "bg-kairos-gold border-kairos-gold"
                        : "bg-transparent border-kairos-border hover:border-kairos-silver-dark"
                    }`}
                  >
                    {localPrefs.categories[category]?.[channel] && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="rgb(var(--k-bg))" className="h-5 w-5">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button onClick={handleSave} className="kairos-btn-gold w-full">
        Save Preferences
      </button>
    </div>
  );
}
