// ─── Admin User Management Engine ─────────────────────────────────────
// CRUD operations for platform users, audit logging, and stats.
// In-memory store for development.

import type {
  AdminUser,
  AuditAction,
  AuditLogEntry,
  PlatformUserStats,
  SubscriptionTier,
  UserAction,
  UserListFilters,
  UserRole,
  UserStatus,
} from "./types";
import { uid, formatUserName } from "./types";

// ─── In-Memory Store ──────────────────────────────────────────────────

const usersStore = new Map<string, AdminUser>();
const auditStore: AuditLogEntry[] = [];

// ─── User CRUD ────────────────────────────────────────────────────────

export function createUser(
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole = "client",
): AdminUser {
  // Check for duplicate email
  const existing = Array.from(usersStore.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) throw new Error("Email already in use");

  const now = new Date().toISOString();
  const user: AdminUser = {
    id: uid(),
    email,
    firstName,
    lastName,
    role,
    status: "onboarding",
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    subscription: role === "client" ? { tier: "tier3", status: "trialing", currentPeriodEnd: null, stripeCustomerId: null } : null,
    profile: role === "client"
      ? { goals: [], onboardingCompleted: false }
      : role === "coach"
        ? { specialties: [], capacity: 25, currentClients: 0, acceptingClients: true, rating: 0, reviewCount: 0, monthlyRate: 0 }
        : null,
  };

  usersStore.set(user.id, user);
  logAudit("system", "System", "user.created", user.id, formatUserName(user), "user", user.id, `Created ${role} account for ${email}`);
  return user;
}

export function getUser(userId: string): AdminUser | null {
  return usersStore.get(userId) ?? null;
}

export function updateUser(
  userId: string,
  updates: Partial<Pick<AdminUser, "firstName" | "lastName" | "email" | "avatarUrl">>,
): AdminUser {
  const user = usersStore.get(userId);
  if (!user) throw new Error("User not found");

  // Check email uniqueness if changing email
  if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
    const emailTaken = Array.from(usersStore.values()).find(
      (u) => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== userId
    );
    if (emailTaken) throw new Error("Email already in use");
  }

  const updated: AdminUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  usersStore.set(userId, updated);
  logAudit("system", "Admin", "user.updated", userId, formatUserName(updated), "user", userId, `Updated user profile`);
  return updated;
}

export function deleteUser(userId: string, actorId: string): void {
  const user = usersStore.get(userId);
  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot delete admin users");

  logAudit(actorId, "Admin", "user.deleted", userId, formatUserName(user), "user", userId, `Deleted ${user.role} account: ${user.email}`);
  usersStore.delete(userId);
}

// ─── User Actions ─────────────────────────────────────────────────────

