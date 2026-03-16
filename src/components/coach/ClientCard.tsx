"use client";

import type { CoachClientSummary } from "@/lib/coach-clients/types";
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
} from "@/lib/coach-clients/types";

interface ClientCardProps {
  client: CoachClientSummary;
  onClick?: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const trendIcon = client.scoreTrend === "up" ? "↑" : client.scoreTrend === "down" ? "↓" : "→";
  const trendColor = client.scoreTrend === "up" ? "text-green-400" : client.scoreTrend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div
      onClick={onClick}
      className="kairos-card hover:border-[#D4AF37]/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-heading font-bold text-sm shrink-0">
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
              <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[client.status]}`} />
              <span className="text-xs text-gray-500">{STATUS_LABELS[client.status]}</span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">{client.lastActive}</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Health Score */}
          <div className="text-center">
            <p className="text-lg font-heading font-bold text-[#D4AF37]">{client.healthScore}</p>
            <p className={`text-[10px] ${trendColor}`}>{trendIcon}</p>
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
          <span className="text-gray-600 group-hover:text-[#D4AF37] transition-colors">›</span>
        </div>
      </div>
    </div>
  );
}
