"use client";

import { useThemeColors } from "@/lib/theme";

/**
 * Lightweight SVG sparkline chart.
 * No external dependencies — renders inline trend visualization.
 */

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
  className?: string;
}

export function SparkLine({
  data,
  width = 120,
  height = 32,
  strokeColor = "#D4AF37",
  fillColor,
  strokeWidth = 1.5,
  showDots = false,
  className = "",
}: SparkLineProps) {
  const tc = useThemeColors();
  const resolvedStroke = strokeColor === "#D4AF37" ? tc.accent : strokeColor;
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((value - min) / range) * chartHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const fillPath = fillColor
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : undefined;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {fillPath && (
        <path d={fillPath} fill={fillColor} opacity={0.15} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={resolvedStroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2}
          fill={resolvedStroke}
        />
      ))}
    </svg>
  );
}
