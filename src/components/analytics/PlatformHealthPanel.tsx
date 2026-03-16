"use client";

import type { PlatformHealth } from "@/lib/analytics/types";
import { HEALTH_STATUS_COLORS } from "@/lib/analytics/types";

interface PlatformHealthPanelProps {
  data: PlatformHealth;
}

export function PlatformHealthPanel({ data }: PlatformHealthPanelProps) {
  const metrics = [data.uptime, data.responseTime, data.errorRate, data.activeConnections];

  return (
    <div className="kairos-card p-6">
      <h3 className="font-heading font-bold text-lg text-white mb-6">Platform Health</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const color = HEALTH_STATUS_COLORS[metric.status];
          return (
            <div
              key={metric.name}
              className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30"
            >
              <p className="text-xs text-gray-500 mb-2">{metric.name}</p>
              <p className="text-lg font-heading font-bold mb-2" style={{ color }}>
                {metric.value}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs capitalize" style={{ color }}>
                  {metric.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex gap-3 ${
                alert.severity === "critical"
                  ? "bg-red-500/10 border-red-500/20"
                  : alert.severity === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-blue-500/10 border-blue-500/20"
              }`}
            >
              <span className="text-sm">
                {alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵"}
              </span>
              <p className="text-xs text-gray-400">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
