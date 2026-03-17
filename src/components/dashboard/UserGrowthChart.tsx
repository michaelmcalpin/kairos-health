"use client";

import { useThemeColors } from "@/lib/theme";
import { AreaChart } from "@/components/charts";

/**
 * User growth over time with cumulative and new user lines.
 */

interface UserGrowthData {
  month: string;
  newUsers: number;
  cumulativeUsers: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const tc = useThemeColors();
  if (data.length === 0) {
    return (
      <div className="kairos-card p-5">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-4">
          User Growth
        </h3>
        <p className="text-sm text-kairos-silver-dark">No data available yet.</p>
      </div>
    );
  }

  const cumulativePoints = data.map((d) => ({
    label: d.month.slice(5),  // "MM"
    value: d.cumulativeUsers,
  }));

  const newUserPoints = data.map((d) => ({
    label: d.month.slice(5),
    value: d.newUsers,
  }));

  return (
    <div className="kairos-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver">
          User Growth
        </h3>
        <div className="flex items-center gap-4 text-xs text-kairos-silver-dark">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded bg-kairos-gold" />
            Cumulative
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded bg-emerald-400" />
            New Users
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <AreaChart
          data={cumulativePoints}
          width={480}
          height={160}
          strokeColor={tc.accent}
          fillColor={tc.accent}
          showValues
          className="w-full"
        />
        <AreaChart
          data={newUserPoints}
          width={480}
          height={100}
          strokeColor="#34d399"
          fillColor="#34d399"
          showLabels
          className="w-full"
        />
      </div>
    </div>
  );
}
