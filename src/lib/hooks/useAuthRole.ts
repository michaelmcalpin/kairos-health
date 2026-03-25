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
  /** Switch to a different portal (updates localStorage) */
  switchRole: (role: UserRole) => void;
  /** Clear the active role and redirect to select-role */
  clearRole: () => void;
}

/**
 * useAuthRole — server-validated role hook.
 *
 * Fetches the user's real role from the database via tRPC `auth.me`,
 * then syncs localStorage to stay consistent. This is the single
 * source of truth for role-based access on the client side.
 *
 * If localStorage contains a role that the DB role can't access
 * (e.g. someone manually set "super_admin" but they're a "client"),
 * it clears the invalid value.
 */
export function useAuthRole(): UseAuthRoleResult {
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);

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
      const saved = localStorage.getItem("kairos-role") as UserRole | null;
      setActiveRole(saved);
    }
  }, []);

  // When DB role arrives, validate localStorage
  useEffect(() => {
    if (isLoading || !dbRole) return;

    const saved = localStorage.getItem("kairos-role") as UserRole | null;

    if (saved && !canAccess(dbRole, saved)) {
      // localStorage contains an unauthorized role — clear it
      localStorage.removeItem("kairos-role");
      setActiveRole(null);
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
        localStorage.setItem("kairos-role", role);
        setActiveRole(role);
      }
    },
    [dbRole],
  );

  const clearRole = useCallback(() => {
    localStorage.removeItem("kairos-role");
    setActiveRole(null);
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
  };
}
