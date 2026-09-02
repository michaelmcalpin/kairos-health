"use client";

import React from "react";
import type { CoachClientSummary, ClientStatus } from "@/lib/coach-clients/types";
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
} from "@/lib/coach-clients/types";

interface ClientCardProps {
  client: CoachClientSummary;
  onClick?: () => void;
  /** Today's daily-task completion %, or null when nothing is scheduled today. */
  todayPct?: number | null;
}

/** Tailwind classes for the "Today" task-adherence pill, by completion band. */
function todayPctColor(pct: number): string {
  if (pct >= 80) return "bg-green-500/15 text-green-300 border-green-500/30";
  if (pct >= 50) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

export const ClientCard = React.memo(function ClientCard({ client, onClick, todayPct }: ClientCardProps) {
  const trendIcon = client.scoreTrend === "up" ? "↑" : client.scoreTrend === "down" ? "↓" : "→";
  const trendColor = client.scoreTrend === "up" ? "text-green-400" : client.scoreTrend === "down" ? "text-red-400" : "text-gray-400";
  const noData = client.healthScore === null || client.status === "insufficient_data";

  return (
    <div
      onClick={onClick}
      className="kairos-card hover:border-kairos-gold/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-kairos-gold/20 flex items-center justify-center text-kairos-gold font-heading font-bold text-sm shrink-0">
            {client.initials}
          </div>

          {/* Name & tier */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{client.name}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TIER_BADGE_COLORS[client.tier]}`}>
                {TIER_LABELS[client.tier]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {noData ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  <span className="text-xs text-gray-400">Insufficient data</span>
                </>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[client.status as ClientStatus]}`} />
                  <span className="text-xs text-gray-500">{STATUS_LABELS[client.status as ClientStatus]}</span>
                </>
              )}
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">{client.lastActive}</span>
              {typeof todayPct === "number" && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${todayPctColor(todayPct)}`}
                  title="Today's daily-task completion"
                >
                  Today {todayPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Health Score */}
          <div className="text-center">
            <p className="text-lg font-heading font-bold text-kairos-gold">{client.healthScore ?? "—"}</p>
            {noData ? (
              <p className="text-[10px] text-gray-500">No data</p>
            ) : (
              <p className={`text-[10px] ${trendColor}`}>{trendIcon}</p>
            )}
          </div>

          {/* Adherence */}
          <div className="text-center">
            <p className="text-sm font-heading font-bold text-white">{client.adherence}%</p>
            <p className="text-[10px] text-gray-500">Adherence</p>
          </div>

          {/* Alerts */}
          <div className="text-center">
            {client.activeAlerts > 0 ? (
              <p className="text-sm font-heading font-bold text-orange-400">{client.activeAlerts}</p>
            ) : (
              <p className="text-sm font-heading font-bold text-green-400">0</p>
            )}
            <p className="text-[10px] text-gray-500">Alerts</p>
          </div>

          {/* Next Session */}
          {client.nextSession && (
            <div className="text-right hidden lg:block">
              <p className="text-xs text-gray-400">{client.nextSession}</p>
            </div>
          )}

          {/* Chevron */}
          <span className="text-gray-600 group-hover:text-kairos-gold transition-colors">›</span>
        </div>
      </div>
    </div>
  );
});
