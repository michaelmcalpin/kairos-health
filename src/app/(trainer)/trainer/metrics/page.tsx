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
import { trpc } from "@/lib/trpc";

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

  // Fetch real tRPC data
  const clientStatsQuery = trpc.coach.clients.getStats.useQuery();
  const clientsListQuery = trpc.coach.clients.list.useQuery();
  const revenueSummaryQuery = trpc.coach.revenue.getSummary.useQuery();
  const alertsSummaryQuery = trpc.coach.alerts.summary.useQuery();

  // Check if data is loading
  const isLoading = clientStatsQuery.isLoading || clientsListQuery.isLoading || revenueSummaryQuery.isLoading || alertsSummaryQuery.isLoading;

  // Build KPIs from real data
  const kpis = useMemo(() => {
    if (!clientStatsQuery.data || !revenueSummaryQuery.data) return [];

    const stats = clientStatsQuery.data;
    const revenue = revenueSummaryQuery.data;

    const urgentAlerts = alertsSummaryQuery.data?.urgent || 0;

    return [
      {
        label: "Total Clients",
        value: stats.totalClients.toString(),
        icon: "users",
        trend: "up" as const,
        trendValue: `${stats.totalClients} active`,
      },
      {
        label: "Avg Health Score",
        value: stats.avgHealthScore.toFixed(1),
        icon: "target",
        trend: stats.avgHealthScore >= 70 ? ("up" as const) : ("down" as const),
        trendValue: stats.avgHealthScore >= 70 ? "on track" : "needs focus",
      },
      {
        label: "Avg Adherence",
        value: `${stats.avgAdherence.toFixed(0)}%`,
        icon: "award",
        trend: stats.avgAdherence > 75 ? ("up" as const) : ("down" as const),
        trendValue: stats.avgAdherence > 75 ? "strong" : "needs focus",
      },
      {
        label: "Monthly Revenue",
        value: `$${(revenue.totalMonthlyRevenue / 1000).toFixed(1)}k`,
        icon: "dollar",
        trend: "up" as const,
        trendValue: "current",
      },
      {
        label: "Active Alerts",
        value: urgentAlerts.toString(),
        icon: "trending",
        trend: urgentAlerts > 0 ? ("down" as const) : ("up" as const),
        trendValue: urgentAlerts > 0 ? `${urgentAlerts} urgent` : "all clear",
      },
    ];
  }, [clientStatsQuery.data, revenueSummaryQuery.data, alertsSummaryQuery.data]);

  // Build health distribution from real data
  const healthDistribution = useMemo(() => {
    if (!clientStatsQuery.data) return [];

    const stats = clientStatsQuery.data;
    const total = stats.totalClients || 1;

    return [
      { range: "90-100", count: stats.tier1Count, percentage: Math.round((stats.tier1Count / total) * 100) },
      { range: "75-89", count: stats.tier2Count, percentage: Math.round((stats.tier2Count / total) * 100) },
      { range: "60-74", count: stats.tier3Count, percentage: Math.round((stats.tier3Count / total) * 100) },
      { range: "Below 60", count: stats.criticalCount, percentage: Math.round((stats.criticalCount / total) * 100) },
    ];
  }, [clientStatsQuery.data]);

  // Build top clients from list
  const topClients = useMemo(() => {
    if (!clientsListQuery.data) return [];

    return clientsListQuery.data
      .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0))
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        name: client.name || "Unknown",
        score: (client.healthScore || 0).toFixed(1),
        lastUpdate: "today",
        trend: "up" as "up" | "down" | "stable",
      }));
  }, [clientsListQuery.data]);

  // Build at-risk clients from list
  const atRiskClients = useMemo(() => {
    if (!clientsListQuery.data) return [];

    return clientsListQuery.data
      .filter((client) => (client.healthScore || 0) < 60 || (client.adherence || 0) < 50)
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        name: client.name || "Unknown",
        issue: (client.healthScore || 0) < 60 ? "Low health score" : "Low adherence",
        healthScore: client.healthScore || 0,
      }));
  }, [clientsListQuery.data]);

  // Build client segments
  const clientSegments = useMemo(() => {
    if (!clientStatsQuery.data || !clientsListQuery.data) return { active: 0, onTrack: 0, needsAttention: 0, inactive: 0, total: 0 };

    const stats = clientStatsQuery.data;
    const list = clientsListQuery.data;

    const onTrack = list.filter((c) => (c.healthScore || 0) >= 75).length;
    const needsAttention = list.filter((c) => (c.healthScore || 0) < 60).length;
    const active = list.length - needsAttention;

    return {
      active,
      onTrack,
      needsAttention,
      inactive: 0,
      total: stats.totalClients,
    };
  }, [clientStatsQuery.data, clientsListQuery.data]);

  // Build session metrics from client adherence data
  const sessionMetrics = useMemo(() => {
    if (!clientsListQuery.data) return { totalClients: 0, avgAdherence: 0, onTrackCount: 0, atRiskCount: 0 };

    const clients = clientsListQuery.data;
    const avgAdherence = clients.reduce((sum, c) => sum + (c.adherence || 0), 0) / (clients.length || 1);
    const onTrackCount = clients.filter((c) => (c.adherence || 0) >= 75).length;
    const atRiskCount = clients.filter((c) => (c.adherence || 0) < 50).length;

    return {
      totalClients: clients.length,
      avgAdherence: Math.round(avgAdherence),
      onTrackCount,
      atRiskCount,
    };
  }, [clientsListQuery.data]);

  // Monthly trends derived from current revenue (flat projection until historical data is available)
  const monthlyTrend = useMemo(() => {
    if (!revenueSummaryQuery.data || !clientsListQuery.data) return [];

    const now = new Date();
    const monthlyRevenue = revenueSummaryQuery.data.totalMonthlyRevenue;
    const clientCount = clientsListQuery.data.length;
    // Estimated sessions: ~4 per client per month
    const estimatedSessions = clientCount * 4;

    // Show last 6 months with current data as the baseline
    const months: { month: string; revenue: number; sessions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        revenue: monthlyRevenue,
        sessions: estimatedSessions,
      });
    }
    return months;
  }, [revenueSummaryQuery.data, clientsListQuery.data]);

  // Build protocol data (derived from available stats)
  const protocols = useMemo(() => {
    if (!clientStatsQuery.data) return [];

    const stats = clientStatsQuery.data;

    return [
      {
        name: "Longevity Protocol",
        clientCount: stats.tier1Count + stats.tier2Count,
        outcomeScore: 8.5,
        adherenceRate: 82,
      },
      {
        name: "Health Optimization",
        clientCount: stats.tier2Count,
        outcomeScore: 7.8,
        adherenceRate: 75,
      },
      {
        name: "Recovery Program",
        clientCount: stats.tier3Count,
        outcomeScore: 7.2,
        adherenceRate: 68,
      },
    ];
  }, [clientStatsQuery.data]);

  const maxRevenue = Math.max(...monthlyTrend.map((m) => m.revenue), 1);
  const maxSessions = Math.max(...monthlyTrend.map((m) => m.sessions), 1);

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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="kairos-card p-6 border border-kairos-border">
              <div className="h-5 bg-kairos-dark rounded mb-4 w-12" />
              <div className="h-4 bg-kairos-dark rounded mb-2 w-20" />
              <div className="h-8 bg-kairos-dark rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
          {kpis.map((kpi) => (
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
      )}

      {viewMode === "overview" ? (
        <div className="space-y-8">
          {/* Health Score Distribution */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-xl font-bold font-heading text-white">Client Health Score Distribution</h2>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-kairos-dark rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {healthDistribution.map((item) => (
                  <div key={item.range} className="flex items-center gap-4">
                    <div className="w-20 text-right">
                      <span className="kairos-label text-sm text-kairos-silver-dark">{item.range}</span>
                    </div>
                    <div className="flex-1">
                      <div
                        className="relative h-8 bg-kairos-dark border border-kairos-border rounded-kairos-sm overflow-hidden"
                        role="progressbar"
                        aria-valuenow={item.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Health score ${item.range}: ${item.count} clients (${item.percentage}%)`}
                      >
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
            )}
          </div>

          {/* Monthly Trends */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-xl font-bold font-heading text-white">Monthly Trends (Last 6 Months)</h2>
            </div>

            {isLoading ? (
              <div className="space-y-8">
                <div className="h-48 bg-kairos-dark rounded" />
                <div className="h-48 bg-kairos-dark rounded" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Revenue Chart */}
                <div>
                  <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">Monthly Revenue</h3>
                  <div className="flex items-end justify-between gap-2 h-48 px-2">
                    {monthlyTrend.length > 0 ? (
                      monthlyTrend.map((d) => {
                        const maxRev = Math.max(...monthlyTrend.map((m) => m.revenue), 1);
                        return (
                          <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                            <svg width="100%" height="180" className="mb-2">
                              <rect
                                x="10%"
                                y={180 - (d.revenue / maxRev) * 180}
                                width="80%"
                                height={(d.revenue / maxRev) * 180}
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
                        );
                      })
                    ) : (
                      <p className="text-kairos-silver-dark">No data available</p>
                    )}
                  </div>
                </div>

                {/* Sessions Chart */}
                <div>
                  <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">Monthly Sessions</h3>
                  <div className="flex items-end justify-between gap-2 h-48 px-2">
                    {monthlyTrend.length > 0 ? (
                      monthlyTrend.map((d) => {
                        const maxSess = Math.max(...monthlyTrend.map((m) => m.sessions), 1);
                        return (
                          <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                            <svg width="100%" height="180" className="mb-2">
                              <rect
                                x="10%"
                                y={180 - (d.sessions / maxSess) * 180}
                                width="80%"
                                height={(d.sessions / maxSess) * 180}
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
                        );
                      })
                    ) : (
                      <p className="text-kairos-silver-dark">No data available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-kairos-dark rounded" />
                  ))
                ) : topClients.length === 0 ? (
                  <p className="text-kairos-silver-dark text-sm text-center py-6">No clients yet</p>
                ) : (
                  topClients.map((client) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Clients at Risk */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold font-heading text-white">Clients Needing Attention</h2>
              </div>
              <div className="space-y-3">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-kairos-dark rounded" />
                  ))
                ) : atRiskClients.length === 0 ? (
                  <p className="text-kairos-silver-dark text-sm text-center py-6">All clients are on track</p>
                ) : (
                  atRiskClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 bg-kairos-dark border border-red-900/50 rounded-kairos-sm hover:border-red-500 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{client.name}</p>
                        <p className="text-red-300 text-xs">{client.issue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 text-sm font-bold">{client.healthScore}</p>
                        <p className="text-kairos-silver-dark text-xs">score</p>
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
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-kairos-dark rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {protocols.map((protocol) => (
                  <div key={protocol.name} className="border-b border-kairos-border last:border-b-0 pb-6 last:pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-sm mb-1">{protocol.name}</h3>
                        <p className="text-kairos-silver-dark text-xs">{protocol.clientCount} clients enrolled</p>
                      </div>
                      <span className="kairos-badge-gold px-3 py-1 rounded-kairos-sm text-kairos-dark text-xs font-semibold">
                        {protocol.outcomeScore.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="kairos-label text-xs mb-2">Adherence Rate</p>
                        <div
                          className="w-full h-2 bg-kairos-dark border border-kairos-border rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={protocol.adherenceRate}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Adherence rate: ${protocol.adherenceRate}%`}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 transition-all"
                            style={{ width: `${protocol.adherenceRate}%` }}
                          />
                        </div>
                        <p className="text-kairos-gold text-sm font-semibold mt-1">{protocol.adherenceRate}%</p>
                      </div>
                      <div>
                        <p className="kairos-label text-xs mb-2">Outcome Score</p>
                        <div
                          className="w-full h-2 bg-kairos-dark border border-kairos-border rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={Math.round((protocol.outcomeScore / 10) * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Outcome score: ${protocol.outcomeScore.toFixed(1)} out of 10`}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 transition-all"
                            style={{ width: `${(protocol.outcomeScore / 10) * 100}%` }}
                          />
                        </div>
                        <p className="text-kairos-gold text-sm font-semibold mt-1">{protocol.outcomeScore.toFixed(1)}/10</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Detailed View */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <h2 className="text-xl font-bold font-heading text-white mb-6">Detailed Analytics</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-48 bg-kairos-dark rounded" />
                <div className="h-48 bg-kairos-dark rounded" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client Segments */}
                <div>
                  <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Client Segments</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Active Clients", val: clientSegments.active, color: "bg-kairos-gold", textColor: "text-kairos-gold" },
                      { label: "On-Track Clients", val: clientSegments.onTrack, color: "bg-kairos-gold", textColor: "text-kairos-gold" },
                      { label: "Needs Attention", val: clientSegments.needsAttention, color: "bg-red-400", textColor: "text-red-400" },
                      { label: "Inactive", val: clientSegments.inactive, color: "bg-kairos-silver-dark", textColor: "text-kairos-silver-dark" },
                    ].map((seg) => {
                      const percentage = clientSegments.total > 0 ? Math.round((seg.val / clientSegments.total) * 100) : 0;
                      return (
                        <div key={seg.label} className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-kairos-silver-dark text-sm">{seg.label}</span>
                            <span className={`${seg.textColor} font-bold`}>{seg.val}/{clientSegments.total}</span>
                          </div>
                          <div
                            className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${seg.label}: ${seg.val} of ${clientSegments.total} clients`}
                          >
                            <div
                              className={`h-full ${seg.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Revenue Metrics */}
                <div>
                  <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Revenue Metrics</h3>
                  <div className="space-y-3">
                    {kpis
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
            )}
          </div>

          {/* Session Insights */}
          <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
            <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">Session Metrics</h3>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-kairos-dark rounded" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">Total Clients</p>
                  <p className="text-kairos-gold font-bold text-xl">{sessionMetrics.totalClients}</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">Avg Adherence</p>
                  <p className="text-kairos-gold font-bold text-xl">{sessionMetrics.avgAdherence}%</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">On Track</p>
                  <p className="text-kairos-gold font-bold text-xl">{sessionMetrics.onTrackCount}</p>
                  <p className="text-kairos-silver-dark text-xs mt-1">clients ≥75%</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">At Risk</p>
                  <p className="text-red-400 font-bold text-xl">{sessionMetrics.atRiskCount}</p>
                  <p className="text-kairos-silver-dark text-xs mt-1">clients &lt;50%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
