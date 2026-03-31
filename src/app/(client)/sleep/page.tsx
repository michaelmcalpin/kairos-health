"use client";

import { useState, useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useSleep } from "@/hooks/client/useSleep";
import { Moon, Clock, Zap, Brain, TrendingUp, Sun, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Sleep stages generator (deterministic by date) ─────────────
interface SleepStageBlock { stage: string; duration: number; }

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const BASE_STAGES: SleepStageBlock[] = [
  { stage: "light", duration: 25 }, { stage: "deep", duration: 35 },
  { stage: "light", duration: 15 }, { stage: "rem", duration: 20 },
  { stage: "light", duration: 10 }, { stage: "awake", duration: 5 },
  { stage: "light", duration: 20 }, { stage: "deep", duration: 40 },
  { stage: "light", duration: 15 }, { stage: "rem", duration: 25 },
  { stage: "light", duration: 20 }, { stage: "deep", duration: 30 },
  { stage: "rem", duration: 20 }, { stage: "light", duration: 30 },
  { stage: "awake", duration: 5 }, { stage: "light", duration: 20 },
  { stage: "rem", duration: 25 }, { stage: "light", duration: 25 },
  { stage: "awake", duration: 5 }, { stage: "light", duration: 20 },
];

function generateSleepStages(dateRef: Date): SleepStageBlock[] {
  const seed = dateRef.getFullYear() * 10000 + (dateRef.getMonth() + 1) * 100 + dateRef.getDate();
  return BASE_STAGES.map((block, i) => {
    const jitter = Math.round((seededRandom(seed + i * 3) - 0.5) * 10);
    return { stage: block.stage, duration: Math.max(2, block.duration + jitter) };
  });
}

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

  // tRPC mutation for creating sleep entry
  const createSleep = trpc.clientPortal.sleep.create.useMutation();

  // Manual sleep entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: "22:00",
    wakeTime: "06:00",
    totalSleep: "",
    deepSleep: "",
    remSleep: "",
    sleepQuality: 75,
    notes: "",
  });

  // Auto-calculate total sleep hours when bedtime/wake time changes
  const calculatedTotalSleep = useMemo(() => {
    if (!formData.bedtime || !formData.wakeTime) return "";
    const [bedHour, bedMin] = formData.bedtime.split(":").map(Number);
    const [wakeHour, wakeMin] = formData.wakeTime.split(":").map(Number);

    let bedTimeInMin = bedHour * 60 + bedMin;
    let wakeTimeInMin = wakeHour * 60 + wakeMin;

    if (wakeTimeInMin <= bedTimeInMin) {
      wakeTimeInMin += 24 * 60;
    }

    const diffMin = wakeTimeInMin - bedTimeInMin;
    return (diffMin / 60).toFixed(1);
  }, [formData.bedtime, formData.wakeTime]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, sleepQuality: parseInt(e.target.value) }));
  };

  const handleSaveEntry = async () => {
    try {
      // Prepare data for mutation - convert hours (string/number) to minutes
      const totalMinutes = formData.totalSleep
        ? Math.round(parseFloat(formData.totalSleep) * 60)
        : Math.round(parseFloat(calculatedTotalSleep || "0") * 60);

      const deepMinutes = formData.deepSleep
        ? Math.round(parseFloat(formData.deepSleep) * 60)
        : undefined;

      const remMinutes = formData.remSleep
        ? Math.round(parseFloat(formData.remSleep) * 60)
        : undefined;

      await createSleep.mutateAsync({
        date: formData.date,
        bedtime: formData.bedtime,
        wakeTime: formData.wakeTime,
        totalMinutes: totalMinutes,
        deepMinutes: deepMinutes,
        remMinutes: remMinutes,
        score: formData.sleepQuality,
        notes: formData.notes || undefined,
      });

      // Show success feedback
      setSaveSuccess(true);

      // Reset form and close modal
      setShowManualEntry(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bedtime: "22:00",
        wakeTime: "06:00",
        totalSleep: "",
        deepSleep: "",
        remSleep: "",
        sleepQuality: 75,
        notes: "",
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving sleep entry:", error);
    }
  };

  const handleCancel = () => {
    setShowManualEntry(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      bedtime: "22:00",
      wakeTime: "06:00",
      totalSleep: "",
      deepSleep: "",
      remSleep: "",
      sleepQuality: 75,
      notes: "",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Sleep Analysis</h2>
          <p className="text-sm font-body text-kairos-silver-dark">Sleep stages, quality scoring &amp; trends</p>
        </div>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="kairos-btn-gold flex items-center gap-2"
        >
          <Plus size={18} />
          Add Sleep Entry
        </button>
      </div>

      {/* Success Toast */}
      {saveSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-kairos-sm text-green-400 font-body text-sm">
          Sleep entry saved successfully!
        </div>
      )}

      {/* Manual Sleep Entry Form */}
      {showManualEntry && (
        <div className="kairos-card border border-kairos-gold/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add Sleep Entry</h3>
            <button onClick={handleCancel} className="text-kairos-silver-dark hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date and Times Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Bedtime</label>
                <input
                  type="time"
                  name="bedtime"
                  value={formData.bedtime}
                  onChange={handleInputChange}
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Wake Time</label>
                <input
                  type="time"
                  name="wakeTime"
                  value={formData.wakeTime}
                  onChange={handleInputChange}
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Sleep Hours Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">
                  Total Sleep Hours
                  {calculatedTotalSleep && <span className="text-kairos-gold text-xs ml-1">(calculated: {calculatedTotalSleep}h)</span>}
                </label>
                <input
                  type="number"
                  name="totalSleep"
                  placeholder={calculatedTotalSleep || "0.0"}
                  value={formData.totalSleep}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="24"
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Deep Sleep Hours</label>
                <input
                  type="number"
                  name="deepSleep"
                  placeholder="0.0"
                  value={formData.deepSleep}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="24"
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">REM Sleep Hours</label>
                <input
                  type="number"
                  name="remSleep"
                  placeholder="0.0"
                  value={formData.remSleep}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="24"
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Sleep Quality Slider */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">
                Sleep Quality Score: <span className="text-kairos-gold font-semibold">{formData.sleepQuality}/100</span>
              </label>
              <input
                type="range"
                name="sleepQuality"
                min="1"
                max="100"
                value={formData.sleepQuality}
                onChange={handleSliderChange}
                className="w-full cursor-pointer accent-kairos-gold"
              />
              <div className="flex justify-between text-xs font-body text-kairos-silver-dark mt-1">
                <span>Poor</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any notes about your sleep (e.g., stress level, environment, supplements taken)..."
                rows={3}
                className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveEntry}
                disabled={createSleep.isPending}
                className="kairos-btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSleep.isPending ? "Saving..." : "Save Entry"}
              </button>
              <button
                onClick={handleCancel}
                disabled={createSleep.isPending}
                className="kairos-btn-outline flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
