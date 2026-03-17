"use client";

import { BarChart } from "@/components/charts";

/**
 * Daily engagement metrics chart showing check-in rates.
 */

interface DailyEngagement {
  date: string;
  uniqueUsers: number;
  rate: number;
}

interface EngagementMetricsProps {
  dailyCheckins: DailyEngagement[];
  totalActiveClients: number;
}

export function EngagementMetrics({ dailyCheckins, totalActiveClients }: EngagementMetricsProps) {
  // Summary stats
  const avgRate = dailyCheckins.length > 0
    ? Math.round(dailyCheckins.reduce((sum, d) => sum + d.rate, 0) / dailyCheckins.length)
    : 0;

  const maxRate = dailyCheckins.length > 0
    ? Math.max(...dailyCheckins.map((d) => d.rate))
    : 0;

  const recentDays = dailyCheckins.slice(-14);
  const barData = recentDays.map((d) => ({
    label: d.date.slice(5), // MM-DD
    value: d.rate,
    color: d.rate >= 60 ? "#10b981" : d.rate >= 40 ? "#D4AF37" : "#ef4444",  // colors passed to BarChart which handles theme
  }));

  return (
    <div className="kairos-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver">
          Engagement — Daily Check-In Rates
        </h3>
        <span className="text-xs text-kairos-silver-dark">
          {totalActiveClients} active clients
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Avg Rate</p>
          <p className="mt-1 font-heading text-xl font-bold text-kairos-gold">
            {avgRate}%
          </p>
        </div>
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Peak Rate</p>
          <p className="mt-1 font-heading text-xl font-bold text-emerald-400">
            {maxRate}%
          </p>
        </div>
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Days Tracked</p>
          <p className="mt-1 font-heading text-xl font-bold text-white">
            {dailyCheckins.length}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      {barData.length > 0 ? (
        <BarChart
          data={barData}
          width={480}
          height={160}
          showValues
          showLabels
          className="w-full"
        />
      ) : (
        <p className="text-sm text-kairos-silver-dark text-center py-8">
          No engagement data available yet.
        </p>
      )}
    </div>
  );
}
