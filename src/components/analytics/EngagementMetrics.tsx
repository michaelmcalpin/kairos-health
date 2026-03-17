"use client";

import type { EngagementSummary } from "@/lib/analytics/types";
import { useThemeColors } from "@/lib/theme";

interface EngagementMetricsProps {
  data: EngagementSummary;
}

export function EngagementMetrics({ data }: EngagementMetricsProps) {
  const tc = useThemeColors();
  // Show top 5 features by usage
  const topFeatures = data.featureUsage.slice(0, 5);

  return (
    <div className="kairos-card p-6">
      <h3 className="font-heading font-bold text-lg text-white mb-6">Engagement Metrics</h3>
      <div className="space-y-4">
        {topFeatures.map((feature) => (
          <div key={feature.feature}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">{feature.feature}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-heading font-bold">{Math.round(feature.usageRate)}%</span>
                {feature.trend === "up" && (
                  <span className="text-[10px] text-green-400">+{feature.changePercent.toFixed(1)}%</span>
                )}
                {feature.trend === "down" && (
                  <span className="text-[10px] text-red-400">{feature.changePercent.toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${Math.min(100, feature.usageRate)}%`,
                  backgroundColor: feature.usageRate >= 80 ? tc.accent : feature.usageRate >= 60 ? "#3b82f6" : "#6b7280",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg DAU</p>
          <p className="text-lg font-heading font-bold text-white">{data.avgDailyActiveUsers}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Session</p>
          <p className="text-lg font-heading font-bold text-white">{data.avgSessionDuration} min</p>
        </div>
      </div>
    </div>
  );
}
