// ─── Admin User Management Types ──────────────────────────────────────
// Platform user administration, role management, audit logging.

export type UserRole = "client" | "trainer" | "company_admin" | "super_admin";
export type UserStatus = "active" | "inactive" | "suspended" | "onboarding";
export type SubscriptionTier = "tier1" | "tier2" | "tier3";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";

// ─── Admin User View ────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  subscription: AdminUserSubscription | null;
  profile: AdminUserProfile | null;
}

export interface AdminUserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export interface AdminUserProfile {
  // Client fields
  goals?: string[];
  onboardingCompleted?: boolean;
  dateOfBirth?: string | null;
  // Coach fields
  specialties?: string[];
  capacity?: number;
  currentClients?: number;
  acceptingClients?: boolean;
  rating?: number;
  reviewCount?: number;
  monthlyRate?: number;
}

// ─── Audit Log ──────────────────────────────────────────────────────

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.role_changed"
  | "user.status_changed"
  | "user.suspended"
  | "user.reactivated"
  | "user.deleted"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "coach.assigned"
  | "coach.unassigned"
  | "admin.login"
  | "admin.setting_changed"
  | "system.maintenance";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetUserId: string | null;
  targetUserName: string | null;
  resourceType: string;
  resourceId: string;
  details: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Filters ────────────────────────────────────────────────────────

export interface UserListFilters {
  search: string;
  role: UserRole | "all";
  status: UserStatus | "all";
  tier: SubscriptionTier | "all";
  sortBy: "name" | "email" | "createdAt" | "lastLogin" | "status";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_USER_FILTERS: UserListFilters = {
  search: "",
  role: "all",
  status: "all",
  tier: "all",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 20,
};

// ─── User Actions ───────────────────────────────────────────────────

export interface UserAction {
  type: "suspend" | "reactivate" | "change_role" | "change_tier" | "reset_onboarding" | "delete";
  reason?: string;
  newRole?: UserRole;
  newTier?: SubscriptionTier;
}

// ─── Platform Stats ─────────────────────────────────────────────────

export interface PlatformUserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  onboardingUsers: number;
  clientCount: number;
  trainerCount: number;
  companyAdminCount: number;
  superAdminCount: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  churnRate: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  trainer: "Trainer",
  company_admin: "Company Admin",
  super_admin: "Super Admin",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  client: "rgb(59, 130, 246)",
  trainer: "rgb(var(--k-accent))",
  company_admin: "rgb(16, 185, 129)",
  super_admin: "rgb(239, 68, 68)",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  onboarding: "Onboarding",
};

export const STATUS_COLORS: Record<UserStatus, string> = {
  active: "rgb(34, 197, 94)",
  inactive: "rgb(107, 114, 128)",
  suspended: "rgb(239, 68, 68)",
  onboarding: "rgb(245, 158, 11)",
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  tier1: "Private ($499/mo)",
  tier2: "Associate ($249/mo)",
  tier3: "AI-Guided ($99/mo)",
};

export const TIER_SHORT_LABELS: Record<SubscriptionTier, string> = {
  tier1: "Private",
  tier2: "Associate",
  tier3: "AI-Guided",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.created": "User Created",
  "user.updated": "User Updated",
  "user.role_changed": "Role Changed",
  "user.status_changed": "Status Changed",
  "user.suspended": "User Suspended",
  "user.reactivated": "User Reactivated",
  "user.deleted": "User Deleted",
  "subscription.created": "Subscription Created",
  "subscription.updated": "Subscription Updated",
  "subscription.cancelled": "Subscription Cancelled",
  "coach.assigned": "Coach Assigned",
  "coach.unassigned": "Coach Unassigned",
  "admin.login": "Admin Login",
  "admin.setting_changed": "Setting Changed",
  "system.maintenance": "System Maintenance",
};

export function formatUserName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim() || "Unknown User";
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
