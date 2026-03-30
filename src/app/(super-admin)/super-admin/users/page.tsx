"use client";

import { useState, useCallback, useMemo } from "react";
import type { AdminUser, UserListFilters, AuditLogEntry } from "@/lib/admin/types";
import {
  DEFAULT_USER_FILTERS,
  ROLE_COLORS,
  STATUS_COLORS,
} from "@/lib/admin/types";
import { UserTable } from "@/components/admin/UserTable";
import { UserDetail } from "@/components/admin/UserDetail";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { trpc } from "@/lib/trpc";

export default function AdminUsersPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_USER_FILTERS);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const utils = trpc.useUtils();

  // Build effective filters including company
  const effectiveFilters = useMemo(() => ({
    search: filters.search,
    role: filters.role,
    status: filters.status,
    tier: filters.tier,
    companyId: selectedCompany === "all" ? "all" : selectedCompany,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    pageSize: filters.pageSize,
  }), [filters, selectedCompany]);

  // Fetch users via tRPC
  const { data: result } = trpc.admin.users.list.useQuery(effectiveFilters, {
    staleTime: 15_000,
  });
  const { data: stats } = trpc.admin.users.getStats.useQuery(
    { companyId: selectedCompany === "all" ? undefined : selectedCompany },
    { staleTime: 30_000 }
  );

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

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    setFilters((prev) => ({ ...prev, page: 1 }));
    setSelectedUser(null);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">
            {company
              ? `${company.name} — Users and roles`
              : "Manage platform users, roles, subscriptions, and account status."}
          </p>
        </div>
        <CompanySelector value={selectedCompany} onChange={handleCompanyChange} />
      </div>

      {/* Company Badge */}
      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border mb-6"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
          <span className="text-xs text-kairos-silver-dark ml-auto">
            {statsData.totalUsers} users · {statsData.trainerCount} trainers · {statsData.clientCount} clients
          </span>
        </div>
      )}

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
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Trainers</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{statsData.trainerCount}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            {company ? "Company Admins" : "New This Week"}
          </p>
          <p className="text-xl font-heading font-bold text-kairos-gold">
            {company ? statsData.companyAdminCount : statsData.newUsersThisWeek}
          </p>
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
        showCompany={selectedCompany === "all"}
      />
    </div>
  );
}
