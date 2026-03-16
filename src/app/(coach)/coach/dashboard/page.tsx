"use client";

import { useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useCoachDashboard } from "@/hooks/coach/useCoachDashboard";
import { getDaysInRange } from "@/utils/dateRange";
import { Users, Bell, Calendar, TrendingUp, DollarSign, Clock } from "lucide-react";

// Seeded random for consistent mock data
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface ClientEntry {
  name: string;
  initials: string;
  score: number;
  alerts: number;
  status: string;
}

interface ScheduleEntry {
  time: string;
  client: string;
  type: string;
}

export default function CoachDashboard() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _dashboardData } = useCoachDashboard();

  const daysInRange = useMemo(() => getDaysInRange(dateRange.startDate, dateRange.endDate), [dateRange]);

  // Generate period-aware stats
  const stats = useMemo(() => {
    const baseSeed = dateRange.startDate.getTime() / 86400000;
    const sessionsPerDay = 3 + Math.floor(seededRandom(baseSeed + 1) * 3);
    const totalSessions = period === "day" ? sessionsPerDay : sessionsPerDay * daysInRange;
    const avgHealthScore = Math.round(78 + seededRandom(baseSeed + 2) * 12);
    const revenue = period === "day"
      ? Math.round(250 + seededRandom(baseSeed + 3) * 200)
      : Math.round((250 + seededRandom(baseSeed + 3) * 200) * daysInRange);
    const pendingAlerts = Math.round(2 + seededRandom(baseSeed + 4) * 8);
    const activeClients = Math.round(10 + seededRandom(baseSeed + 5) * 5);
    const avgResponseTime = Math.round(8 + seededRandom(baseSeed + 6) * 15);

    return { totalSessions, avgHealthScore, revenue, pendingAlerts, activeClients, avgResponseTime };
  }, [dateRange, period, daysInRange]);

  // Priority clients (changes slightly by period seed)
  const clients: ClientEntry[] = useMemo(() => {
    const baseSeed = dateRange.startDate.getTime() / 86400000;
    const names = [
      { name: "Michael M.", initials: "MM" },
      { name: "Sarah K.", initials: "SK" },
      { name: "James T.", initials: "JT" },
      { name: "Lisa P.", initials: "LP" },
      { name: "David C.", initials: "DC" },
      { name: "Emma R.", initials: "ER" },
    ];
    const statuses = ["Active Protocol", "Review Needed", "Stable", "Critical Review", "On Track", "New Client"];
    return names.slice(0, 4).map((n, i) => ({
      ...n,
      score: Math.round(60 + seededRandom(baseSeed + 10 + i) * 35),
      alerts: Math.round(seededRandom(baseSeed + 20 + i) * 5),
      status: statuses[Math.floor(seededRandom(baseSeed + 30 + i) * statuses.length)],
    }));
  }, [dateRange]);

  // Schedule entries
  const schedule: ScheduleEntry[] = useMemo(() => {
    const types = ["Check-in", "Protocol Review", "Lab Review", "Follow-up", "Onboarding", "Assessment"];
    const clientNames = ["Michael M.", "Sarah K.", "Lisa P.", "James T.", "David C.", "Emma R."];
    const baseSeed = dateRange.startDate.getTime() / 86400000;
    const count = period === "day" ? 4 : Math.min(8, daysInRange * 2);
    return Array.from({ length: count }, (_, i) => {
      const hour = 8 + Math.floor(seededRandom(baseSeed + 40 + i) * 9);
      const minute = Math.floor(seededRandom(baseSeed + 50 + i) * 4) * 15;
      return {
        time: `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
        client: clientNames[Math.floor(seededRandom(baseSeed + 60 + i) * clientNames.length)],
        type: types[Math.floor(seededRandom(baseSeed + 70 + i) * types.length)],
      };
    });
  }, [dateRange, period, daysInRange]);

  return (
    <div className="space-y-6 animate-fade-in">
      <DateRangeNavigator
        availablePeriods={["day", "week", "month"]}
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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Active Clients" value={stats.activeClients} trend="up" trendValue="+2 this month" icon={<Users size={16} />} />
        <KPICard label="Pending Alerts" value={stats.pendingAlerts} trend="down" trendValue="-3" icon={<Bell size={16} />} />
        <KPICard label={period === "day" ? "Today\u0027s Sessions" : "Total Sessions"} value={stats.totalSessions} icon={<Calendar size={16} />} />
        <KPICard label="Avg Health Score" value={stats.avgHealthScore} unit="/100" trend="up" trendValue="+4 pts" icon={<TrendingUp size={16} />} highlight />
        <KPICard label={period === "day" ? "Daily Revenue" : "Revenue"} value={`$${stats.revenue.toLocaleString()}`} trend="up" trendValue="+12%" icon={<DollarSign size={16} />} />
        <KPICard label="Avg Response Time" value={stats.avgResponseTime} unit="min" trend="down" trendValue="-6 min" icon={<Clock size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Queue */}
        <div className="lg:col-span-2 kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Priority Clients</h3>
          <div className="space-y-3">
            {clients.map((client, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-3 rounded-kairos-sm hover:bg-kairos-card-hover transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-kairos-gold/20 flex items-center justify-center">
                  <span className="text-xs font-heading font-bold text-kairos-gold">{client.initials}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-heading font-semibold text-white">{client.name}</p>
                  <p className="text-xs font-body text-kairos-silver-dark">{client.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-heading font-bold text-kairos-gold">{client.score}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">health score</p>
                </div>
                {client.alerts > 0 && (
                  <span className="bg-red-500/15 text-red-400 text-[10px] font-heading font-bold rounded-full px-2 py-0.5">
                    {client.alerts}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">
            {period === "day" ? "Today\u0027s Schedule" : `Schedule — ${formattedRange}`}
          </h3>
          <div className="space-y-3">
            {schedule.map((session, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-xs font-body text-kairos-gold w-16 flex-shrink-0">{session.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-white truncate">{session.client}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">{session.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
