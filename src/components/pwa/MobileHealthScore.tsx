"use client";

/**
 * Mobile-optimized circular health score display.
 * Renders an SVG ring gauge with animated score.
 */

interface MobileHealthScoreProps {
  score: number;
  label?: string;
  size?: number;
  change?: number;
}

export function MobileHealthScore({
  score,
  label = "Health Score",
  size = 160,
  change,
}: MobileHealthScoreProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score / 100, 0), 1);
  const offset = circumference * (1 - progress);

  const scoreColor =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#f59e0b" :
    "#ef4444";

  const bgStroke = "#1E2A5A";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgStroke}
            strokeWidth={12}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-heading text-4xl font-bold"
            style={{ color: scoreColor }}
          >
            {score}
          </span>
          <span className="text-xs text-kairos-silver-dark mt-0.5">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-kairos-silver">{label}</p>
      {change !== undefined && change !== 0 && (
        <p
          className={`text-xs font-medium mt-0.5 ${
            change > 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {change > 0 ? "↑" : "↓"} {Math.abs(change)} pts from last week
        </p>
      )}
    </div>
  );
}