export function performUserAction(
  userId: string,
  action: UserAction,
  actorId: string,
): AdminUser {
  const user = usersStore.get(userId);
  if (!user) throw new Error("User not found");

  const updated = { ...user, updatedAt: new Date().toISOString() };

  switch (action.type) {
    case "suspend": {
      if (user.status === "suspended") throw new Error("User is already suspended");
      if (user.role === "admin") throw new Error("Cannot suspend admin users");
      updated.status = "suspended";
      logAudit(actorId, "Admin", "user.suspended", userId, formatUserName(user), "user", userId,
        `Suspended: ${action.reason ?? "No reason provided"}`);
      break;
    }
    case "reactivate": {
      if (user.status !== "suspended" && user.status !== "inactive") {
        throw new Error("User is not suspended or inactive");
      }
      updated.status = "active";
      logAudit(actorId, "Admin", "user.reactivated", userId, formatUserName(user), "user", userId, "Account reactivated");
      break;
    }
    case "change_role": {
      if (!action.newRole) throw new Error("New role is required");
      if (action.newRole === user.role) throw new Error("User already has this role");
      const oldRole = user.role;
      updated.role = action.newRole;
      // Reset profile for new role
      if (action.newRole === "coach") {
        updated.profile = { specialties: [], capacity: 25, currentClients: 0, acceptingClients: true, rating: 0, reviewCount: 0, monthlyRate: 0 };
      } else if (action.newRole === "client") {
        updated.profile = { goals: [], onboardingCompleted: false };
        updated.subscription = { tier: "tier3", status: "trialing", currentPeriodEnd: null, stripeCustomerId: null };
      }
      logAudit(actorId, "Admin", "user.role_changed", userId, formatUserName(user), "user", userId,
        `Role changed from ${oldRole} to ${action.newRole}`);
      break;
    }
    case "change_tier": {
      if (!action.newTier) throw new Error("New tier is required");
      if (user.role !== "client") throw new Error("Only clients have tiers");
      const oldTier = updated.subscription?.tier ?? "none";
      if (updated.subscription) {
        updated.subscription = { ...updated.subscription, tier: action.newTier };
      } else {
        updated.subscription = { tier: action.newTier, status: "active", currentPeriodEnd: null, stripeCustomerId: null };
      }
      logAudit(actorId, "Admin", "subscription.updated", userId, formatUserName(user), "subscription", userId,
        `Tier changed from ${oldTier} to ${action.newTier}`);
      break;
    }
    case "reset_onboarding": {
      if (user.role !== "client") throw new Error("Only clients have onboarding");
      updated.status = "onboarding";
      if (updated.profile) {
        updated.profile = { ...updated.profile, onboardingCompleted: false };
      }
      logAudit(actorId, "Admin", "user.status_changed", userId, formatUserName(user), "user", userId, "Onboarding reset");
      break;
    }
    case "delete": {
      deleteUser(userId, actorId);
      return user; // Return the deleted user data
    }
  }

  usersStore.set(userId, updated);
  return updated;
}

// ─── User Listing & Search ──────────────────────────────────────────

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function listUsers(filters: Partial<UserListFilters> = {}): PaginatedUsers {
  const { search = "", role = "all", status = "all", tier = "all", sortBy = "createdAt", sortOrder = "desc", page = 1, pageSize = 20 } = filters;

  let all = Array.from(usersStore.values());

  // Apply filters
  if (search) {
    const q = search.toLowerCase();
    all = all.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)
    );
  }
  if (role !== "all") all = all.filter((u) => u.role === role);
  if (status !== "all") all = all.filter((u) => u.status === status);
  if (tier !== "all") all = all.filter((u) => u.subscription?.tier === tier);

  // Sort
  all.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = formatUserName(a).localeCompare(formatUserName(b));
        break;
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "createdAt":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "lastLogin":
        cmp = (a.lastLoginAt ?? "").localeCompare(b.lastLoginAt ?? "");
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const users = all.slice(start, start + pageSize);

  return { users, total, page, pageSize, totalPages };
}

// ─── Audit Log ──────────────────────────────────────────────────────

export function logAudit(
  actorId: string,
  actorName: string,
  action: AuditAction,
  targetUserId: string | null,
  targetUserName: string | null,
  resourceType: string,
  resourceId: string,
  details: string,
  metadata: Record<string, unknown> = {},
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: uid(),
    actorId,
    actorName,
    action,
    targetUserId,
    targetUserName,
    resourceType,
    resourceId,
    details,
    metadata,
    ipAddress: null,
    createdAt: new Date().toISOString(),
  };
  auditStore.unshift(entry); // Most recent first
  // Keep last 1000 entries
  if (auditStore.length > 1000) auditStore.length = 1000;
  return entry;
}

export function getAuditLog(
  limit: number = 50,
  offset: number = 0,
  filters?: { action?: AuditAction; userId?: string },
): AuditLogEntry[] {
  let entries = [...auditStore];

  if (filters?.action) {
    entries = entries.filter((e) => e.action === filters.action);
  }
  if (filters?.userId) {
    entries = entries.filter(
      (e) => e.actorId === filters.userId || e.targetUserId === filters.userId
    );
  }

  return entries.slice(offset, offset + limit);
}

export function getAuditLogForUser(userId: string, limit: number = 20): AuditLogEntry[] {
  return auditStore
    .filter((e) => e.targetUserId === userId || e.actorId === userId)
    .slice(0, limit);
}

// ─── Platform Stats ─────────────────────────────────────────────────

