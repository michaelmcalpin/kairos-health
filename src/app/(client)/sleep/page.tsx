"use client";

import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useSleep } from "@/hooks/client/useSleep";
import { Moon, Clock, Zap, Brain, TrendingUp, Sun } from "lucide-react";
import { generateSleepStages } from "@/lib/client-ops";

const stageColors: Record<string, string> = {
  deep: "#6366f1",
  rem: "#8b5cf6",
  light: "#3b82f6",
  awake: "#ef4444",
};

export default function SleepPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const { records: sleepRecords, weeklySummaries, lastRecord, stats: sleepStats } = useSleep(dateRange);

  const displayRecord = lastRecord || { score: 0, total: 0, deep: 0, rem: 0, light: 0, awake: 0, bedtime: "--", wake: "--" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading font-bold text-xl text-white">Sleep Analysis</h2>
        <p className="text-sm font-body text-kairos-silver-dark">Sleep stages, quality scoring &amp; trends</p>
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
        <KPICard label="Sleep Score" value={period === "day" ? displayRecord.score : sleepStats.avgScore} unit="/100" trend="up" trendValue="+6 pts" icon={<Moon size={16} />} highlight />
        <KPICard label="Total Sleep" value={period === "day" ? displayRecord.total : sleepStats.avgTotal} unit="hrs" trend="up" trendValue="+0.4h" icon={<Clock size={16} />} />
        <KPICard label="Deep Sleep" value={period === "day" ? displayRecord.deep : sleepStats.avgDeep} unit="hrs" trend="up" trendValue="+12 min" icon={<Brain size={16} />} />
        <KPICard label="REM Sleep" value={period === "day" ? displayRecord.rem : sleepStats.avgRem} unit="hrs" icon={<Zap size={16} />} />
        <KPICard label="Bedtime" value={displayRecord.bedtime} icon={<Moon size={16} />} />
        <KPICard label="Wake" value={displayRecord.wake} icon={<Sun size={16} />} />
      </div>

      {/* DAY VIEW: Sleep stages timeline for one night */}
      {period === "day" && (
        <>
          <div className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-4">Sleep Stages — {formattedRange}</h3>
            <div className="space-y-1">
              {(() => {
                const stages = generateSleepStages(dateRange.startDate);
                const totalMin = stages.reduce((s, b) => s + b.duration, 0);
                return (
                  <div>
                    <div className="flex h-10 rounded-kairos-sm overflow-hidden">
                      {stages.map((block, i) => (
                        <div
                          key={i}
                          style={{
                            width: `${(block.duration / totalMin) * 100}%`,
                            backgroundColor: stageColors[block.stage],
                            opacity: block.stage === "light" ? 0.5 : 1,
                          }}
                          title={`${block.stage}: ${block.duration}min`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-body text-kairos-silver-dark">
                      <span>{displayRecord.bedtime}</span>
                      <span>12:00 AM</span>
                      <span>2:00 AM</span>
                      <span>4:00 AM</span>
                      <span>{displayRecord.wake}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs font-body text-kairos-silver-dark">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: stageColors.deep }} /> Deep</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: stageColors.rem }} /> REM</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm opacity-50" style={{ backgroundColor: stageColors.light }} /> Light</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: stageColors.awake }} /> Awake</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="kairos-card">
              <h3 className="font-heading font-semibold text-white mb-4">Stage Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: "Deep Sleep", value: displayRecord.deep, pct: displayRecord.total > 0 ? Math.round((displayRecord.deep / displayRecord.total) * 100) : 0, color: stageColors.deep, target: "1.5–2.0 hrs" },
                  { label: "REM Sleep", value: displayRecord.rem, pct: displayRecord.total > 0 ? Math.round((displayRecord.rem / displayRecord.total) * 100) : 0, color: stageColors.rem, target: "1.5–2.0 hrs" },
                  { label: "Light Sleep", value: displayRecord.light, pct: displayRecord.total > 0 ? Math.round((displayRecord.light / displayRecord.total) * 100) : 0, color: stageColors.light, target: "3.0–4.0 hrs" },
                  { label: "Awake", value: displayRecord.awake, pct: displayRecord.total > 0 ? Math.round((displayRecord.awake / displayRecord.total) * 100) : 0, color: stageColors.awake, target: "< 30 min" },
                ].map((stage) => (
                  <div key={stage.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-body text-white">{stage.label}</span>
                      <span className="text-sm font-heading font-semibold text-kairos-silver">{stage.value}h ({stage.pct}%)</span>
                    </div>
                    <div className="h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${stage.pct}%`, backgroundColor: stage.color, opacity: stage.label === "Light Sleep" ? 0.5 : 1 }} />
                    </div>
                    <p className="text-[10px] font-body text-kairos-silver-dark mt-0.5">Target: {stage.target}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="kairos-card">
              <h3 className="font-heading font-semibold text-white mb-4">Sleep Insights</h3>
              <div className="space-y-4">
                <div className="flex gap-3 p-3 rounded-kairos-sm bg-green-500/5 border border-green-500/20">
                  <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-body text-white">Deep sleep is above target</p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Your magnesium protocol may be contributing to improved recovery.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-kairos-sm bg-kairos-gold/5 border border-kairos-gold/20">
                  <Moon size={16} className="text-kairos-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-body text-white">Consistent bedtime pattern detected</p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Keeping a consistent bedtime improves circadian rhythm.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-kairos-sm bg-blue-500/5 border border-blue-500/20">
                  <Brain size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-body text-white">HRV correlation positive</p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Nights with &gt;2h deep sleep correlate with 12% higher morning HRV.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* WEEK VIEW: 7-day grid with daily scores */}
      {period === "week" && (
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">{formattedRange} — Daily Sleep Scores</h3>
          <div className="grid grid-cols-7 gap-3">
            {sleepRecords.map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-heading text-kairos-silver-dark mb-2">{day.dateLabel}</p>
                <div className={`rounded-full w-12 h-12 mx-auto flex items-center justify-center border-2 ${
                  day.score >= 85 ? "border-green-400 text-green-400" :
                  day.score >= 70 ? "border-kairos-gold text-kairos-gold" :
                  "border-red-400 text-red-400"
                }`}>
                  <span className="text-sm font-heading font-bold">{day.score}</span>
                </div>
                <p className="text-xs font-body text-kairos-silver mt-2">{day.total}h</p>
                <div className="flex h-16 mt-1 rounded-sm overflow-hidden flex-col">
                  <div style={{ flex: day.deep, backgroundColor: stageColors.deep }} />
                  <div style={{ flex: day.rem, backgroundColor: stageColors.rem }} />
                  <div style={{ flex: day.light, backgroundColor: stageColors.light, opacity: 0.5 }} />
                  <div style={{ flex: day.awake, backgroundColor: stageColors.awake }} />
                </div>
                <p className="text-[9px] font-body text-kairos-silver-dark mt-1">{day.bedtime}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-kairos-border grid grid-cols-4 gap-4 text-center">
            <div><p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Avg Score</p><p className="text-lg font-heading font-bold text-kairos-gold">{sleepStats.avgScore}</p></div>
            <div><p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Avg Total</p><p className="text-lg font-heading font-bold text-white">{sleepStats.avgTotal}h</p></div>
            <div><p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Avg Deep</p><p className="text-lg font-heading font-bold text-white">{sleepStats.avgDeep}h</p></div>
            <div><p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Avg REM</p><p className="text-lg font-heading font-bold text-white">{sleepStats.avgRem}h</p></div>
          </div>
        </div>
      )}

      {/* MONTH VIEW: 4 weekly summary cards */}
      {period === "month" && (
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">{formattedRange} — Weekly Summaries</h3>
          <div className="space-y-4">
            {weeklySummaries.map((week, i) => (
              <div key={i} className="p-4 bg-kairos-royal-surface rounded-kairos-sm border border-kairos-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-heading font-semibold text-white">{week.weekLabel}</span>
                  <div className={`rounded-full w-10 h-10 flex items-center justify-center border-2 ${
                    week.avgScore >= 85 ? "border-green-400 text-green-400" :
                    week.avgScore >= 70 ? "border-kairos-gold text-kairos-gold" :
                    "border-red-400 text-red-400"
                  }`}>
                    <span className="text-xs font-heading font-bold">{week.avgScore}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Total</p>
                    <p className="text-sm font-heading font-bold text-white">{week.avgTotal}h</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Deep</p>
                    <p className="text-sm font-heading font-bold text-white">{week.avgDeep}h</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">REM</p>
                    <p className="text-sm font-heading font-bold text-white">{week.avgRem}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
