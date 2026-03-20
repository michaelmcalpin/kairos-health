"use client";

import type { AdminUser, UserListFilters, UserRole, UserStatus, SubscriptionTier } from "@/lib/admin/types";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  TIER_SHORT_LABELS,
  formatUserName,
  getInitials,
  formatRelativeTime,
} from "@/lib/admin/types";

interface UserTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  filters: UserListFilters;
  onFiltersChange: (filters: Partial<UserListFilters>) => void;
  onUserClick: (user: AdminUser) => void;
}

export function UserTable({
  users,
  total,
  page,
  totalPages,
  filters,
  onFiltersChange,
  onUserClick,
}: UserTableProps) {
  return (
    <div className="kairos-card overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>

        {/* Role filter */}
        <select
          value={filters.role}
          onChange={(e) => onFiltersChange({ role: e.target.value as UserRole | "all", page: 1 })}
          className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-kairos-gold/50"
        >
          <option value="all">All Roles</option>
          <option value="client">Clients</option>
          <option value="trainer">Trainers</option>
          <option value="company_admin">Company Admins</option>
          <option value="super_admin">Super Admins</option>
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ status: e.target.value as UserStatus | "all", page: 1 })}
          className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-kairos-gold/50"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Tier filter */}
        <select
          value={filters.tier}
          onChange={(e) => onFiltersChange({ tier: e.target.value as SubscriptionTier | "all", page: 1 })}
          className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-kairos-gold/50"
        >
          <option value="all">All Tiers</option>
          <option value="tier1">Private</option>
          <option value="tier2">Associate</option>
          <option value="tier3">AI-Guided</option>
        </select>

        <span className="text-xs text-gray-500">{total} users</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["User", "Role", "Status", "Tier", "Joined", "Last Login"].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No users found matching your filters.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => onUserClick(user)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-kairos-royal/50 flex items-center justify-center text-kairos-gold text-xs font-bold flex-shrink-0">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{formatUserName(user)}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: `${ROLE_COLORS[user.role]}20`, color: ROLE_COLORS[user.role] }}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[user.status] }}
                      />
                      <span className="text-xs text-gray-300">{STATUS_LABELS[user.status]}</span>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="px-4 py-3">
                    {user.subscription ? (
                      <span className="text-xs text-gray-300">{TIER_SHORT_LABELS[user.subscription.tier]}</span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{formatRelativeTime(user.createdAt)}</span>
                  </td>

                  {/* Last Login */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onFiltersChange({ page: Math.max(1, page - 1) })}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => onFiltersChange({ page: Math.min(totalPages, page + 1) })}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
