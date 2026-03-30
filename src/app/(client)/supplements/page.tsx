"use client";

import { useMemo, useState } from "react";
import { Pill, CheckCircle, TrendingUp } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useSupplements } from "@/hooks/client/useSupplements";
import { trpc } from "@/lib/trpc";

interface ProtocolItem {
  id: string;
  name: string;
  dosage: string | null;
  timeOfDay: string;
  taken: boolean;
  timing: string;
}

const timeOfDayLabels: Record<string, string> = { morning: "Morning", midday: "Midday", evening: "Evening", bedtime: "Bedtime" };
const timeOfDayIcons: Record<string, string> = { morning: "☀️", midday: "🌤️", evening: "🌅", bedtime: "🌙" };

export default function SupplementsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const { data: protocol } = trpc.clientPortal.supplements.getActiveProtocol.useQuery();
  const logAdherenceMutation = trpc.clientPortal.supplements.logAdherence.useMutation();

  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

  const { records: supplementHistory, stats: supplementStats } = useSupplements(dateRange);

  // Transform tRPC protocol data into ProtocolItem format
  const items = useMemo<ProtocolItem[]>(() => {
    if (!protocol?.items) return [];
    return protocol.items.map((item) => ({
      id: item.id,
      name: item.name,
      dosage: item.dosage,
      timeOfDay: item.timeOfDay ?? "morning",
      taken: takenIds.has(item.id),
      timing: item.frequency || "Daily",
    }));
  }, [protocol?.items, takenIds]);

  const takenCount = items.filter((i) => i.taken).length;
  const totalCount = items.length;
  const pct = Math.round((takenCount / totalCount) * 100);

  const avgAdherence = supplementStats.avgAdherence;

  function toggle(id: string) {
    setTakenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    logAdherenceMutation.mutate({ protocolItemId: id });
  }

  const grouped = items.reduce<Record<string, ProtocolItem[]>>((acc, item) => {
    if (!acc[item.timeOfDay]) acc[item.timeOfDay] = [];
    acc[item.timeOfDay].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Supplement Protocol</h2>
          <p className="text-sm font-body text-kairos-silver-dark">Daily protocol adherence tracking</p>
        </div>
        <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
          <Pill size={12} /> Active Protocol
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

      {/* Today's Progress */}
      <div className="kairos-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-white">Today&apos;s Progress</h3>
          <span className="text-sm font-heading font-bold text-kairos-gold">{takenCount}/{totalCount}</span>
        </div>
        <div className="h-3 bg-kairos-royal-surface rounded-full overflow-hidden">
          <div className="h-full bg-kairos-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs font-body text-kairos-silver-dark mt-1">{pct}% adherence today</p>
      </div>

      {/* Protocol Items by Time of Day */}
      {(["morning", "midday", "evening", "bedtime"] as const).map((tod) => (
        grouped[tod] && (
          <div key={tod} className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
              <span>{timeOfDayIcons[tod]}</span> {timeOfDayLabels[tod]}
              <span className="text-xs font-body text-kairos-silver-dark ml-auto">{grouped[tod][0].timing}</span>
            </h3>
            <div className="space-y-2">
              {grouped[tod].map((item) => (
                <button key={item.id} onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-kairos-sm border transition-all ${
                    item.taken ? "border-green-500/30 bg-green-500/5" : "border-kairos-border hover:border-kairos-gold/30"
                  }`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    item.taken ? "border-green-500 bg-green-500/20" : "border-kairos-border"
                  }`}>
                    {item.taken && <CheckCircle size={14} className="text-green-400" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-heading font-semibold ${item.taken ? "text-kairos-silver-dark line-through" : "text-white"}`}>{item.name}</p>
                    <p className="text-xs font-body text-kairos-silver-dark">{item.dosage} — {item.timing}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ))}

      {/* Adherence Chart */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-kairos-gold" /> Adherence — {formattedRange}
        </h3>
        <div className="grid grid-cols-7 gap-3">
          {supplementHistory.slice(0, period === "week" ? 7 : 28).map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] font-heading text-kairos-silver-dark mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</p>
              <div className="relative h-20 bg-kairos-royal-surface rounded-kairos-sm flex items-end justify-center p-1">
                <div className={`w-full rounded-sm transition-all ${
                  day.adherence >= 90 ? "bg-green-500/60" : day.adherence >= 70 ? "bg-kairos-gold/60" : "bg-red-500/40"
                }`} style={{ height: `${day.adherence}%` }} />
              </div>
              <p className="text-xs font-heading font-bold mt-1" style={{ color: day.adherence >= 90 ? "rgb(74, 222, 128)" : day.adherence >= 70 ? "rgb(var(--k-accent))" : "rgb(248, 113, 113)" }}>
                {day.adherence}%
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-kairos-border flex items-center gap-2">
          <TrendingUp size={14} className="text-green-400" />
          <p className="text-xs font-body text-kairos-silver-dark">
            Average adherence: <span className="text-white font-heading font-semibold">{avgAdherence}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
