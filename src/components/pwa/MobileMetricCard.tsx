"use client";

/**
 * Compact metric card optimized for mobile grid layouts.
 * Displays a single health metric with trend indicator.
 */

interface MobileMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export function MobileMetricCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  accentColor = "text-kairos-gold",
}: MobileMetricCardProps) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor =
    trend === "up" ? "text-emerald-400" :
    trend === "down" ? "text-red-400" :
    "text-kairos-silver-dark";

  return (
    <div className="kairos-card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className={`${accentColor} opacity-60`}>{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-heading text-2xl font-bold ${accentColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-kairos-silver-dark">{unit}</span>
        )}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <span>{trendIcon}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
