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
import { trpc } from "@/lib/trpc";
import { round } from "@/lib/format/number";

const KPI_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  trending: <TrendingUp className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
  dollar: <DollarSign className="w-5 h-5" />,
};

export default function CoachMetricsPage() {
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  // Metrics reflect current, live figures. Period-scoped filtering isn't supported
  // by the backend yet, so no date navigator is shown (it would imply filtering
  // that doesn't happen).
  const clientStatsQuery = trpc.coach.clients.getStats.useQuery();
  const clientsListQuery = trpc.coach.clients.listAll.useQuery();
  const clientsList = clientsListQuery.data;
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
    const activeAlerts = alertsSummaryQuery.data?.total || 0;

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
        // avgHealthScore excludes no-data clients; null means nobody has a score.
        value: stats.avgHealthScore != null ? stats.avgHealthScore.toFixed(1) : "—",
        icon: "target",
        trend: stats.avgHealthScore == null ? ("flat" as const) : stats.avgHealthScore >= 70 ? ("up" as const) : ("down" as const),
        trendValue: stats.avgHealthScore == null ? "no data" : stats.avgHealthScore >= 70 ? "on track" : "needs focus",
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
        value: activeAlerts.toString(),
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

    // Tier distribution only — these three are mutually exclusive and sum to
    // the roster. (Health status like "critical" overlaps tiers, so mixing it
    // in here double-counted clients and could exceed 100%.)
    return [
      { range: "Tier 1", count: stats.tier1Count, percentage: Math.round((stats.tier1Count / total) * 100) },
      { range: "Tier 2", count: stats.tier2Count, percentage: Math.round((stats.tier2Count / total) * 100) },
      { range: "Tier 3", count: stats.tier3Count, percentage: Math.round((stats.tier3Count / total) * 100) },
    ];
  }, [clientStatsQuery.data]);

  // Build top clients from list
  const topClients = useMemo(() => {
    if (!clientsList) return [];

    // Only rank clients who actually have a score — a no-data client can't be
    // "top performing".
    return clientsList
      .filter((client) => client.healthScore != null)
      .sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0))
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        name: client.name || "Unknown",
        score: (client.healthScore ?? 0).toFixed(1),
        lastUpdate: "",
        trend: "stable" as "up" | "down" | "stable",
      }));
  }, [clientsList]);

  // Build at-risk clients from list
  const atRiskClients = useMemo(() => {
    if (!clientsList) return [];

    // A no-data client (null score) is never flagged for "low health score" —
    // only a real sub-60 score or low adherence counts as at-risk.
    return clientsList
      .filter((client) => (client.healthScore != null && client.healthScore < 60) || (client.adherence || 0) < 50)
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        name: client.name || "Unknown",
        issue: client.healthScore != null && client.healthScore < 60 ? "Low health score" : "Low adherence",
        healthScore: client.healthScore,
      }));
  }, [clientsList]);

  // Build client segments
  const clientSegments = useMemo(() => {
    if (!clientStatsQuery.data || !clientsList) return { active: 0, onTrack: 0, needsAttention: 0, inactive: 0, total: 0 };

    const stats = clientStatsQuery.data;
    const list = clientsList;

    // Bucket only clients with a real score; no-data clients are excluded from
    // both on-track and needs-attention counts (not treated as 0).
    const onTrack = list.filter((c) => c.healthScore != null && c.healthScore >= 75).length;
    const needsAttention = list.filter((c) => c.healthScore != null && c.healthScore < 60).length;
    const active = list.length - needsAttention;

    return {
      active,
      onTrack,
      needsAttention,
      inactive: 0,
      total: stats.totalClients,
    };
  }, [clientStatsQuery.data, clientsList]);

  // Build session metrics from client adherence data
  const sessionMetrics = useMemo(() => {
    if (!clientsList) return { totalClients: 0, avgAdherence: 0, onTrackCount: 0, atRiskCount: 0 };

    const clients = clientsList;
    const avgAdherence = clients.reduce((sum, c) => sum + (c.adherence || 0), 0) / (clients.length || 1);
    const onTrackCount = clients.filter((c) => (c.adherence || 0) >= 75).length;
    const atRiskCount = clients.filter((c) => (c.adherence || 0) < 50).length;

    return {
      totalClients: clients.length,
      avgAdherence: Math.round(avgAdherence),
      onTrackCount,
      atRiskCount,
    };
  }, [clientsList]);

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
              <h2 className="text-xl font-bold font-heading text-white">Client Tier Distribution</h2>
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
                        <p className="text-red-400 text-sm font-bold">{round(client.healthScore, 0)}</p>
                        <p className="text-kairos-silver-dark text-xs">score</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
