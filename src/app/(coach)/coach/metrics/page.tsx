"use client";

import { useState } from "react";
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

interface KPICard {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

interface Client {
  id: string;
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdate: string;
}

interface ClientAtRisk {
  id: string;
  name: string;
  issue: string;
  daysSinceContact: number;
}

interface ProtocolMetric {
  name: string;
  adherenceRate: number;
  outcomeScore: number;
  clientCount: number;
}

export default function CoachMetricsPage() {
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // Mock KPI Data
  const kpiData: KPICard[] = [
    {
      label: 'Total Clients',
      value: '24',
      change: 4,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Avg Health Score',
      value: '76.5',
      change: 2.3,
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: 'Client Retention Rate',
      value: '92%',
      change: 3.2,
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: 'Avg Session Rating',
      value: '4.7/5',
      change: 0.3,
      icon: <Award className="w-5 h-5" />,
    },
    {
      label: 'Revenue This Month',
      value: '$12,450',
      change: 8.5,
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  // Health score distribution
  const healthScoreDistribution = [
    { range: '90+', count: 6, percentage: 25 },
    { range: '80-89', count: 9, percentage: 37.5 },
    { range: '70-79', count: 5, percentage: 21 },
    { range: '60-69', count: 3, percentage: 13 },
    { range: '<60', count: 1, percentage: 4 },
  ];

  // Monthly trend data
  const monthlyTrend = [
    { month: 'Sep', newClients: 2, sessions: 45, revenue: 8200 },
    { month: 'Oct', newClients: 3, sessions: 52, revenue: 9800 },
    { month: 'Nov', newClients: 1, sessions: 48, revenue: 9200 },
    { month: 'Dec', newClients: 4, sessions: 61, revenue: 11500 },
    { month: 'Jan', newClients: 3, sessions: 58, revenue: 10900 },
    { month: 'Feb', newClients: 2, sessions: 54, revenue: 10100 },
  ];

  // Top performing clients
  const topClients: Client[] = [
    {
      id: '1',
      name: 'Sarah Mitchell',
      score: 94,
      trend: 'up',
      lastUpdate: '2 days ago',
    },
    {
      id: '2',
      name: 'James Peterson',
      score: 89,
      trend: 'up',
      lastUpdate: '1 day ago',
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      score: 87,
      trend: 'stable',
      lastUpdate: '3 days ago',
    },
    {
      id: '4',
      name: 'David Chen',
      score: 85,
      trend: 'up',
      lastUpdate: '4 days ago',
    },
  ];

  // Clients needing attention
  const clientsAtRisk: ClientAtRisk[] = [
    { id: '1', name: 'Michael Johnson', issue: 'Low adherence', daysSinceContact: 8 },
    { id: '2', name: 'Lisa Thompson', issue: 'Health score declining', daysSinceContact: 5 },
    {
      id: '3',
      name: 'Robert Martinez',
      issue: 'Missed last 2 sessions',
      daysSinceContact: 6,
    },
  ];

  // Protocol effectiveness
  const protocols: ProtocolMetric[] = [
    { name: 'Cardiovascular Optimization', adherenceRate: 88, outcomeScore: 8.6, clientCount: 12 },
    { name: 'Sleep & Recovery', adherenceRate: 85, outcomeScore: 8.3, clientCount: 18 },
    { name: 'Strength & Mobility', adherenceRate: 92, outcomeScore: 8.9, clientCount: 15 },
    { name: 'Nutritional Reset', adherenceRate: 78, outcomeScore: 8.1, clientCount: 9 },
  ];

  const maxRevenue = Math.max(...monthlyTrend.map((m) => m.revenue));
  const maxSessions = Math.max(...monthlyTrend.map((m) => m.sessions));

  return (
    <div className="min-h-screen bg-kairos-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold font-heading text-white mb-2">
              Performance Metrics
            </h1>
            <p className="text-kairos-silver-dark font-body">
              Track your coaching effectiveness and client progress
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-4 py-2 rounded-kairos-sm font-body text-sm transition-colors ${
                viewMode === "overview"
                  ? "bg-kairos-gold text-kairos-dark font-semibold"
                  : "kairos-btn-outline text-kairos-silver-dark hover:text-kairos-gold"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-4 py-2 rounded-kairos-sm font-body text-sm transition-colors ${
                viewMode === "detailed"
                  ? "bg-kairos-gold text-kairos-dark font-semibold"
                  : "kairos-btn-outline text-kairos-silver-dark hover:text-kairos-gold"
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="mb-8">
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
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-fade-in">
          {kpiData.map((kpi, idx) => (
            <div
              key={idx}
              className="kairos-card p-6 border border-kairos-border hover:border-kairos-gold transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-kairos-gold">{kpi.icon}</div>
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    kpi.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {kpi.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              <h3 className="kairos-label text-xs uppercase tracking-wider text-kairos-silver-dark mb-2">
                {kpi.label}
              </h3>
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
                <h2 className="text-xl font-bold font-heading text-white">
                  Client Health Score Distribution
                </h2>
              </div>
              <div className="space-y-4">
                {healthScoreDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-20 text-right">
                      <span className="kairos-label text-sm text-kairos-silver-dark">
                        {item.range}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-kairos-dark border border-kairos-border rounded-kairos-sm overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 flex items-center justify-end pr-3 transition-all duration-500"
                          style={{ width: `${item.percentage * 2}%` }}
                        >
                          {item.percentage > 10 && (
                            <span className="text-kairos-dark text-xs font-bold">
                              {item.count}
                            </span>
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
                <h2 className="text-xl font-bold font-heading text-white">
                  Monthly Trends (Last 6 Months)
                </h2>
              </div>

              <div className="space-y-8">
                {/* Revenue Chart */}
                <div>
                  <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">
                    Monthly Revenue
                  </h3>
                  <div className="flex items-end justify-between gap-2 h-48 px-2">
                    {monthlyTrend.map((data, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <svg width="100%" height="180" className="mb-2">
                          <rect
                            x="10%"
                            y={180 - (data.revenue / maxRevenue) * 180}
                            width="80%"
                            height={(data.revenue / maxRevenue) * 180}
                            fill="url(#goldGradient)"
                            rx="4"
                          />
                          <defs>
                            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#D4AF37" />
                              <stop offset="100%" stopColor="#AA8C2C" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="text-xs text-kairos-silver-dark">{data.month}</span>
                        <span className="text-xs font-semibold text-kairos-gold">
                          ${(data.revenue / 1000).toFixed(1)}k
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sessions Chart */}
                <div>
                  <h3 className="kairos-label text-sm text-kairos-silver-dark mb-4">
                    Monthly Sessions
                  </h3>
                  <div className="flex items-end justify-between gap-2 h-48 px-2">
                    {monthlyTrend.map((data, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <svg width="100%" height="180" className="mb-2">
                          <rect
                            x="10%"
                            y={180 - (data.sessions / maxSessions) * 180}
                            width="80%"
                            height={(data.sessions / maxSessions) * 180}
                            fill="url(#silverGradient)"
                            rx="4"
                          />
                          <defs>
                            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#E0E0E0" />
                              <stop offset="100%" stopColor="#888888" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="text-xs text-kairos-silver-dark">{data.month}</span>
                        <span className="text-xs font-semibold text-kairos-silver">
                          {data.sessions}
                        </span>
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
                  <h2 className="text-xl font-bold font-heading text-white">
                    Top Performing Clients
                  </h2>
                </div>
                <div className="space-y-3">
                  {topClients.map((client, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm hover:border-kairos-gold transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{client.name}</p>
                        <p className="text-kairos-silver-dark text-xs">
                          Updated {client.lastUpdate}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-kairos-gold font-bold text-lg">{client.score}</p>
                          <p className="text-kairos-silver-dark text-xs">Score</p>
                        </div>
                        {client.trend === 'up' && (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        )}
                        {client.trend === 'down' && (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        {client.trend === 'stable' && (
                          <div className="w-5 h-5 text-kairos-silver-dark">→</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clients at Risk */}
              <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-bold font-heading text-white">
                    Clients Needing Attention
                  </h2>
                </div>
                <div className="space-y-3">
                  {clientsAtRisk.map((client, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-kairos-dark border border-red-900/50 rounded-kairos-sm hover:border-red-500 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{client.name}</p>
                        <p className="text-red-300 text-xs">{client.issue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-kairos-silver-dark text-xs font-semibold">
                          {client.daysSinceContact}d
                        </p>
                        <p className="text-kairos-silver-dark text-xs">since contact</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Protocol Effectiveness */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6 text-kairos-gold" />
                <h2 className="text-xl font-bold font-heading text-white">
                  Protocol Effectiveness Summary
                </h2>
              </div>
              <div className="space-y-6">
                {protocols.map((protocol, idx) => (
                  <div key={idx} className="border-b border-kairos-border last:border-b-0 pb-6 last:pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-sm mb-1">{protocol.name}</h3>
                        <p className="text-kairos-silver-dark text-xs">
                          {protocol.clientCount} clients enrolled
                        </p>
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
                        <p className="text-kairos-gold text-sm font-semibold mt-1">
                          {protocol.adherenceRate}%
                        </p>
                      </div>
                      <div>
                        <p className="kairos-label text-xs mb-2">Outcome Score</p>
                        <div className="w-full h-2 bg-kairos-dark border border-kairos-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 transition-all"
                            style={{ width: `${(protocol.outcomeScore / 10) * 100}%` }}
                          />
                        </div>
                        <p className="text-kairos-gold text-sm font-semibold mt-1">
                          {protocol.outcomeScore}/10
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Detailed View: Expanded Metrics */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <h2 className="text-xl font-bold font-heading text-white mb-6">Detailed Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* All Clients Overview */}
                <div>
                  <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">
                    Client Segments
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-kairos-silver-dark text-sm">Active Clients</span>
                        <span className="text-kairos-gold font-bold">22/24</span>
                      </div>
                      <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-kairos-gold"
                          style={{ width: '91.7%' }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-kairos-silver-dark text-sm">On-Track Clients</span>
                        <span className="text-kairos-gold font-bold">18/24</span>
                      </div>
                      <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-kairos-gold"
                          style={{ width: '75%' }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-kairos-silver-dark text-sm">Needs Attention</span>
                        <span className="text-red-400 font-bold">3/24</span>
                      </div>
                      <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400"
                          style={{ width: '12.5%' }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-kairos-silver-dark text-sm">Inactive</span>
                        <span className="text-kairos-silver-dark font-bold">2/24</span>
                      </div>
                      <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-kairos-silver-dark"
                          style={{ width: '8.3%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div>
                  <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">
                    Revenue Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <p className="text-kairos-silver-dark text-xs mb-1">MTD Revenue</p>
                      <p className="text-kairos-gold font-bold text-2xl">$12,450</p>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <p className="text-kairos-silver-dark text-xs mb-1">Avg Revenue/Client</p>
                      <p className="text-kairos-gold font-bold text-2xl">$518</p>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <p className="text-kairos-silver-dark text-xs mb-1">Projected Monthly</p>
                      <p className="text-kairos-gold font-bold text-2xl">$12,625</p>
                    </div>
                    <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                      <p className="text-kairos-silver-dark text-xs mb-1">YTD Revenue</p>
                      <p className="text-kairos-gold font-bold text-2xl">$60,350</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Insights */}
            <div className="kairos-card p-8 border border-kairos-border animate-fade-in">
              <h3 className="kairos-label text-sm mb-4 text-kairos-silver-dark">
                Session Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">Total Sessions (MTD)</p>
                  <p className="text-kairos-gold font-bold text-xl">54</p>
                  <p className="text-green-400 text-xs mt-1">↑ 8.6% vs last month</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">Avg Duration</p>
                  <p className="text-kairos-gold font-bold text-xl">52m</p>
                  <p className="text-kairos-silver-dark text-xs mt-1">per session</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">Completion Rate</p>
                  <p className="text-kairos-gold font-bold text-xl">96%</p>
                  <p className="text-green-400 text-xs mt-1">↑ 2% vs last month</p>
                </div>
                <div className="p-4 bg-kairos-dark border border-kairos-border rounded-kairos-sm">
                  <p className="text-kairos-silver-dark text-xs mb-2">No-Show Rate</p>
                  <p className="text-kairos-gold font-bold text-xl">2%</p>
                  <p className="text-green-400 text-xs mt-1">↓ improved</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
