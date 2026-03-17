"use client";

import { useThemeColors } from "@/lib/theme";

interface GoalProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function GoalProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  sublabel,
}: GoalProgressRingProps) {
  const colors = useThemeColors();
  const defaultColor = `rgb(${colors.accent})`;
  const finalColor = color ?? defaultColor;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(55, 65, 81, 0.3)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={finalColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">
          {label ?? `${Math.round(percent)}%`}
        </span>
        {sublabel && (
          <span className="text-xs text-gray-500 mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
