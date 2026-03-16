"use client";

import { useState } from "react";
import type { AdminUser, AuditLogEntry, UserRole, SubscriptionTier } from "@/lib/admin/types";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  TIER_LABELS,
  AUDIT_ACTION_LABELS,
  formatUserName,
  getInitials,
  formatRelativeTime,
} from "@/lib/admin/types";

interface UserDetailProps {
  user: AdminUser;
  auditLog: AuditLogEntry[];
  onAction: (action: string, params?: Record<string, string>) => void;
  onClose: () => void;
}

export function UserDetail({ user, auditLog, onAction, onClose }: UserDetailProps) {
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [showTierChange, setShowTierChange] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);

  const isClient = user.role === "client";
  const isCoach = user.role === "coach";
  const isSuspended = user.status === "suspended";

  return (
    <div className="kairos-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#122055]/50 flex items-center justify-center text-[#D4AF37] text-lg font-bold">
            {getInitials(user.firstName, user.lastName)}
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white">{formatUserName(user)}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: `${ROLE_COLORS[user.role]}20`, color: ROLE_COLORS[user.role] }}
              >
                {ROLE_LABELS[user.role]}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[user.status] }} />
                <span className="text-xs text-gray-400">{STATUS_LABELS[user.status]}</span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/30 rounded-xl p-3">
          <span className="text-xs text-gray-500">Joined</span>
          <p className="text-sm text-white mt-0.5">{new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="bg-gray-800/30 rounded-xl p-3">
          <span className="text-xs text-gray-500">Last Login</span>
          <p className="text-sm text-white mt-0.5">{user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}</p>
        </div>
        {isClient && user.subscription && (
          <>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <span className="text-xs text-gray-500">Subscription</span>
              <p className="text-sm text-white mt-0.5">{TIER_LABELS[user.subscription.tier]}</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <span className="text-xs text-gray-500">Sub Status</span>
              <p className="text-sm text-white mt-0.5 capitalize">{user.subscription.status}</p>
            </div>
          </>
        )}
        {isCoach && user.profile && (
          <>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <span className="text-xs text-gray-500">Clients</span>
              <p className="text-sm text-white mt-0.5">{user.profile.currentClients} / {user.profile.capacity}</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <span className="text-xs text-gray-500">Rating</span>
              <p className="text-sm text-white mt-0.5">
                {user.profile.rating ? `${user.profile.rating.toFixed(1)} (${user.profile.reviewCount} reviews)` : "No ratings"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-white mb-2">Actions</h3>

        <div className="flex flex-wrap gap-2">
          {/* Suspend / Reactivate */}
          {!isSuspended && user.role !== "admin" && (
            <button
              onClick={() => setShowSuspend(true)}
              className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
            >
              Suspend User
            </button>
          )}
          {(isSuspended || user.status === "inactive") && (
            <button
              onClick={() => onAction("reactivate")}
              className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-colors"
            >
              Reactivate
            </button>
          )}

          {/* Change Role */}
          <button
            onClick={() => setShowRoleChange(!showRoleChange)}
            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-colors"
          >
            Change Role
          </button>

          {/* Change Tier (clients only) */}
          {isClient && (
            <button
              onClick={() => setShowTierChange(!showTierChange)}
              className="px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg text-xs hover:bg-[#D4AF37]/20 transition-colors"
            >
              Change Tier
            </button>
          )}

          {/* Reset Onboarding (clients only) */}
          {isClient && (
            <button
              onClick={() => onAction("reset_onboarding")}
              className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/20 transition-colors"
            >
              Reset Onboarding
            </button>
          )}
        </div>

        {/* Suspend reason form */}
        {showSuspend && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mt-2">
            <label className="text-xs text-red-300 block mb-1">Reason for suspension</label>
            <input
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onAction("suspend", { reason: suspendReason });
                  setShowSuspend(false);
                  setSuspendReason("");
                }}
                className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs"
              >
                Confirm Suspend
              </button>
              <button
                onClick={() => setShowSuspend(false)}
                className="px-3 py-1 text-gray-400 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Role change */}
        {showRoleChange && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-2 flex gap-2">
            {(["client", "coach", "admin"] as UserRole[])
              .filter((r) => r !== user.role)
              .map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onAction("change_role", { newRole: r });
                    setShowRoleChange(false);
                  }}
                  className="px-3 py-1 rounded text-xs"
                  style={{ backgroundColor: `${ROLE_COLORS[r]}20`, color: ROLE_COLORS[r] }}
                >
                  Make {ROLE_LABELS[r]}
                </button>
              ))}
          </div>
        )}

        {/* Tier change */}
        {showTierChange && (
          <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg p-3 mt-2 flex gap-2">
            {(["tier1", "tier2", "tier3"] as SubscriptionTier[])
              .filter((t) => t !== user.subscription?.tier)
              .map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onAction("change_tier", { newTier: t });
                    setShowTierChange(false);
                  }}
                  className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-xs hover:bg-[#D4AF37]/20"
                >
                  {TIER_LABELS[t]}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Audit History */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Activity History</h3>
        {auditLog.length === 0 ? (
          <p className="text-xs text-gray-500">No activity recorded.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-gray-800/50">
                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                    <circle cx="8" cy="8" r="3" fill="currentColor" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white">
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{entry.details}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    by {entry.actorName} — {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