export function getPlatformUserStats(): PlatformUserStats {
  const users = Array.from(usersStore.values());
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);

  const clients = users.filter((u) => u.role === "client");
  const cancelledThisMonth = auditStore.filter(
    (e) => e.action === "subscription.cancelled" && new Date(e.createdAt) > monthAgo
  ).length;

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    suspendedUsers: users.filter((u) => u.status === "suspended").length,
    onboardingUsers: users.filter((u) => u.status === "onboarding").length,
    clientCount: clients.length,
    coachCount: users.filter((u) => u.role === "coach").length,
    adminCount: users.filter((u) => u.role === "admin").length,
    tier1Count: clients.filter((u) => u.subscription?.tier === "tier1").length,
    tier2Count: clients.filter((u) => u.subscription?.tier === "tier2").length,
    tier3Count: clients.filter((u) => u.subscription?.tier === "tier3").length,
    newUsersThisWeek: users.filter((u) => new Date(u.createdAt) > weekAgo).length,
    newUsersThisMonth: users.filter((u) => new Date(u.createdAt) > monthAgo).length,
    churnRate: clients.length > 0 ? Math.round((cancelledThisMonth / clients.length) * 100) : 0,
  };
}

// ─── Seed Demo Data ──────────────────────────────────────────────────

export function seedDemoUsers(): void {
  if (usersStore.size > 0) return;

  const demoUsers: Array<{ email: string; first: string; last: string; role: UserRole; status: UserStatus; tier?: SubscriptionTier }> = [
    { email: "admin@kairos.health", first: "Platform", last: "Admin", role: "admin", status: "active" },
    { email: "sarah.mitchell@kairos.health", first: "Sarah", last: "Mitchell", role: "coach", status: "active" },
    { email: "james.chen@kairos.health", first: "James", last: "Chen", role: "coach", status: "active" },
    { email: "alex.thompson@gmail.com", first: "Alex", last: "Thompson", role: "client", status: "active", tier: "tier1" },
    { email: "jordan.chen@gmail.com", first: "Jordan", last: "Chen", role: "client", status: "active", tier: "tier1" },
    { email: "maria.santos@gmail.com", first: "Maria", last: "Santos", role: "client", status: "active", tier: "tier2" },
    { email: "emily.brooks@gmail.com", first: "Emily", last: "Brooks", role: "client", status: "active", tier: "tier2" },
    { email: "david.park@gmail.com", first: "David", last: "Park", role: "client", status: "active", tier: "tier3" },
    { email: "rachel.kim@gmail.com", first: "Rachel", last: "Kim", role: "client", status: "onboarding", tier: "tier3" },
    { email: "michael.lee@gmail.com", first: "Michael", last: "Lee", role: "client", status: "suspended", tier: "tier2" },
    { email: "lisa.wang@gmail.com", first: "Lisa", last: "Wang", role: "client", status: "active", tier: "tier3" },
    { email: "robert.jones@gmail.com", first: "Robert", last: "Jones", role: "client", status: "inactive", tier: "tier3" },
  ];

  for (const u of demoUsers) {
    const user = createUser(u.email, u.first, u.last, u.role);
    if (u.status !== "onboarding") {
      usersStore.set(user.id, { ...user, status: u.status });
    }
    if (u.tier && user.subscription) {
      usersStore.set(user.id, {
        ...usersStore.get(user.id)!,
        subscription: { ...user.subscription!, tier: u.tier, status: u.status === "active" ? "active" : "trialing" },
        lastLoginAt: u.status === "active" ? new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() : null,
      });
    }
    if (u.role === "coach") {
      usersStore.set(user.id, {
        ...usersStore.get(user.id)!,
        profile: {
          specialties: ["Glucose Optimization", "Sleep Science"],
          capacity: 25,
          currentClients: Math.floor(Math.random() * 15) + 5,
          acceptingClients: true,
          rating: 4.5 + Math.random() * 0.5,
          reviewCount: Math.floor(Math.random() * 30) + 10,
          monthlyRate: u.first === "Sarah" ? 499 : 249,
        },
      });
    }
  }
}

// ─── Store Reset (for testing) ────────────────────────────────────────

export function resetAdminStore(): void {
  usersStore.clear();
  auditStore.length = 0;
}
