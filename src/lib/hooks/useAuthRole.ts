"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserRole } from "@/lib/company-ops/types";
import { trpc } from "@/lib/trpc";

/**
 * Role hierarchy — which portals can a given role access?
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  super_admin: ["super_admin", "company_admin", "trainer", "client"],
  company_admin: ["company_admin", "trainer", "client"],
  trainer: ["trainer", "client"],
  client: ["client"],
};

export function canAccess(currentRole: UserRole, targetPortal: UserRole): boolean {
  return (ROLE_HIERARCHY[currentRole] ?? []).includes(targetPortal);
}

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  company_admin: "/company/dashboard",
  trainer: "/trainer/dashboard",
  client: "/dashboard",
};

/**
 * Portal login URLs — for linking between portals
 */
export const PORTAL_LOGIN_URLS: Record<UserRole, string> = {
  client: "/sign-in",
  trainer: "/trainer/login",
  company_admin: "/company/login",
  super_admin: "/admin/login",
};

/**
 * Session isolation keys — each portal gets its own localStorage namespace.
 * This prevents session bleeding when a user (e.g. super_admin) switches
 * between acting as a trainer and accessing their own client account.
 *
 * When portal context changes, we invalidate portal-specific caches
 * so the UI doesn't show stale data from the previous portal context.
 */
const PORTAL_SESSION_KEY = "kairos-role";
const PORTAL_SWITCH_TS_KEY = "kairos-portal-switch-ts";

interface UseAuthRoleResult {
  /** The user's verified DB role, or null if not yet loaded */
  dbRole: UserRole | null;
  /** The currently-active portal role from localStorage */
  activeRole: UserRole | null;
  /** True while the DB role is being fetched */
  isLoading: boolean;
  /** True if the DB role query failed after all retries */
  isError: boolean;
  /** True once we have a confirmed DB role */
  isAuthenticated: boolean;
  /** Whether the active portal role is allowed by the DB role */
  isAuthorized: (targetPortal: UserRole) => boolean;
  /** Switch to a different portal (updates localStorage, invalidates caches) */
  switchRole: (role: UserRole) => void;
  /** Clear the active role and redirect to select-role */
  clearRole: () => void;
  /** Timestamp of last portal switch (for cache invalidation) */
  portalSwitchTs: number | null;
}

/**
 * useAuthRole — server-validated role hook with session isolation.
 *
 * Fetches the user's real role from the database via tRPC `auth.me`,
 * then syncs localStorage to stay consistent. This is the single
 * source of truth for role-based access on the client side.
 *
 * Session Isolation:
 * When a user switches portals (e.g. trainer → client), we:
 * 1. Update the active role in localStorage
 * 2. Record a switch timestamp for downstream cache invalidation
 * 3. tRPC queries that depend on portal context should refetch
 *
 * This ensures a super_admin viewing the trainer portal sees trainer
 * data, and switching to client portal shows their personal client data,
 * without any bleeding between the two contexts.
 */
export function useAuthRole(): UseAuthRoleResult {
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [portalSwitchTs, setPortalSwitchTs] = useState<number | null>(null);

  // Fetch verified role from DB
  const { data: me, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    retry: 2,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const dbRole: UserRole | null = (me?.role as UserRole) ?? null;

  // On mount, read localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PORTAL_SESSION_KEY) as UserRole | null;
      setActiveRole(saved);

      const ts = localStorage.getItem(PORTAL_SWITCH_TS_KEY);
      if (ts) setPortalSwitchTs(parseInt(ts, 10));
    }
  }, []);

  // When DB role arrives, validate localStorage
  useEffect(() => {
    if (isLoading || !dbRole) return;

    const saved = localStorage.getItem(PORTAL_SESSION_KEY) as UserRole | null;

    if (saved && !canAccess(dbRole, saved)) {
      // localStorage contains an unauthorized role — clear it
      localStorage.removeItem(PORTAL_SESSION_KEY);
      localStorage.removeItem(PORTAL_SWITCH_TS_KEY);
      setActiveRole(null);
      setPortalSwitchTs(null);
    }
  }, [dbRole, isLoading]);

  const isAuthorized = useCallback(
    (targetPortal: UserRole) => {
      if (!dbRole) return false;
      return canAccess(dbRole, targetPortal);
    },
    [dbRole],
  );

  const switchRole = useCallback(
    (role: UserRole) => {
      if (dbRole && canAccess(dbRole, role)) {
        const now = Date.now();
        localStorage.setItem(PORTAL_SESSION_KEY, role);
        localStorage.setItem(PORTAL_SWITCH_TS_KEY, now.toString());
        setActiveRole(role);
        setPortalSwitchTs(now);
      }
    },
    [dbRole],
  );

  const clearRole = useCallback(() => {
    localStorage.removeItem(PORTAL_SESSION_KEY);
    localStorage.removeItem(PORTAL_SWITCH_TS_KEY);
    setActiveRole(null);
    setPortalSwitchTs(null);
  }, []);

  return {
    dbRole,
    activeRole,
    isLoading,
    isError,
    isAuthenticated: !!dbRole,
    isAuthorized,
    switchRole,
    clearRole,
    portalSwitchTs,
  };
}
