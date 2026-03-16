"use client";

import { useState, useMemo } from "react";
import { Bell, CheckCircle, ChevronDown, ChevronUp, Clock, Users } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useCoachAlerts } from "@/hooks/coach/useCoachAlerts";

type AlertPriority = "critical" | "high" | "medium" | "low" | "info";
type AlertStatus = "active" | "acknowledged" | "resolved";

interface CoachAlert {
  id: string;
  clientName: string;
  clientInitials: string;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  createdAt: string;
  details?: string;
}

const mockAlerts: CoachAlert[] = [
  { id: "1", clientName: "Lisa Park", clientInitials: "LP", title: "Critical: Glucose spike — 192 mg/dL", message: "Post-meal glucose exceeded critical threshold of 180 mg/dL.", priority: "critical", status: "active", createdAt: "30 min ago", details: "Lisa's glucose peaked at 192 mg/dL after lunch. This is the third critical spike this week. Consider adjusting her meal timing protocol and scheduling a review." },
  { id: "2", clientName: "Sarah Kim", clientInitials: "SK", title: "Adherence dropping — 3-day trend", message: "Supplement adherence dropped from 85% to 45% over 3 days.", priority: "high", status: "active", createdAt: "2 hours ago", details: "Sarah has missed her evening supplements for 3 consecutive days. Her magnesium and ashwagandha doses are being skipped." },
  { id: "3", clientName: "Nina Patel", clientInitials: "NP", title: "Sleep quality declining", message: "Sleep score dropped below 65 for two consecutive nights.", priority: "high", status: "active", createdAt: "4 hours ago", details: "Deep sleep reduced by 35%. Wake events increased. Late screen time and irregular bedtime reported." },
  { id: "4", clientName: "Lisa Park", clientInitials: "LP", title: "Missed check-in — 3 days", message: "No daily check-in completed since March 5.", priority: "medium", status: "active", createdAt: "6 hours ago" },
  { id: "5", clientName: "Sarah Kim", clientInitials: "SK", title: "HRV below baseline", message: "7-day HRV average dropped from 52ms to 41ms.", priority: "medium", status: "acknowledged", createdAt: "1 day ago", details: "Possible stress or overtraining. Current recovery score is low." },
  { id: "6", clientName: "Emma Wilson", clientInitials: "EW", title: "Lab results ready", message: "Metabolic panel results available from Quest Diagnostics.", priority: "low", status: "active", createdAt: "1 day ago" },
  { id: "7", clientName: "Michael McAlpin", clientInitials: "MM", title: "Fasting streak — 5 days", message: "Successfully completed 5 consecutive 16:8 fasts.", priority: "info", status: "resolved", createdAt: "2 days ago" },
  { id: "8", clientName: "James Torres", clientInitials: "JT", title: "Health score improved", message: "Overall health score increased from 85 to 91 over 2 weeks.", priority: "info", status: "resolved", createdAt: "3 days ago" },
];

const priorityConfig: Record<AlertPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: "text-red-400", bgColor: "bg-red-500/15", label: "Critical" },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/15", label: "High" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/15", label: "Medium" },
  low: { color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Low" },
  info: { color: "text-kairos-silver", bgColor: "bg-kairos-silver/10", label: "Info" },
};

export default function CoachAlertsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { alerts: _apiAlerts, summary: _alertsSummary } = useCoachAlerts(dateRange);

  const [filter, setFilter] = useState<"all" | AlertStatus>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alerts, setAlerts] = useState(mockAlerts);

  // Suppress unused variable warnings for date-range-aware future implementation
  void useMemo(() => dateRange, [dateRange]);

  const uniqueClients = Array.from(new Set(mockAlerts.map((a) => a.clientName)));
  const filtered = alerts.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (clientFilter !== "all" && a.clientName !== clientFilter) return false;
    return true;
  });
  const activeCount = alerts.filter((a) => a.status === "active").length;
  const criticalCount = alerts.filter((a) => a.priority === "critical" && a.status === "active").length;

  function acknowledge(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" as AlertStatus } : a)));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Client Alerts</h2>
          <p className="text-sm font-body text-kairos-silver-dark">
            {activeCount} active{criticalCount > 0 && ` • ${criticalCount} critical`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell size={16} className={criticalCount > 0 ? "text-red-400 animate-pulse" : "text-kairos-gold"} />
          <span className="text-sm font-heading font-bold text-kairos-gold">{activeCount}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as AlertPriority[]).map((p) => {
          const count = alerts.filter((a) => a.priority === p && a.status === "active").length;
          const cfg = priorityConfig[p];
          return (
            <div key={p} className="kairos-card text-center">
              <span className={`text-2xl font-heading font-bold ${cfg.color}`}>{count}</span>
              <p className="text-[10px] font-heading text-kairos-silver-dark mt-1 capitalize">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      <DateRangeNavigator
        availablePeriods={["week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
          {(["all", "active", "acknowledged", "resolved"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors capitalize ${filter === f ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs font-body text-kairos-silver-dark">
          <Users size={12} />
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="bg-kairos-card border border-kairos-border text-kairos-silver rounded-kairos-sm px-2 py-1 text-xs">
            <option value="all">All Clients</option>
            {uniqueClients.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const config = priorityConfig[alert.priority];
          const isExpanded = expanded === alert.id;
          return (
            <div key={alert.id} className="kairos-card">
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : alert.id)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${alert.priority === "critical" ? "bg-red-500/20" : alert.priority === "high" ? "bg-orange-500/20" : "bg-kairos-card-hover"}`}>
                  <span className={`text-xs font-heading font-bold ${config.color}`}>{alert.clientInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>{config.label}</span>
                    <span className={`text-[10px] font-heading px-1.5 py-0.5 rounded-full ${alert.status === "active" ? "bg-kairos-gold/15 text-kairos-gold" : alert.status === "acknowledged" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>{alert.status}</span>
                    <span className="text-[10px] font-body text-kairos-silver-dark">{alert.clientName}</span>
                  </div>
                  <p className="text-sm font-heading font-semibold text-white">{alert.title}</p>
                  <p className="text-xs font-body text-kairos-silver-dark mt-0.5">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-body text-kairos-silver-dark flex items-center gap-1"><Clock size={10} /> {alert.createdAt}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-kairos-silver-dark" /> : <ChevronDown size={16} className="text-kairos-silver-dark" />}
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-kairos-border space-y-3">
                  {alert.details && <p className="text-sm font-body text-kairos-silver">{alert.details}</p>}
                  {alert.status === "active" && (
                    <div className="flex gap-2">
                      <button onClick={() => acknowledge(alert.id)} className="kairos-btn-outline text-xs"><CheckCircle size={14} className="mr-1" /> Acknowledge</button>
                      <button className="kairos-btn-outline text-xs border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/10">View Client</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="kairos-card text-center py-10">
            <Bell size={32} className="text-kairos-silver-dark mx-auto mb-3" />
            <p className="text-sm font-body text-kairos-silver-dark">No alerts matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
