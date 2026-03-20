import { describe, it, expect, beforeEach } from "vitest";
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  performUserAction,
  listUsers,
  logAudit,
  getAuditLog,
  getAuditLogForUser,
  getPlatformUserStats,
  seedDemoUsers,
  resetAdminStore,
} from "../engine";

beforeEach(() => {
  resetAdminStore();
});

// ─── User CRUD ────────────────────────────────────────────────────────

describe("createUser", () => {
  it("creates a client user with defaults", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    expect(user.id).toBeTruthy();
    expect(user.email).toBe("alice@test.com");
    expect(user.role).toBe("client");
    expect(user.status).toBe("onboarding");
    expect(user.subscription).not.toBeNull();
    expect(user.subscription!.tier).toBe("tier3");
    expect(user.subscription!.status).toBe("trialing");
  });

  it("creates a coach user with coach profile", () => {
    const user = createUser("coach@test.com", "Coach", "Smith", "trainer");
    expect(user.role).toBe("trainer");
    expect(user.profile).not.toBeNull();
    expect(user.profile!.capacity).toBe(25);
    expect(user.subscription).toBeNull();
  });

  it("creates an admin user", () => {
    const user = createUser("admin@test.com", "Admin", "User", "super_admin");
    expect(user.role).toBe("super_admin");
    expect(user.profile).toBeNull();
  });

  it("throws on duplicate email", () => {
    createUser("alice@test.com", "Alice", "Smith");
    expect(() => createUser("alice@test.com", "Bob", "Jones")).toThrow("Email already in use");
  });

  it("generates audit log entry on creation", () => {
    createUser("alice@test.com", "Alice", "Smith");
    const log = getAuditLog(1);
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("user.created");
  });
});

describe("getUser", () => {
  it("returns user by id", () => {
    const created = createUser("alice@test.com", "Alice", "Smith");
    const found = getUser(created.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe("alice@test.com");
  });

  it("returns null for unknown id", () => {
    expect(getUser("nonexistent")).toBeNull();
  });
});

describe("updateUser", () => {
  it("updates user fields", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    const updated = updateUser(user.id, { firstName: "Alicia", email: "alicia@test.com" });
    expect(updated.firstName).toBe("Alicia");
    expect(updated.email).toBe("alicia@test.com");
  });

  it("throws on email conflict", () => {
    createUser("alice@test.com", "Alice", "Smith");
    const bob = createUser("bob@test.com", "Bob", "Jones");
    expect(() => updateUser(bob.id, { email: "alice@test.com" })).toThrow("Email already in use");
  });

  it("throws for unknown user", () => {
    expect(() => updateUser("fake", { firstName: "Test" })).toThrow("User not found");
  });
});

describe("deleteUser", () => {
  it("deletes a user", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    deleteUser(user.id, "admin-1");
    expect(getUser(user.id)).toBeNull();
  });

  it("throws when deleting admin", () => {
    const admin = createUser("admin@test.com", "Admin", "User", "super_admin");
    expect(() => deleteUser(admin.id, "other-admin")).toThrow("Cannot delete super admin users");
  });

  it("logs audit entry on deletion", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    deleteUser(user.id, "admin-1");
    const log = getAuditLog(5);
    const deleteEntry = log.find((e) => e.action === "user.deleted");
    expect(deleteEntry).toBeTruthy();
  });
});

// ─── User Actions ─────────────────────────────────────────────────────

describe("performUserAction", () => {
  it("suspends a user", () => {
    const user = createUser("alice@test.com", "Alice", "Smith", "trainer");
    const suspended = performUserAction(user.id, { type: "suspend", reason: "Violation" }, "admin");
    expect(suspended.status).toBe("suspended");
  });

  it("throws when suspending already suspended user", () => {
    const user = createUser("alice@test.com", "Alice", "Smith", "trainer");
    performUserAction(user.id, { type: "suspend" }, "admin");
    expect(() => performUserAction(user.id, { type: "suspend" }, "admin")).toThrow("already suspended");
  });

  it("throws when suspending admin", () => {
    const admin = createUser("admin@test.com", "Admin", "User", "super_admin");
    expect(() => performUserAction(admin.id, { type: "suspend" }, "other")).toThrow("Cannot suspend super admin");
  });

  it("reactivates a suspended user", () => {
    const user = createUser("alice@test.com", "Alice", "Smith", "trainer");
    performUserAction(user.id, { type: "suspend" }, "admin");
    const reactivated = performUserAction(user.id, { type: "reactivate" }, "admin");
    expect(reactivated.status).toBe("active");
  });

  it("changes user role", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    const updated = performUserAction(user.id, { type: "change_role", newRole: "trainer" }, "admin");
    expect(updated.role).toBe("trainer");
    expect(updated.profile).not.toBeNull();
    expect(updated.profile!.capacity).toBe(25);
  });

  it("throws when changing to same role", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    expect(() => performUserAction(user.id, { type: "change_role", newRole: "client" }, "admin")).toThrow("already has this role");
  });

  it("changes subscription tier", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    const updated = performUserAction(user.id, { type: "change_tier", newTier: "tier1" }, "admin");
    expect(updated.subscription!.tier).toBe("tier1");
  });

  it("throws when changing tier for non-client", () => {
    const coach = createUser("coach@test.com", "Coach", "Smith", "trainer");
    expect(() => performUserAction(coach.id, { type: "change_tier", newTier: "tier1" }, "admin")).toThrow("Only clients have tiers");
  });

  it("resets onboarding", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    const updated = performUserAction(user.id, { type: "reset_onboarding" }, "admin");
    expect(updated.status).toBe("onboarding");
    expect(updated.profile!.onboardingCompleted).toBe(false);
  });
});

