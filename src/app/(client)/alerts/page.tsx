"use client";

import { useState, useMemo } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";

type AlertPriority = "critical" | "high" | "medium" | "low" | "info";
type AlertStatus = "active" | "acknowledged" | "resolved";

interface MockAlert {
  id: string;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  category: string;
  createdAt: string;
  details?: string;
}

// Seeded random for consistent mock data
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const alertTemplates = [
  { title: "Glucose spike detected — {v} mg/dL", message: "Post-dinner glucose exceeded 160 mg/dL threshold.", priority: "high" as AlertPriority, category: "glucose", details: "Your glucose peaked above your personalized threshold of 160 mg/dL. Consider reducing carbohydrate intake at dinner or adding a post-meal walk." },
  { title: "Sleep quality declining — {n}-night trend", message: "Average sleep score dropped over the last few nights.", priority: "medium" as AlertPriority, category: "sleep", details: "Deep sleep has decreased and wake events increased. Possible contributing factors: later bedtime and screen time before bed." },
  { title: "Weekly check-in due", message: "Your weekly symptom assessment is due.", priority: "low" as AlertPriority, category: "checkin" },
  { title: "Lab results available", message: "Your metabolic panel results are ready for review.", priority: "medium" as AlertPriority, category: "labs" },
  { title: "HRV trending upward", message: "Your 7-day HRV average improved. Great progress!", priority: "info" as AlertPriority, category: "hrv" },
  { title: "Missed morning supplements", message: "No adherence logged for AM protocol items.", priority: "medium" as AlertPriority, category: "adherence" },
  { title: "Fasting window completed", message: "Fast completed successfully. Ketone levels estimated optimal.", priority: "info" as AlertPriority, category: "fasting" },
  { title: "Elevated resting heart rate", message: "Resting HR is 8 bpm above your 30-day average.", priority: "high" as AlertPriority, category: "heart" },
  { title: "Supplement protocol updated", message: "Your coach has updated your evening supplement protocol.", priority: "low" as AlertPriority, category: "protocol" },
  { title: "Low hydration detected", message: "Water intake is below target for the day.", priority: "medium" as AlertPriority, category: "hydration" },
];

function generateAlerts(startDate: Date, endDate: Date): MockAlert[] {
  const alerts: MockAlert[] = [];
  const dayMs = 86400000;
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / dayMs));
  const baseSeed = startDate.getTime() / dayMs;
  const count = Math.min(15, Math.max(3, Math.round(days * 1.5)));
  const statuses: AlertStatus[] = ["active", "acknowledged", "resolved"];

  for (let i = 0; i < count; i++) {
    const tplIdx = Math.floor(seededRandom(baseSeed + i * 7) * alertTemplates.length);
    const tpl = alertTemplates[tplIdx];
    const statusIdx = Math.floor(seededRandom(baseSeed + i * 13) * 3);
    const daysAgo = Math.floor(seededRandom(baseSeed + i * 17) * days);
    const hoursAgo = Math.floor(seededRandom(baseSeed + i * 19) * 24);
    const totalHoursAgo = daysAgo * 24 + hoursAgo;

    let createdAt: string;
    if (totalHoursAgo < 1) createdAt = "just now";
    else if (totalHoursAgo < 24) createdAt = `${totalHoursAgo}h ago`;
    else createdAt = `${daysAgo}d ago`;

    const glucoseVal = Math.round(155 + seededRandom(baseSeed + i * 23) * 30);
    const nightTrend = Math.round(2 + seededRandom(baseSeed + i * 29) * 4);

    alerts.push({
      id: `alert-${i}`,
      title: tpl.title.replace("{v}", String(glucoseVal)).replace("{n}", String(nightTrend)),
      message: tpl.message,
      priority: tpl.priority,
      status: statuses[statusIdx],
      category: tpl.category,
      createdAt,
      details: tpl.details,
    });
  }
  return alerts;
}

const priorityConfig: Record<AlertPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: "text-red-400", bgColor: "bg-red-500/15", label: "Critical" },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/15", label: "High" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/15", label: "Medium" },
  low: { color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Low" },
  info: { color: "text-kairos-silver", bgColor: "bg-kairos-silver/10", label: "Info" },
};

export default function AlertsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [filter, setFilter] = useState<"all" | AlertStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const generatedAlerts = useMemo(() => generateAlerts(dateRange.startDate, dateRange.endDate), [dateRange]);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const alerts = useMemo(
    () => generatedAlerts.map((a) => (acknowledged.has(a.id) ? { ...a, status: "acknowledged" as AlertStatus } : a)),
    [generatedAlerts, acknowledged]
  );

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.status === filter);
  const activeCount = alerts.filter((a) => a.status === "active").length;

  function acknowledge(id: string) {
    setAcknowledged((prev) => new Set(prev).add(id));
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
          const config = priorityConfig[alert.priority];
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
