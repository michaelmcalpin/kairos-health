import { describe, it, expect, beforeEach } from "vitest";
import {
  dispatchNotification,
  dispatchFromTemplate,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getUserPreferences,
  updateUserPreferences,
  clearNotificationStore,
} from "../service";

const TEST_USER = "user_test_123";

beforeEach(() => {
  clearNotificationStore();
});

describe("dispatchNotification", () => {
  it("creates and stores a notification", () => {
    const notification = dispatchNotification({
      userId: TEST_USER,
      category: "health_alert",
      title: "High Glucose",
      body: "Your glucose reached 180 mg/dL",
    });

    expect(notification.id).toBeTruthy();
    expect(notification.userId).toBe(TEST_USER);
    expect(notification.category).toBe("health_alert");
    expect(notification.title).toBe("High Glucose");
    expect(notification.read).toBe(false);
    expect(notification.archived).toBe(false);
    expect(notification.createdAt).toBeTruthy();
  });

  it("respects priority override", () => {
    const notification = dispatchNotification({
      userId: TEST_USER,
      category: "system",
      priority: "urgent",
      title: "Critical Update",
      body: "System maintenance",
    });

    expect(notification.priority).toBe("urgent");
  });

  it("includes channels based on user preferences", () => {
    const notification = dispatchNotification({
      userId: TEST_USER,
      category: "health_alert",
      title: "Alert",
      body: "Test",
    });

    expect(notification.channels).toContain("in_app");
    expect(notification.channels.length).toBeGreaterThan(0);
  });

  it("respects channel override", () => {
    const notification = dispatchNotification({
      userId: TEST_USER,
      category: "system",
      title: "Test",
      body: "Test",
      channelOverride: ["email"],
    });

    expect(notification.channels).toEqual(["email"]);
  });
});

describe("dispatchFromTemplate", () => {
  it("interpolates template variables", () => {
    const notification = dispatchFromTemplate(TEST_USER, "glucose_high", {
      value: 185,
      threshold: 140,
    });

    expect(notification.title).toBe("High Glucose Alert");
    expect(notification.body).toContain("185");
    expect(notification.body).toContain("140");
  });

  it("throws for unknown template", () => {
    expect(() => {
      dispatchFromTemplate(TEST_USER, "nonexistent_template", {});
    }).toThrow("not found");
  });

  it("sets action URL from template", () => {
    const notification = dispatchFromTemplate(TEST_USER, "weekly_report_ready", {
      score: 78,
      change: "+4",
      wins: 3,
    });

    expect(notification.actionUrl).toBe("/insights?tab=report");
    expect(notification.actionLabel).toBe("View Report");
  });
});

describe("getUserNotifications", () => {
  it("returns notifications newest first", () => {
    dispatchNotification({ userId: TEST_USER, category: "system", title: "First", body: "1" });
    dispatchNotification({ userId: TEST_USER, category: "system", title: "Second", body: "2" });

    const notifications = getUserNotifications(TEST_USER);
    expect(notifications).toHaveLength(2);
    expect(notifications[0].title).toBe("Second");
  });

  it("filters by unread only", () => {
    const n1 = dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });
    dispatchNotification({ userId: TEST_USER, category: "system", title: "B", body: "2" });

    markAsRead(TEST_USER, n1.id);

    const unread = getUserNotifications(TEST_USER, { unreadOnly: true });
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe("B");
  });

  it("filters by category", () => {
    dispatchNotification({ userId: TEST_USER, category: "health_alert", title: "Alert", body: "1" });
    dispatchNotification({ userId: TEST_USER, category: "billing", title: "Payment", body: "2" });

    const alerts = getUserNotifications(TEST_USER, { category: "health_alert" });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].category).toBe("health_alert");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      dispatchNotification({ userId: TEST_USER, category: "system", title: `N${i}`, body: `${i}` });
    }

    const limited = getUserNotifications(TEST_USER, { limit: 3 });
    expect(limited).toHaveLength(3);
  });
});

describe("getUnreadCount", () => {
  it("returns correct unread count", () => {
    dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });
    dispatchNotification({ userId: TEST_USER, category: "system", title: "B", body: "2" });
    dispatchNotification({ userId: TEST_USER, category: "system", title: "C", body: "3" });

    expect(getUnreadCount(TEST_USER)).toBe(3);

    const notifications = getUserNotifications(TEST_USER);
    markAsRead(TEST_USER, notifications[0].id);

    expect(getUnreadCount(TEST_USER)).toBe(2);
  });

  it("excludes archived from count", () => {
    const n = dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });
    archiveNotification(TEST_USER, n.id);

    expect(getUnreadCount(TEST_USER)).toBe(0);
  });
});

describe("markAsRead / markAllAsRead", () => {
  it("marks single notification as read", () => {
    const n = dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });

    expect(markAsRead(TEST_USER, n.id)).toBe(true);

    const updated = getUserNotifications(TEST_USER);
    expect(updated[0].read).toBe(true);
    expect(updated[0].readAt).toBeTruthy();
  });

  it("returns false for non-existent notification", () => {
    expect(markAsRead(TEST_USER, "fake_id")).toBe(false);
  });

  it("marks all as read", () => {
    dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });
    dispatchNotification({ userId: TEST_USER, category: "system", title: "B", body: "2" });

    const count = markAllAsRead(TEST_USER);
    expect(count).toBe(2);
    expect(getUnreadCount(TEST_USER)).toBe(0);
  });
});

describe("archiveNotification", () => {
  it("archives a notification", () => {
    const n = dispatchNotification({ userId: TEST_USER, category: "system", title: "A", body: "1" });

    expect(archiveNotification(TEST_USER, n.id)).toBe(true);

    const all = getUserNotifications(TEST_USER);
    expect(all[0].archived).toBe(true);
  });
});

describe("preferences", () => {
  it("returns default preferences for new user", () => {
    const prefs = getUserPreferences("new_user");
    expect(prefs.enabled).toBe(true);
    expect(prefs.quietHoursStart).toBe("22:00");
    expect(prefs.categories.health_alert.push).toBe(true);
    expect(prefs.categories.billing.sms).toBe(false);
  });

  it("updates preferences", () => {
    const updated = updateUserPreferences(TEST_USER, {
      enabled: false,
      quietHoursStart: "23:00",
    });

    expect(updated.enabled).toBe(false);
    expect(updated.quietHoursStart).toBe("23:00");

    // Verify persistence
    const fetched = getUserPreferences(TEST_USER);
    expect(fetched.enabled).toBe(false);
  });
});
