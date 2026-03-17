"use client";

import { useThemeColors } from "@/lib/theme";

/**
 * Lightweight SVG donut chart for percentage breakdowns.
 * Supports multiple segments with labels and center text.
 */

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChart({
  segments,
  size = 160,
  thickness = 24,
  centerLabel,
  centerValue,
  className = "",
}: DonutChartProps) {
  const tc = useThemeColors();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeOffset = 0;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={tc.primary}
          strokeWidth={thickness}
        />

        {/* Segments */}
        {segments.map((segment, i) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += segmentLength;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            >
              <title>{`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}</title>
            </circle>
          );
        })}

        {/* Center text */}
        {centerValue && (
          <>
            <text
              x={cx}
              y={centerLabel ? cy - 4 : cy + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.16}
              fontWeight="700"
              fill={tc.text}
              fontFamily="Montserrat, sans-serif"
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x={cx}
                y={cy + size * 0.1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.07}
                fill={tc.textSecondary}
                fontFamily="Open Sans, sans-serif"
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-kairos-silver-dark">{segment.label}</span>
            <span className="font-medium text-kairos-silver">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
