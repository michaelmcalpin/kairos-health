/**
 * Push notification registration and management for the Everist.ai mobile app.
 *
 * Wraps expo-notifications to handle permission requests, push token
 * retrieval, badge management, and foreground notification display.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register for push notifications and return the Expo push token */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === "web") {
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4A853",
    });
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.warn("Failed to get push token:", error);
    return null;
  }
}

export type MeetingReminder = {
  id: string;
  title: string;
  /** Client-local date "YYYY-MM-DD". */
  date: string;
  /** Start time "HH:MM" in the client's local timezone. */
  startTime: string;
  link?: string | null;
};

const MEETING_REMINDER_KIND = "meeting-reminder";
const REMINDER_LEAD_MS = 5 * 60 * 1000; // 5 minutes before

function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(Number.isNaN(m) ? 0 : m).padStart(2, "0")} ${period}`;
}

/**
 * Schedule a local "meeting in 5 minutes" notification for each of today's
 * coach meetings. Idempotent: clears previously-scheduled meeting reminders and
 * reschedules from the current list, skipping any whose fire time has passed.
 */
export async function scheduleMeetingReminders(meetings: MeetingReminder[]): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    // Clear our previously-scheduled meeting reminders (leave others alone).
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.content?.data as { kind?: string } | undefined)?.kind === MEETING_REMINDER_KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    const now = Date.now();
    for (const m of meetings) {
      if (!m.startTime) continue;
      // Local-time parse (no trailing Z) — device timezone matches the client's.
      const start = new Date(`${m.date}T${m.startTime}:00`);
      if (Number.isNaN(start.getTime())) continue;
      const fireAt = new Date(start.getTime() - REMINDER_LEAD_MS);
      if (fireAt.getTime() <= now + 1000) continue; // already passed

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Meeting in 5 minutes",
          body: `${m.title} at ${formatClock(m.startTime)}`,
          sound: true,
          data: { kind: MEETING_REMINDER_KIND, link: m.link ?? null },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
    }
  } catch (err) {
    console.warn("Failed to schedule meeting reminders:", err);
  }
}

/** Set the badge count */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/** Clear all delivered notifications */
export async function clearNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
