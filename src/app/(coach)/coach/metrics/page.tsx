"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { getCoachMetrics } from "@/lib/coach-dashboard/engine";

const COACH_ID = "demo-coach";

const KPI_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  trending: <TrendingUp className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
  dollar: <DollarSign className="w-5 h-5" />,
};

export default function CoachMetricsPage() {
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");
  const { period, setPeriod, formattedRange, dateRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const data = useMemo(() => getCoachMetrics(COACH_ID, range), [range]);

  const maxRevenue = Math.max(...data.monthlyTrend.map((m) => m.revenue));
  const maxSessions = Math.max(...data.monthlyTrend.map((m) => m.sessions));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-1">Performance Metrics</h1>
          <p className="text-gray-400 text-sm">Track your coaching effectiveness and client progress</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("overview")}
            className={`px-3 py-1.5 rounded-kairos-sm text-xs font-medium transition-colors ${
              viewMode === "overview"
                ? "bg-kairos-gold text-kairos-dark font-semibold"
                : "kairos-btn-outline text-kairos-silver-dark hover:text-kairos-gold"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className={`px-3 py-1.5 rounded-kairos-sm text-xs font-medium transition-colors ${
              viewMode === "detailed"
                ? "bg-kairos-gold text-kairos-dark font-semibold"
                : "kairos-btn-outline text-kairos-silver-dark hover:text-kairos-gold"
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["month", "quarter", "year"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
        {data.kpis.map((kpi) => (
          <div key={kpi.label} className="kairos-card p-6 border border-kairos-border hover:border-kairos-gold transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="text-kairos-gold">{KPI_ICONS[kpi.icon] ?? <TrendingUp className="w-5 h-5" />}</div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                kpi.trend === "up" ? "text-green-400" : kpi.trend === "down" ? "text-red-400" : "text-gray-400"
              }`}>
                {kpi.trend === "up" ? <TrendingUp className="w-4 h-4" /> : kpi.trend === "down" ? <TrendingDown className="w-4 h-4" /> : null}
                {kpi.trendValue}
              </div>
            </div>
            <h3 className="kairos-label text-xs uppercase tracking-wider text-kairos-silver-dark mb-2">{kpi.label}</h3>
            <p className="text-2xl font-bold text-kairos-gold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {viewMode === "overview" ? (
        <div className="space-y-8">
          {/* Health Score Distribution */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-xl font-bold font-heading text-white">Client Health Score Distribution</h2>
            </div>
            <div className="space-y-4">
              {data.healthDistribution.map((item) => (
                <div key={item.range} className="flex items-center gap-4">
                  <div className="w-20 text-right">
                    <span className="kairos-label text-sm text-kairos-silver-dark">{item.range}</span>
                  </div>
                  <div className="flex-1">
                    <div className="relative h-8 bg-kairos-dark border border-kairos-border rounded-kairos-sm overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 flex items-center justify-end pr-3 transition-all duration-500"
                        style={{ width: `${Math.max(item.percentage * 2, item.count > 0 ? 8 : 0)}%` }}
                      >
                        {item.count > 0 && (
                          <span className="text-kairos-dark text-xs font-bold">{item.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-kairos-silver-dark text-sm">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-xl font-bold font-heading text-white">Monthly Trends (Last 6 Months)</h2>
            </div>

            <div className="space-y-8">
              {/* Revenue Chart */}
              <div>
                <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">Monthly Revenue</h3>
                <div className="flex items-end justify-between gap-2 h-48 px-2">
                  {data.monthlyTrend.map((d) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <svg width="100%" height="180" className="mb-2">
                        <rect
                          x="10%"
                          y={180 - (d.revenue / maxRevenue) * 180}
                          width="80%"
                          height={(d.revenue / maxRevenue) * 180}
                          fill="url(#goldGradient)"
                          rx="4"
                        />
                        <defs>
                          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(var(--k-accent))" />
                            <stop offset="100%" stopColor="rgb(var(--k-accent-deep))" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="text-xs text-kairos-silver-dark">{d.month}</span>
                      <span className="text-xs font-semibold text-kairos-gold">${(d.revenue / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sessions Chart */}
              <div>
                <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">Monthly Sessions</h3>
                <div className="flex items-end justify-between gap-2 h-48 px-2">
                  {data.monthlyTrend.map((d) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <svg width="100%" height="180" className="mb-2">
                        <rect
                          x="10%"
                          y={180 - (d.sessions / maxSessions) * 180}
                          width="80%"
                          height={(d.sessions / maxSessions) * 180}
                          fill="url(#silverGradient)"
                          rx="4"
                        />
                        <defs>
                          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(var(--k-text))" />
                            <stop offset="100%" stopColor="rgb(158, 158, 158)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="text-xs text-kairos-silver-dark">{d.month}</span>
                      <span className="text-xs font-semibold text-kairos-silver">{d.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Clients and At-Risk Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Clients */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-kairos-gold" />
                <h2 className="text-xl font-bold font-heading text-white">Top Performing Clients</h2>
              </div>
              <div className="space-y-3">
                {data.topClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm hover:border-kairos-gold transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{client.name}</p>
                      <p className="text-kairos-silver-dark text-xs">Updated {client.lastUpdate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-kairos-gold font-bold text-lg">{client.score}</p>
                        <p className="text-kairos-silver-dark text-xs">Score</p>
                      </div>
                      {client.trend === "up" && <TrendingUp className="w-5 h-5 text-green-400" />}
                      {client.trend === "down" && <TrendingDown className="w-5 h-5 text-red-400" />}
                      {client.trend === "stable" && <div className="w-5 h-5 text-kairos-silver-dark">→</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clients at Risk */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold font-heading text-white">Clients Needing Attention</h2>
              </div>
              <div className="space-y-3">
                {data.atRiskClients.length === 0 ? (
                  <p className="text-kairos-silver-dark text-sm text-center py-6">All clients are on track</p>
                ) : (
                  data.atRiskClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 bg-kairos-dark border border-red-900/50 rounded-kairos-sm hover:border-red-500 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{client.name}</p>
                        <p className="text-red-300 text-xs">{client.issue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-kairos-silver-dark text-xs font-semibold">{client.daysSinceContact}d</p>
                        <p className="text-kairos-silver-dark text-xs">since contact</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Protocol Effectiveness */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-xl font-bold font-heading text-white">Protocol Effectiveness Summary</h2>
            </div>
            <div className="space-y-6">
              {data.protocols.map((protocol) => (
                <div key={protocol.name} className="border-b border-kairos-border last:border-b-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-1">{protocol.name}</h3>
                      <p className="text-kairos-silver-dark text-xs">{protocol.clientCount} clients enrolled</p>
                    </div>
                    <span className="kairos-badge-gold px-3 py-1 rounded-kairos-sm text-kairos-dark text-xs font-semibold">
                      {protocol.outcomeScore}/10
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="kairos-label text-xs mb-2">Adherence Rate</p>
                      <div className="w-full h-2 bg-kairos-dark border border-kairos-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 transition-all"
                          style={{ width: `${protocol.adherenceRate}%` }}
                        />
                      </div>
                      <p className="text-kairos-gold text-sm font-semibold mt-1">{protocol.adherenceRate}%</p>
                    </div>
                    <div>
                      <p className="kairos-label text-xs mb-2">Outcome Score</p>
                      <div className="w-full h-2 bg-kairos-dark border border-kairos-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 transition-all"
                          style={{ width: `${(protocol.outcomeScore / 10) * 100}%` }}
                        />
                      </div>
                      <p className="text-kairos-gold text-sm font-semibold mt-1">{protocol.outcomeScore}/10</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Detailed View */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <h2 className="text-xl font-bold font-heading text-white mb-6">Detailed Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Client Segments */}
              <div>
                <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Client Segments</h3>
                <div className="space-y-3">
                  {[
                    { label: "Active Clients", val: data.clientSegments.active, color: "bg-kairos-gold", textColor: "text-kairos-gold" },
                    { label: "On-Track Clients", val: data.clientSegments.onTrack, color: "bg-kairos-gold", textColor: "text-kairos-gold" },
                    { label: "Needs Attention", val: data.clientSegments.needsAttention, color: "bg-red-400", textColor: "text-red-400" },
                    { label: "Inactive", val: data.clientSegments.inactive, color: "bg-kairos-silver-dark", textColor: "text-kairos-silver-dark" },
                  ].map((seg) => (
                    <div key={seg.label} className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-kairos-silver-dark text-sm">{seg.label}</span>
                        <span className={`${seg.textColor} font-bold`}>{seg.val}/{data.clientSegments.total}</span>
                      </div>
                      <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full ${seg.color}`}
                          style={{ width: `${data.clientSegments.total > 0 ? (seg.val / data.clientSegments.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Metrics */}
              <div>
                <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Revenue Metrics</h3>
                <div className="space-y-3">
                  {data.kpis
                    .filter((k) => k.icon === "dollar")
                    .map((kpi) => (
                      <div key={kpi.label} className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                        <p className="text-kairos-silver-dark text-xs mb-1">{kpi.label}</p>
                        <p className="text-kairos-gold font-bold text-2xl">{kpi.value}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Session Insights */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Session Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                <p className="text-kairos-silver-dark text-xs mb-2">Total Sessions (MTD)</p>
                <p className="text-kairos-gold font-bold text-xl">{data.sessionMetrics.totalSessions}</p>
              </div>
              <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                <p className="text-kairos-silver-dark text-xs mb-2">Avg Duration</p>
                <p className="text-kairos-gold font-bold text-xl">{data.sessionMetrics.avgDuration}m</p>
                <p className="text-kairos-silver-dark text-xs mt-1">per session</p>
              </div>
              <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                <p className="text-kairos-silver-dark text-xs mb-2">Completion Rate</p>
                <p className="text-kairos-gold font-bold text-xl">{data.sessionMetrics.completionRate}%</p>
              </div>
              <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                <p className="text-kairos-silver-dark text-xs mb-2">No-Show Rate</p>
                <p className="text-kairos-gold font-bold text-xl">{data.sessionMetrics.noShowRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
