"use client";

import { useThemeColors } from "@/lib/theme";
import { SparkLine } from "@/components/charts";

/**
 * Admin dashboard KPI grid.
 * Shows key platform metrics with sparkline trends.
 */

export interface AdminKPI {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  sparkData?: number[];
  sparkColor?: string;
}

interface AdminKPIGridProps {
  kpis: AdminKPI[];
}

export function AdminKPIGrid({ kpis }: AdminKPIGridProps) {
  const tc = useThemeColors();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="kairos-card flex flex-col justify-between p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="kairos-label">{kpi.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-white">
                {kpi.value}
              </p>
            </div>
            {kpi.sparkData && kpi.sparkData.length >= 2 && (
              <SparkLine
                data={kpi.sparkData}
                width={64}
                height={28}
                strokeColor={kpi.sparkColor ?? tc.accent}
                fillColor={kpi.sparkColor ?? tc.accent}
              />
            )}
          </div>
          {kpi.change && (
            <p
              className={`mt-2 text-xs font-medium ${
                kpi.changeType === "positive"
                  ? "text-emerald-400"
                  : kpi.changeType === "negative"
                  ? "text-red-400"
                  : "text-kairos-silver-dark"
              }`}
            >
              {kpi.changeType === "positive" ? "↑" : kpi.changeType === "negative" ? "↓" : "→"}{" "}
              {kpi.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
