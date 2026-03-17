"use client";

import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useGlucose } from "@/hooks/client/useGlucose";
import { useThemeColors } from "@/lib/theme";
import { Droplets, TrendingDown, TrendingUp, Clock, Target, AlertTriangle } from "lucide-react";

export default function GlucosePage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const { readings: rawReadings, dailySummaries, weeklySummaries, stats } = useGlucose(dateRange);
  const themeColors = useThemeColors();

  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;
  const yMin = 60;
  const yMax = 180;

  const zoneTop = padding.top + plotH - ((140 - yMin) / (yMax - yMin)) * plotH;
  const zoneBottom = padding.top + plotH - ((70 - yMin) / (yMax - yMin)) * plotH;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading font-bold text-xl text-white">Glucose Monitoring</h2>
        <p className="text-sm font-body text-kairos-silver-dark">Continuous glucose tracking &amp; analysis</p>
      </div>

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

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Current" value={stats.current} unit="mg/dL" icon={<Droplets size={16} />} highlight />
        <KPICard label="Average" value={stats.avg} unit="mg/dL" trend="flat" trendValue={formattedRange} />
        <KPICard label="High" value={stats.max} unit="mg/dL" icon={<TrendingUp size={16} />} />
        <KPICard label="Low" value={stats.min} unit="mg/dL" icon={<TrendingDown size={16} />} />
        <KPICard label="Time in Range" value={stats.timeInRange} unit="%" icon={<Target size={16} />} highlight />
        <KPICard label="Est. A1C" value="5.2" unit="%" trend="down" trendValue="-0.1" icon={<Clock size={16} />} />
      </div>

      {/* DAY VIEW: 5-min line chart */}
      {period === "day" && (
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">{formattedRange} — Glucose Trace</h3>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
            <rect x={padding.left} y={zoneTop} width={plotW} height={zoneBottom - zoneTop} fill="rgba(46,125,50,0.1)" />
            <line x1={padding.left} y1={zoneTop} x2={padding.left + plotW} y2={zoneTop} stroke="rgba(46,125,50,0.3)" strokeDasharray="4" />
            <line x1={padding.left} y1={zoneBottom} x2={padding.left + plotW} y2={zoneBottom} stroke="rgba(46,125,50,0.3)" strokeDasharray="4" />
            <text x={padding.left - 5} y={zoneTop + 4} textAnchor="end" className="fill-green-400 text-[9px]">140</text>
            <text x={padding.left - 5} y={zoneBottom + 4} textAnchor="end" className="fill-green-400 text-[9px]">70</text>
            {[80, 100, 120, 160].map((v) => {
              const y = padding.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
              return (
                <g key={v}>
                  <line x1={padding.left} y1={y} x2={padding.left + plotW} y2={y} stroke="rgba(30,42,90,0.5)" />
                  <text x={padding.left - 5} y={y + 3} textAnchor="end" className="fill-kairos-silver-dark text-[9px]">{v}</text>
                </g>
              );
            })}
            <polyline
              points={rawReadings.map((d, i) => {
                const x = padding.left + (i / (rawReadings.length - 1)) * plotW;
                const y = padding.top + plotH - ((d.value - yMin) / (yMax - yMin)) * plotH;
                return `${x},${y}`;
              }).join(" ")}
              fill="none" stroke={themeColors.accent} strokeWidth="1.5" strokeLinejoin="round"
            />
            {rawReadings
              .filter((_, i) => i % Math.floor(rawReadings.length / 6) === 0)
              .map((d, idx) => {
                const origIdx = rawReadings.indexOf(d);
                const x = padding.left + (origIdx / (rawReadings.length - 1)) * plotW;
                return (
                  <text key={idx} x={x} y={chartHeight - 5} textAnchor="middle" className="fill-kairos-silver-dark text-[9px]">
                    {d.time}
                  </text>
                );
              })}
          </svg>
          <div className="flex items-center gap-4 mt-3 text-xs font-body text-kairos-silver-dark">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: themeColors.accent }} /> Glucose</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 border border-green-500/30 inline-block rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }} /> Target Range (70–140)</span>
          </div>
        </div>
      )}

      {/* WEEK VIEW: 7 daily bars */}
      {period === "week" && (
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">{formattedRange} — Daily Averages</h3>
          <div className="grid grid-cols-7 gap-3">
            {dailySummaries.map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-heading text-kairos-silver-dark mb-2">{day.dateLabel}</p>
                <div className="relative h-32 bg-kairos-royal-surface rounded-kairos-sm flex flex-col items-center justify-end p-1">
                  <div className="w-3 rounded-full bg-kairos-gold/20 relative" style={{ height: `${((day.max - day.min) / 100) * 100}%`, minHeight: "20%" }}>
                    <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-kairos-gold border-2 border-kairos-card" style={{ bottom: `${((day.avg - day.min) / (day.max - day.min)) * 100}%` }} />
                  </div>
                </div>
                <p className="text-xs font-heading font-bold text-kairos-gold mt-1">{day.avg}</p>
                <p className="text-[9px] font-body text-kairos-silver-dark">{day.min}–{day.max}</p>
                <p className="text-[9px] font-body text-green-400">{day.timeInRange}% IR</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTH VIEW: weekly summary bars */}
      {period === "month" && (
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">{formattedRange} — Weekly Averages</h3>
          <div className="space-y-4">
            {weeklySummaries.map((week, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs font-heading text-kairos-silver-dark w-24 flex-shrink-0">{week.weekLabel}</span>
                <div className="flex-1 h-8 bg-kairos-royal-surface rounded-kairos-sm relative overflow-hidden">
                  <div
                    className="h-full bg-kairos-gold/20 rounded-kairos-sm flex items-center px-3"
                    style={{ width: `${(week.avg / 180) * 100}%` }}
                  >
                    <span className="text-xs font-heading font-bold text-kairos-gold">{week.avg} mg/dL</span>
                  </div>
                  {/* Target zone marker */}
                  <div className="absolute top-0 bottom-0 border-l border-r border-green-500/30" style={{ left: `${(70/180)*100}%`, width: `${((140-70)/180)*100}%` }} />
                </div>
                <span className="text-xs font-body text-green-400 w-16 text-right">{week.timeInRange}% IR</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Events</h3>
          <div className="space-y-3">
            {[
              { time: "7:45 AM", event: "Fasting glucose", value: "82 mg/dL", status: "optimal" },
              { time: "9:12 AM", event: "Post-breakfast spike", value: "138 mg/dL", status: "normal" },
              { time: "12:48 PM", event: "Post-lunch spike", value: "142 mg/dL", status: "warning" },
              { time: "3:30 PM", event: "Afternoon dip", value: "74 mg/dL", status: "normal" },
              { time: "7:15 PM", event: "Post-dinner spike", value: "156 mg/dL", status: "elevated" },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-xs font-body text-kairos-gold w-16 flex-shrink-0">{e.time}</span>
                <div className="flex-1"><p className="text-sm font-body text-white">{e.event}</p></div>
                <span className={`text-xs font-heading font-semibold px-2 py-0.5 rounded-full ${
                  e.status === "optimal" ? "bg-green-500/15 text-green-400" :
                  e.status === "warning" ? "bg-yellow-500/15 text-yellow-400" :
                  e.status === "elevated" ? "bg-red-500/15 text-red-400" :
                  "bg-kairos-silver/10 text-kairos-silver"
                }`}>{e.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">AI Insights</h3>
          <div className="space-y-4">
            <div className="flex gap-3 p-3 rounded-kairos-sm bg-green-500/5 border border-green-500/20">
              <Target size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-body text-white">Time in range improved to {stats.timeInRange}%</p>
                <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Up from 82% last week. Your fasting windows are helping.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-kairos-sm bg-yellow-500/5 border border-yellow-500/20">
              <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-body text-white">Post-dinner spikes trending higher</p>
                <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Consider a 15-min walk after dinner or shifting carbs to earlier meals.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-kairos-sm bg-kairos-gold/5 border border-kairos-gold/20">
              <TrendingDown size={16} className="text-kairos-gold mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-body text-white">Estimated A1C dropped to 5.2%</p>
                <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Down from 5.3% last month. Excellent metabolic health.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
