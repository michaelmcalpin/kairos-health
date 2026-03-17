"use client";

import { useState, useMemo } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  getClientAlerts,
  acknowledgeClientAlert,
} from "@/lib/client-ops/engine";
import { CLIENT_ALERT_PRIORITY_CONFIG } from "@/lib/client-ops/types";
import type { ClientAlertStatus } from "@/lib/client-ops/types";

const CLIENT_ID = "demo-client";

export default function AlertsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [filter, setFilter] = useState<"all" | ClientAlertStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const alerts = useMemo(
    () => getClientAlerts(CLIENT_ID, dateRange.startDate, dateRange.endDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange, refreshKey]
  );

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.status === filter);
  const activeCount = alerts.filter((a) => a.status === "active").length;

  function acknowledge(id: string) {
    acknowledgeClientAlert(CLIENT_ID, id);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Alerts</h2>
          <p className="text-sm font-body text-kairos-silver-dark">{activeCount} active alert{activeCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
          {(["all", "active", "acknowledged", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors capitalize ${
                filter === f ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
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

      <div className="space-y-3">
        {filtered.map((alert) => {
          const config = CLIENT_ALERT_PRIORITY_CONFIG[alert.priority];
          const isExpanded = expanded === alert.id;
          return (
            <div key={alert.id} className="kairos-card">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : alert.id)}
              >
                <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                  {alert.priority === "info" ? <Info size={18} /> : alert.status === "resolved" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                    <span className={`text-[10px] font-heading px-1.5 py-0.5 rounded-full ${
                      alert.status === "active" ? "bg-kairos-gold/15 text-kairos-gold" :
                      alert.status === "acknowledged" ? "bg-blue-500/15 text-blue-400" :
                      "bg-green-500/15 text-green-400"
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm font-heading font-semibold text-white">{alert.title}</p>
                  <p className="text-xs font-body text-kairos-silver-dark mt-0.5">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-body text-kairos-silver-dark flex items-center gap-1">
                    <Clock size={10} /> {alert.createdAt}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-kairos-silver-dark" /> : <ChevronDown size={16} className="text-kairos-silver-dark" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-kairos-border space-y-3">
                  {alert.details && (
                    <p className="text-sm font-body text-kairos-silver">{alert.details}</p>
                  )}
                  {alert.status === "active" && (
                    <button onClick={() => acknowledge(alert.id)} className="kairos-btn-outline text-xs">
                      <CheckCircle size={14} className="mr-1" /> Acknowledge
                    </button>
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
