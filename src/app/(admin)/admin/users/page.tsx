"use client";

import { useState, useCallback } from "react";
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

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_USER_FILTERS);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);

  if (!seeded) {
    seedDemoUsers();
    setSeeded(true);
  }

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const result = listUsers(filters);
  const stats = getPlatformUserStats();

  const handleFiltersChange = (partial: Partial<UserListFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS.coach }} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Coaches</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats.coachCount}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">New This Week</p>
          <p className="text-xl font-heading font-bold text-kairos-gold">{stats.newUsersThisWeek}</p>
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
      />
    </div>
  );
}
