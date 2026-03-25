/**
 * Notification Service Tests
 *
 * These tests previously validated the in-memory notification engine.
 * The service now uses real DB queries via Drizzle ORM.
 *
 * TODO: Convert to integration tests once a test DB harness is available.
 * Tests should run against a test PostgreSQL database with proper
 * transaction rollbacks between tests.
 */

import { describe, it, expect } from "vitest";

describe("notification service (DB-backed)", () => {
  it("module exports all expected functions", async () => {
    const mod = await import("../service");
    expect(typeof mod.dispatchNotification).toBe("function");
    expect(typeof mod.dispatchFromTemplate).toBe("function");
    expect(typeof mod.getUserNotifications).toBe("function");
    expect(typeof mod.getUnreadCount).toBe("function");
    expect(typeof mod.markAsRead).toBe("function");
    expect(typeof mod.markAllAsRead).toBe("function");
    expect(typeof mod.archiveNotification).toBe("function");
    expect(typeof mod.getUserPreferences).toBe("function");
    expect(typeof mod.updateUserPreferences).toBe("function");
  });

  it("templates module is intact", async () => {
    const { NOTIFICATION_TEMPLATES, interpolateTemplate } = await import("../templates");
    expect(Object.keys(NOTIFICATION_TEMPLATES).length).toBeGreaterThan(10);
    expect(interpolateTemplate("Hello {{name}}", { name: "World" })).toBe("Hello World");
  });

  it("types module exports defaults", async () => {
    const { DEFAULT_PREFERENCES, DEFAULT_CHANNEL_PREFS } = await import("../types");
    expect(DEFAULT_PREFERENCES.enabled).toBe(true);
    expect(DEFAULT_CHANNEL_PREFS.in_app).toBe(true);
    expect(DEFAULT_PREFERENCES.categories.health_alert.push).toBe(true);
  });
});
