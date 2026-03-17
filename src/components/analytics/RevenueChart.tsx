"use client";

import type { RevenueSummary } from "@/lib/analytics/types";
import { TIER_LABELS, formatCurrency, getShortMonthLabel } from "@/lib/analytics/types";
import { useThemeColors } from "@/lib/theme";

interface RevenueChartProps {
  data: RevenueSummary;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const tc = useThemeColors();
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxRevenue = Math.max(...data.dataPoints.map((d) => d.totalRevenue), 1);
  const barSpacing = innerWidth / data.dataPoints.length;
  const barWidth = Math.min(40, barSpacing * 0.7);

  const tierColors = { tier1: tc.accent, tier2: "#3b82f6", tier3: "#a855f7" };

  return (
    <div className="kairos-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-bold text-lg text-white">Revenue by Tier</h3>
        <div className="flex gap-4">
          {data.revenueByTier.map((tier) => (
            <div key={tier.tier} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: tierColors[tier.tier as keyof typeof tierColors] }}
              />
              <span className="text-gray-400">{TIER_LABELS[tier.tier]} ({tier.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full">
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = padding.top + (i * innerHeight) / 4;
          const value = Math.round(((4 - i) * maxRevenue) / 4);
          return (
            <g key={`grid-${i}`}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke={tc.primaryLight} strokeDasharray="4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[9px]" fill={tc.textSecondary}>
                ${Math.round(value / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {data.dataPoints.map((d, i) => {
          const x = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
          const tier3Height = maxRevenue > 0 ? (d.tier3Revenue / maxRevenue) * innerHeight : 0;
          const tier2Height = maxRevenue > 0 ? (d.tier2Revenue / maxRevenue) * innerHeight : 0;
          const tier1Height = maxRevenue > 0 ? (d.tier1Revenue / maxRevenue) * innerHeight : 0;

          const tier3Y = padding.top + innerHeight - tier3Height;
          const tier2Y = tier3Y - tier2Height;
          const tier1Y = tier2Y - tier1Height;

          return (
            <g key={`stack-${i}`}>
              <rect x={x} y={tier3Y} width={barWidth} height={tier3Height} fill={tierColors.tier3} rx="0" />
              <rect x={x} y={tier2Y} width={barWidth} height={tier2Height} fill={tierColors.tier2} rx="0" />
              <rect x={x} y={tier1Y} width={barWidth} height={tier1Height} fill={tierColors.tier1} rx="4" ry="4" />
              {/* Total label */}
              <text
                x={x + barWidth / 2}
                y={tier1Y - 6}
                textAnchor="middle"
                className="text-[9px] font-bold"
                fill={tc.accent}
              >
                ${Math.round(d.totalRevenue / 1000)}k
              </text>
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + innerHeight + 20}
                textAnchor="middle"
                className="text-[10px]"
                fill={tc.textSecondary}
              >
                {getShortMonthLabel(d.date)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={chartWidth - padding.right}
          y2={padding.top + innerHeight}
          stroke={tc.primaryLight}
          strokeWidth="1"
        />
      </svg>

      {/* Revenue summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">MRR</p>
          <p className="text-lg font-heading font-bold" style={{ color: tc.accent }}>{formatCurrency(data.mrr)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">ARR</p>
          <p className="text-lg font-heading font-bold text-white">{formatCurrency(data.arr)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">ARPU</p>
          <p className="text-lg font-heading font-bold text-white">{formatCurrency(data.avgRevenuePerUser)}</p>
        </div>
      </div>
    </div>
  );
}
