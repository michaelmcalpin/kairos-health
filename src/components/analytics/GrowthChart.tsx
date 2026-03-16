"use client";

import type { GrowthDataPoint } from "@/lib/analytics/types";
import { getShortMonthLabel } from "@/lib/analytics/types";

interface GrowthChartProps {
  data: GrowthDataPoint[];
  title?: string;
}

export function GrowthChart({ data, title = "User Growth" }: GrowthChartProps) {
  if (data.length === 0) return null;

  const maxUsers = Math.max(...data.map((d) => d.cumulativeUsers));
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const barWidth = Math.min(50, (innerWidth / data.length) * 0.7);
  const barSpacing = innerWidth / data.length;

  return (
    <div className="kairos-card p-6">
      <h3 className="font-heading font-bold text-lg text-white mb-6">{title}</h3>
      <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full">
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = padding.top + (i * innerHeight) / 4;
          const value = Math.round(((4 - i) * maxUsers) / 4);
          return (
            <g key={`grid-${i}`}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#2a3a6d" strokeDasharray="4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#8892b0">{value}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = maxUsers > 0 ? (d.cumulativeUsers / maxUsers) * innerHeight : 0;
          const x = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;

          return (
            <g key={`bar-${i}`}>
              {/* New users portion */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#D4AF37"
                rx="4"
                opacity={0.8}
              />
              {/* New users highlight at top */}
              {d.newUsers > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.min(barHeight, (d.newUsers / maxUsers) * innerHeight)}
                  fill="#D4AF37"
                  rx="4"
                />
              )}
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="text-[10px] font-bold"
                fill="#D4AF37"
              >
                {d.cumulativeUsers}
              </text>
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + innerHeight + 20}
                textAnchor="middle"
                className="text-[10px]"
                fill="#8892b0"
              >
                {getShortMonthLabel(d.date)}
              </text>
              {/* New users count */}
              <text
                x={x + barWidth / 2}
                y={padding.top + innerHeight + 34}
                textAnchor="middle"
                className="text-[9px]"
                fill="#5a6a9f"
              >
                +{d.newUsers}
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
          stroke="#2a3a6d"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
