"use client";

import { useState, useEffect } from "react";
import { Timer, Play, Square, Flame, Zap, Trophy, Clock } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useFasting } from "@/hooks/client/useFasting";

const fastingZones = [
  { name: "Fed State", start: 0, end: 4, color: "#ef4444", description: "Insulin elevated, storing energy" },
  { name: "Early Fasting", start: 4, end: 8, color: "#f97316", description: "Insulin dropping, fat mobilization begins" },
  { name: "Fat Burning", start: 8, end: 12, color: "#eab308", description: "Significant fat oxidation, growth hormone rises" },
  { name: "Ketosis", start: 12, end: 16, color: "#22c55e", description: "Ketone production accelerates" },
  { name: "Deep Ketosis", start: 16, end: 24, color: "#06b6d4", description: "Autophagy begins, cellular repair active" },
  { name: "Autophagy", start: 24, end: 48, color: "#8b5cf6", description: "Peak autophagy, stem cell regeneration" },
];

export default function FastingPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [isFasting, setIsFasting] = useState(false);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const targetHours = 16;

  const { records: fastingHistory, stats: fastingStats } = useFasting(dateRange);
  const historyStats = fastingStats;

  useEffect(() => {
    if (!isFasting || !startTime) return;
    const interval = setInterval(() => {
      const diff = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
      setElapsedHours(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFasting, startTime]);

  function startFast() {
    setStartTime(new Date());
    setIsFasting(true);
    setElapsedHours(0);
  }

  function stopFast() {
    setIsFasting(false);
  }

  const currentZone = fastingZones.find((z) => elapsedHours >= z.start && elapsedHours < z.end) ?? fastingZones[0];
  const progress = Math.min((elapsedHours / targetHours) * 100, 100);
  const hoursDisplay = Math.floor(elapsedHours);
  const minutesDisplay = Math.floor((elapsedHours % 1) * 60);
  const secondsDisplay = Math.floor(((elapsedHours * 60) % 1) * 60);
  const remainingHours = Math.max(0, targetHours - elapsedHours);

  const ringSize = 220;
  const strokeWidth = 12;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Fasting Timer</h2>
          <p className="text-sm font-body text-kairos-silver-dark">Intermittent fasting with metabolic zone tracking</p>
        </div>
        <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
          <Timer size={12} /> 16:8 Protocol
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["week", "month", "year"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Timer Card */}
      <div className="kairos-card flex flex-col items-center py-8">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="transform -rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(30,42,90,0.5)" strokeWidth={strokeWidth} />
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
              stroke={currentZone.color} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFasting ? (
              <>
                <span className="text-3xl font-heading font-bold text-white">
                  {String(hoursDisplay).padStart(2, "0")}:{String(minutesDisplay).padStart(2, "0")}:{String(secondsDisplay).padStart(2, "0")}
                </span>
                <span className="text-xs font-body text-kairos-silver-dark mt-1">of {targetHours}h goal</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-heading font-bold text-kairos-silver-dark">Ready</span>
                <span className="text-xs font-body text-kairos-silver-dark mt-1">{targetHours}h fast</span>
              </>
            )}
          </div>
        </div>

        {isFasting && (
          <div className="mt-4 text-center">
            <span className="text-xs font-heading font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${currentZone.color}20`, color: currentZone.color }}>
              {currentZone.name}
            </span>
            <p className="text-xs font-body text-kairos-silver-dark mt-2">{currentZone.description}</p>
            {remainingHours > 0 && (
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                {Math.floor(remainingHours)}h {Math.round((remainingHours % 1) * 60)}m remaining
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          {!isFasting ? (
            <button onClick={startFast} className="kairos-btn-gold flex items-center gap-2 px-8 py-3"><Play size={18} /> Start Fast</button>
          ) : (
            <button onClick={stopFast} className="kairos-btn-outline flex items-center gap-2 px-8 py-3 border-red-400 text-red-400 hover:bg-red-400/10"><Square size={18} /> End Fast</button>
          )}
        </div>
      </div>

      {/* History Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kairos-card text-center">
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Avg Duration</p>
          <p className="text-2xl font-heading font-bold text-kairos-gold">{historyStats.avgDuration}h</p>
        </div>
        <div className="kairos-card text-center">
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Completion Rate</p>
          <p className="text-2xl font-heading font-bold text-green-400">{historyStats.completionRate}%</p>
        </div>
        <div className="kairos-card text-center">
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Current Streak</p>
          <p className="text-2xl font-heading font-bold text-kairos-gold">{historyStats.streak} days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metabolic Zones */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Metabolic Zones</h3>
          <div className="space-y-2">
            {fastingZones.filter((z) => z.end <= 24).map((zone) => {
              const isActive = isFasting && elapsedHours >= zone.start && elapsedHours < zone.end;
              const isPast = isFasting && elapsedHours >= zone.end;
              return (
                <div key={zone.name} className={`flex items-center gap-3 px-3 py-2 rounded-kairos-sm transition-colors ${isActive ? "bg-kairos-card-hover border border-kairos-gold/20" : ""}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color, opacity: isPast ? 0.4 : 1 }} />
                  <div className="flex-1">
                    <p className={`text-sm font-heading font-semibold ${isActive ? "text-white" : isPast ? "text-kairos-silver-dark" : "text-kairos-silver"}`}>{zone.name}</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">{zone.start}–{zone.end}h</p>
                  </div>
                  {isPast && <span className="text-green-400"><Zap size={14} /></span>}
                  {isActive && <span className="text-kairos-gold text-[10px] font-heading font-bold">NOW</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Fasting History */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-kairos-gold" /> Fasting History — {formattedRange}
          </h3>
          <div className="space-y-3">
            {fastingHistory.slice(-7).reverse().map((fast, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${fast.completed ? "bg-green-500/20" : "bg-red-500/20"}`}>
                  {fast.completed ? <Trophy size={14} className="text-green-400" /> : <Flame size={14} className="text-red-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-heading font-semibold text-white">{fast.fastDuration}h — {fast.targetDuration}:8</p>
                  <p className="text-xs font-body text-kairos-silver-dark">{fast.dateLabel} — {fast.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <span className={`text-[10px] font-heading font-bold ${fast.completed ? "text-green-400" : "text-red-400"}`}>
                  {fast.completed ? "Complete" : "Broken"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
