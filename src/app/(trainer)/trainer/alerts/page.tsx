"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, ChevronDown, ChevronUp, Clock, Users } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { PRIORITY_CONFIG } from "@/lib/coach-ops/types";
import type { AlertStatus } from "@/lib/coach-ops/types";

export default function CoachAlertsPage() {
  const router = useRouter();
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [filter, setFilter] = useState<"all" | AlertStatus>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Fetch alerts and summary from tRPC
  const { data: alertsData = { alerts: [], total: 0, hasMore: false }, isLoading: alertsLoading } =
    trpc.coach.alerts.list.useQuery({ status: filter === "all" ? "all" : filter, limit: 50 });

  const { data: summaryData, isLoading: summaryLoading } =
    trpc.coach.alerts.summary.useQuery();

  const { mutate: acknowledgeAlert } = trpc.coach.alerts.acknowledge.useMutation({
    onSuccess: () => {
      // Refetch alerts after acknowledging
      void trpc.useUtils().coach.alerts.list.invalidate();
      void trpc.useUtils().coach.alerts.summary.invalidate();
    },
  });

  const alerts = alertsData.alerts || [];
  const stats = summaryData || { urgent: 0, action: 0, info: 0, total: 0 };

  const uniqueClients = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.clientName))),
    [alerts]
  );

  const filtered = clientFilter === "all"
    ? alerts
    : alerts.filter((a) => a.clientName === clientFilter);

  function handleAcknowledge(id: string) {
    acknowledgeAlert({ alertId: id });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Client Alerts</h2>
          <p className="text-sm font-body text-kairos-silver-dark">
            {stats.action} active{stats.urgent > 0 && ` • ${stats.urgent} urgent`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell size={16} className={stats.urgent > 0 ? "text-red-400 animate-pulse" : "text-kairos-gold"} />
          <span className="text-sm font-heading font-bold text-kairos-gold">{stats.action}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryLoading ? (
          <div className="col-span-full">
            <div className="kairos-card text-center py-4">
              <p className="text-sm font-body text-kairos-silver-dark">Loading summary...</p>
            </div>
          </div>
        ) : (
          (["urgent", "action", "info"] as const).map((p) => {
            const count = p === "urgent" ? stats.urgent : p === "action" ? stats.action : stats.info;
            const cfg = PRIORITY_CONFIG[p === "urgent" ? "critical" : p === "action" ? "high" : "medium"];
            return (
              <div key={p} className="kairos-card text-center">
                <span className={`text-2xl font-heading font-bold ${cfg.color}`}>{count}</span>
                <p className="text-[10px] font-heading text-kairos-silver-dark mt-1 capitalize">{cfg.label}</p>
              </div>
            );
          })
        )}
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
        {alertsLoading ? (
          <div className="kairos-card text-center py-10">
            <p className="text-sm font-body text-kairos-silver-dark">Loading alerts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="kairos-card text-center py-10">
            <Bell size={32} className="text-kairos-silver-dark mx-auto mb-3" />
            <p className="text-sm font-body text-kairos-silver-dark">No alerts matching this filter.</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const priorityKey = alert.priority as keyof typeof PRIORITY_CONFIG;
            const config = PRIORITY_CONFIG[priorityKey] ?? PRIORITY_CONFIG.medium;
            const isExpanded = expanded === alert.id;
            return (
              <div key={alert.id} className="kairos-card">
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isExpanded ? null : alert.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpanded(isExpanded ? null : alert.id);
                    }
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${alert.priority === "urgent" ? "bg-red-500/20" : alert.priority === "action" ? "bg-orange-500/20" : "bg-kairos-card-hover"}`}>
                    <span className={`text-xs font-heading font-bold ${config.color}`}>{alert.clientName?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?"}</span>
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
                    {alert.message && <p className="text-sm font-body text-kairos-silver">{alert.message}</p>}
                    {alert.status === "active" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAcknowledge(alert.id)} className="kairos-btn-outline text-xs"><CheckCircle size={14} className="mr-1" /> Acknowledge</button>
                        <button onClick={() => router.push("/trainer/clients")} className="kairos-btn-outline text-xs border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/10">View Client</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
