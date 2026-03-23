"use client";

import { useState, useCallback, useMemo } from "react";
import type { AdminUser, UserListFilters } from "@/lib/admin/types";
import {
  DEFAULT_USER_FILTERS,
  ROLE_COLORS,
  STATUS_COLORS,
} from "@/lib/admin/types";
import {
  seedDemoUsers,
  listUsers,
  performUserAction,
  getAuditLogForUser,
  getPlatformUserStats,
} from "@/lib/admin/engine";
import { UserTable } from "@/components/admin/UserTable";
import { UserDetail } from "@/components/admin/UserDetail";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";

export default function AdminUsersPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_USER_FILTERS);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);

  if (!seeded) {
    seedDemoUsers();
    setSeeded(true);
  }

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Apply company filter to the user listing
  const effectiveFilters = useMemo(() => ({
    ...filters,
    companyId: selectedCompany === "all" ? "all" : selectedCompany,
  }), [filters, selectedCompany]);

  const result = listUsers(effectiveFilters);
  const stats = getPlatformUserStats(selectedCompany === "all" ? undefined : selectedCompany);

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
    try {
      const updated = performUserAction(
        selectedUser.id,
        {
          type: action as "suspend",
          reason: params?.reason,
          newRole: params?.newRole as "client" | undefined,
          newTier: params?.newTier as "tier1" | undefined,
        },
        "admin-1",
      );
      if (action !== "delete") {
        setSelectedUser(updated);
      } else {
        setSelectedUser(null);
      }
      refresh();
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  const userAuditLog = selectedUser ? getAuditLogForUser(selectedUser.id) : [];

  return (
    <div className="animate-fade-in" key={refreshKey}>
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
            {stats.totalUsers} users · {stats.trainerCount} trainers · {stats.clientCount} clients
          </span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-xl font-heading font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.active }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats.activeUsers}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS.client }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Clients</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats.clientCount}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS.trainer }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Trainers</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats.trainerCount}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            {company ? "Company Admins" : "New This Week"}
          </p>
          <p className="text-xl font-heading font-bold text-kairos-gold">
            {company ? stats.companyAdminCount : stats.newUsersThisWeek}
          </p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.suspended }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Suspended</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats.suspendedUsers}</p>
        </div>
      </div>

      {/* Selected User Detail */}
      {selectedUser && (
        <div className="mb-6">
          <UserDetail
            user={selectedUser}
            auditLog={userAuditLog}
            onAction={handleUserAction}
            onClose={() => setSelectedUser(null)}
          />
        </div>
      )}

      {/* User Table */}
      <UserTable
        users={result.users}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onUserClick={setSelectedUser}
        showCompany={selectedCompany === "all"}
      />
    </div>
  );
}
