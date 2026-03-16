"use client";

import { cn } from "@/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export function KPICard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  className,
  highlight = false,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "kairos-card flex flex-col gap-2",
        highlight && "border-kairos-gold/30 shadow-gold-glow",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="kairos-label">{label}</span>
        {icon && <span className="text-kairos-silver-dark">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="kairos-kpi">{value}</span>
        {unit && (
          <span className="text-xs font-body text-kairos-silver-dark">{unit}</span>
        )}
      </div>

      {trend && trendValue && (
        <div className="flex items-center gap-1">
          {trend === "up" && <TrendingUp size={12} className="text-green-400" />}
          {trend === "down" && <TrendingDown size={12} className="text-red-400" />}
          {trend === "flat" && <Minus size={12} className="text-kairos-silver-dark" />}
          <span
            className={cn(
              "text-xs font-body",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              trend === "flat" && "text-kairos-silver-dark"
            )}
          >
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
