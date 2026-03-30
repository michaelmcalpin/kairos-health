"use client";

import { useState, useMemo } from "react";
import type { AdminUser, UserListFilters, AuditLogEntry } from "@/lib/admin/types";
import {
  DEFAULT_USER_FILTERS,
  ROLE_COLORS,
  STATUS_COLORS,
} from "@/lib/admin/types";
import { UserTable } from "@/components/admin/UserTable";
import { UserDetail } from "@/components/admin/UserDetail";
import { trpc } from "@/lib/trpc";

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_USER_FILTERS);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const utils = trpc.useUtils();

  // Build effective filters
  const effectiveFilters = useMemo(() => ({
    search: filters.search,
    role: filters.role,
    status: filters.status,
    tier: filters.tier,
    companyId: "all" as const,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    pageSize: filters.pageSize,
  }), [filters]);

  // Fetch users via tRPC
  const { data: result } = trpc.admin.users.list.useQuery(effectiveFilters, {
    staleTime: 15_000,
  });
  const { data: stats } = trpc.admin.users.getStats.useQuery(undefined, { staleTime: 30_000 });

  // Audit log for selected user
  const { data: userAuditLog = [] } = trpc.admin.users.getUserAuditLog.useQuery(
    { userId: selectedUser?.id ?? "" },
    { enabled: !!selectedUser, staleTime: 30_000 }
  );

  const actionMutation = trpc.admin.users.performAction.useMutation({
    onSuccess: (updated, variables) => {
      utils.admin.users.list.invalidate();
      utils.admin.users.getStats.invalidate();
      if (variables.action !== "delete") {
        setSelectedUser(updated as AdminUser);
      } else {
        setSelectedUser(null);
      }
    },
  });

  const handleFiltersChange = (partial: Partial<UserListFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleUserAction = (action: string, params?: Record<string, string>) => {
    if (!selectedUser) return;
    actionMutation.mutate({
      userId: selectedUser.id,
      action: action as "suspend",
      reason: params?.reason,
      newRole: params?.newRole as "client" | undefined,
      newTier: params?.newTier as "tier1" | undefined,
    });
  };

  const usersList = result?.users ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const currentPage = result?.page ?? 1;

  const statsData = stats ?? {
    totalUsers: 0, activeUsers: 0, suspendedUsers: 0, onboardingUsers: 0,
    clientCount: 0, trainerCount: 0, companyAdminCount: 0, superAdminCount: 0,
    tier1Count: 0, tier2Count: 0, tier3Count: 0,
    newUsersThisWeek: 0, newUsersThisMonth: 0, churnRate: 0,
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">User Management</h1>
        <p className="text-gray-400 mt-1">
          Manage platform users, roles, subscriptions, and account status.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-xl font-heading font-bold text-white">{statsData.totalUsers}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.active }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{statsData.activeUsers}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS.client }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Clients</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{statsData.clientCount}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS.trainer }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Coaches</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{statsData.trainerCount}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">New This Week</p>
          <p className="text-xl font-heading font-bold text-kairos-gold">{statsData.newUsersThisWeek}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.suspended }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Suspended</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{statsData.suspendedUsers}</p>
        </div>
      </div>

      {/* Selected User Detail */}
      {selectedUser && (
        <div className="mb-6">
          <UserDetail
            user={selectedUser}
            auditLog={userAuditLog as AuditLogEntry[]}
            onAction={handleUserAction}
            onClose={() => setSelectedUser(null)}
          />
        </div>
      )}

      {/* User Table */}
      <UserTable
        users={usersList as AdminUser[]}
        total={total}
        page={currentPage}
        totalPages={totalPages}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onUserClick={setSelectedUser}
      />
    </div>
  );
}