// ─── User Listing ───────────────────────────────────────────────────

describe("listUsers", () => {
  beforeEach(() => {
    createUser("alice@test.com", "Alice", "Smith");
    createUser("bob@test.com", "Bob", "Jones", "trainer");
    createUser("carol@test.com", "Carol", "Davis");
  });

  it("lists all users", () => {
    const result = listUsers();
    expect(result.total).toBe(3);
    expect(result.users).toHaveLength(3);
  });

  it("filters by role", () => {
    const result = listUsers({ role: "trainer" });
    expect(result.total).toBe(1);
    expect(result.users[0].role).toBe("trainer");
  });

  it("searches by name", () => {
    const result = listUsers({ search: "alice" });
    expect(result.total).toBe(1);
  });

  it("searches by email", () => {
    const result = listUsers({ search: "bob@test" });
    expect(result.total).toBe(1);
  });

  it("paginates results", () => {
    const page1 = listUsers({ pageSize: 2, page: 1 });
    expect(page1.users).toHaveLength(2);
    expect(page1.totalPages).toBe(2);

    const page2 = listUsers({ pageSize: 2, page: 2 });
    expect(page2.users).toHaveLength(1);
  });

  it("sorts by name ascending", () => {
    const result = listUsers({ sortBy: "name", sortOrder: "asc" });
    expect(result.users[0].firstName).toBe("Alice");
  });
});

// ─── Audit Log ──────────────────────────────────────────────────────

describe("audit log", () => {
  it("logs entries", () => {
    logAudit("admin-1", "Admin", "admin.login", null, null, "session", "s1", "Admin logged in");
    const log = getAuditLog(10);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].action).toBe("admin.login");
  });

  it("filters by action", () => {
    logAudit("admin-1", "Admin", "admin.login", null, null, "session", "s1", "Login");
    logAudit("admin-1", "Admin", "admin.setting_changed", null, null, "setting", "s1", "Changed");

    const loginOnly = getAuditLog(10, 0, { action: "admin.login" });
    expect(loginOnly.every((e) => e.action === "admin.login")).toBe(true);
  });

  it("filters by user", () => {
    const user = createUser("alice@test.com", "Alice", "Smith");
    const log = getAuditLogForUser(user.id);
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((e) => e.targetUserId === user.id || e.actorId === user.id)).toBe(true);
  });
});

// ─── Platform Stats ─────────────────────────────────────────────────

describe("getPlatformUserStats", () => {
  it("returns correct stats", () => {
    createUser("alice@test.com", "Alice", "Smith");
    createUser("bob@test.com", "Bob", "Jones", "trainer");
    createUser("carol@test.com", "Carol", "Davis", "super_admin");

    const stats = getPlatformUserStats();
    expect(stats.totalUsers).toBe(3);
    expect(stats.clientCount).toBe(1);
    expect(stats.trainerCount).toBe(1);
    expect(stats.superAdminCount).toBe(1);
    expect(stats.newUsersThisWeek).toBe(3);
    expect(stats.newUsersThisMonth).toBe(3);
  });

  it("counts tiers correctly", () => {
    const u1 = createUser("a@test.com", "A", "A");
    performUserAction(u1.id, { type: "change_tier", newTier: "tier1" }, "admin");
    const u2 = createUser("b@test.com", "B", "B");
    performUserAction(u2.id, { type: "change_tier", newTier: "tier2" }, "admin");
    createUser("c@test.com", "C", "C"); // default tier3

    const stats = getPlatformUserStats();
    expect(stats.tier1Count).toBe(1);
    expect(stats.tier2Count).toBe(1);
    expect(stats.tier3Count).toBe(1);
  });

  it("returns zero stats when empty", () => {
    const stats = getPlatformUserStats();
    expect(stats.totalUsers).toBe(0);
    expect(stats.churnRate).toBe(0);
  });
});

// ─── Seed Demo ──────────────────────────────────────────────────────

describe("seedDemoUsers", () => {
  it("creates demo users", () => {
    seedDemoUsers();
    const result = listUsers();
    expect(result.total).toBe(12);
  });

  it("does not duplicate on second call", () => {
    seedDemoUsers();
    seedDemoUsers();
    const result = listUsers();
    expect(result.total).toBe(12);
  });
});
