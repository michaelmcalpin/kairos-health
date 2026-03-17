"use client";

import { useThemeColors } from "@/lib/theme";

/**
 * Lightweight SVG bar chart.
 * Supports vertical bars with labels, values, and tooltips.
 */

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  barColor?: string;
  showValues?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function BarChart({
  data,
  width = 400,
  height = 200,
  barColor = "#D4AF37",
  showValues = true,
  showLabels = true,
  className = "",
}: BarChartProps) {
  const tc = useThemeColors();
  if (data.length === 0) return null;

  const padding = { top: 20, right: 10, bottom: showLabels ? 36 : 10, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(chartWidth / data.length * 0.7, 40);
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartHeight * (1 - pct)}
          stroke={tc.primary}
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight;
        const x = padding.left + barGap + i * (barWidth + barGap);
        const y = padding.top + chartHeight - barHeight;
        const color = d.color ?? barColor;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill={color}
              opacity={0.85}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>

            {showValues && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={10}
                fill={tc.text}
                fontFamily="Open Sans, sans-serif"
              >
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
              </text>
            )}

            {showLabels && (
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fontSize={9}
                fill={tc.textSecondary}
                fontFamily="Open Sans, sans-serif"
              >
                {d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
