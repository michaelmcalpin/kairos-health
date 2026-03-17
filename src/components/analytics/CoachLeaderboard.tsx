"use client";

import type { CoachPerformanceSummary } from "@/lib/analytics/types";
import { useThemeColors } from "@/lib/theme";

interface CoachLeaderboardProps {
  data: CoachPerformanceSummary;
}

export function CoachLeaderboard({ data }: CoachLeaderboardProps) {
  const tc = useThemeColors();
  return (
    <div className="kairos-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-bold text-lg text-white">Top Performing Coaches</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-gray-500">Avg Utilization: </span>
            <span className="text-white font-bold">{data.avgUtilization}%</span>
          </div>
          <div>
            <span className="text-gray-500">Avg Retention: </span>
            <span className="text-white font-bold">{data.avgRetention}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.coaches.map((coach, idx) => (
          <div
            key={coach.coachId}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm" style={{ backgroundColor: `${tc.accent}33`, color: tc.accent }}>
                {idx + 1}
              </div>
              <div>
                <p className="text-sm text-white font-semibold">{coach.name}</p>
                <p className="text-xs text-gray-500">
                  {coach.activeClients}/{coach.capacity} clients
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[10px] text-gray-500">Health Score</p>
                <p className="text-sm font-heading font-bold" style={{ color: tc.accent }}>
                  {coach.avgClientHealthScore}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Retention</p>
                <p className="text-sm font-heading font-bold text-green-400">
                  {coach.clientRetention}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Rating</p>
                <p className="text-sm font-heading font-bold text-blue-400">
                  {coach.rating}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
