"use client";

/**
 * Platform health monitoring widget for admin dashboard.
 * Shows system status, API performance, and error rates.
 */

interface SystemStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  lastChecked: string;
}

interface PlatformHealthMonitorProps {
  systems: SystemStatus[];
  errorRate?: number;
  avgResponseMs?: number;
  uptime?: number;
}

const statusConfig = {
  healthy: { color: "bg-emerald-500", label: "Healthy", textColor: "text-emerald-400" },
  degraded: { color: "bg-amber-500", label: "Degraded", textColor: "text-amber-400" },
  down: { color: "bg-red-500", label: "Down", textColor: "text-red-400" },
};

export function PlatformHealthMonitor({
  systems,
  errorRate = 0.02,
  avgResponseMs = 145,
  uptime = 99.97,
}: PlatformHealthMonitorProps) {
  const healthyCount = systems.filter((s) => s.status === "healthy").length;
  const overallStatus = healthyCount === systems.length ? "healthy" : healthyCount > systems.length / 2 ? "degraded" : "down";

  return (
    <div className="kairos-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver">
          Platform Health
        </h3>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusConfig[overallStatus].color} animate-pulse`} />
          <span className={`text-xs font-medium ${statusConfig[overallStatus].textColor}`}>
            {statusConfig[overallStatus].label}
          </span>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Uptime</p>
          <p className="mt-1 font-heading text-lg font-bold text-emerald-400">
            {uptime}%
          </p>
        </div>
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Avg Response</p>
          <p className="mt-1 font-heading text-lg font-bold text-kairos-gold">
            {avgResponseMs}ms
          </p>
        </div>
        <div className="rounded-lg bg-kairos-royal-dark/50 p-3 text-center">
          <p className="kairos-label">Error Rate</p>
          <p className={`mt-1 font-heading text-lg font-bold ${
            errorRate < 0.01 ? "text-emerald-400" : errorRate < 0.05 ? "text-amber-400" : "text-red-400"
          }`}>
            {(errorRate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Service status list */}
      <div className="space-y-2">
        {systems.map((system) => {
          const config = statusConfig[system.status];
          return (
            <div
              key={system.service}
              className="flex items-center justify-between rounded-lg bg-kairos-royal-dark/30 px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <span className={`inline-block h-2 w-2 rounded-full ${config.color}`} />
                <span className="text-sm text-kairos-silver">{system.service}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {system.latencyMs !== undefined && (
                  <span className="text-kairos-silver-dark">
                    {system.latencyMs}ms
                  </span>
                )}
                <span className={`font-medium ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
