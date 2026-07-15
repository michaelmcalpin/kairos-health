"use client";

import { useState } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useGlucose } from "@/hooks/client/useGlucose";
import { useThemeColors } from "@/lib/theme";
import { trpc } from "@/lib/trpc";
import { Droplets, TrendingDown, TrendingUp, Clock, Target, AlertTriangle, Plus, X } from "lucide-react";

export default function GlucosePage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const { readings: rawReadings, dailySummaries, weeklySummaries, stats, isError, refetch } = useGlucose(dateRange);
  const themeColors = useThemeColors();

  const utils = trpc.useUtils();

  // tRPC mutation
  const createGlucose = trpc.clientPortal.glucose.create.useMutation();

  // Error/validation state for inline feedback
  const [formError, setFormError] = useState<string | null>(null);

  // Manual entry form state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    glucose: "",
    timing: "fasting",
    mealDescription: "",
    notes: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setFormError(null);

    // Validate required fields
    if (!formData.glucose) {
      setFormError("Please enter a glucose value.");
      return;
    }

    const glucoseValue = parseFloat(formData.glucose);
    if (isNaN(glucoseValue)) {
      setFormError("Please enter a valid number for glucose.");
      return;
    }

    // Combine date and time into ISO timestamp
    const dateTimeString = `${formData.date}T${formData.time}:00`;
    const timestamp = new Date(dateTimeString).toISOString();

    // Map timing context: convert form values to tRPC mutation values
    let timingContext: "fasting" | "pre_meal" | "post_meal" | "bedtime" | "waking" | "other" = "other";
    if (formData.timing === "fasting") timingContext = "fasting";
    else if (formData.timing === "pre-meal") timingContext = "pre_meal";
    else if (formData.timing === "post-meal-1hr" || formData.timing === "post-meal-2hr") timingContext = "post_meal";
    else if (formData.timing === "bedtime") timingContext = "bedtime";
    else timingContext = "other";

    try {
      await createGlucose.mutateAsync({
        valueMgdl: glucoseValue,
        timestamp,
        timingContext,
        notes: formData.notes || undefined,
        source: formData.mealDescription || undefined,
      });

      // Invalidate cache so new reading appears immediately
      utils.clientPortal.glucose.list.invalidate();
      utils.clientPortal.glucose.stats.invalidate();
      utils.clientPortal.glucose.dailyAverages.invalidate();

      // Close modal and reset form on success
      setShowManualEntry(false);
      setFormError(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        glucose: "",
        timing: "fasting",
        mealDescription: "",
        notes: "",
      });
    } catch {
      setFormError("Failed to save glucose reading. Please try again.");
    }
  };

  const handleCancel = () => {
    setShowManualEntry(false);
    setFormError(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      glucose: "",
      timing: "fasting",
      mealDescription: "",
      notes: "",
    });
  };

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

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load glucose data</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your glucose readings. Please try again.
          </p>
          <button onClick={() => refetch()} className="kairos-btn-gold text-sm px-6 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Glucose Monitoring</h2>
          <p className="text-sm font-body text-kairos-silver-dark">Continuous glucose tracking &amp; analysis</p>
        </div>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="kairos-btn-gold flex items-center gap-2"
        >
          <Plus size={18} />
          Add Reading
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className="kairos-card border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add Glucose Reading</h3>
            <button
              onClick={handleCancel}
              className="text-kairos-silver-dark hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Glucose Value */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Glucose Value (mg/dL)</label>
              <input
                type="number"
                name="glucose"
                value={formData.glucose}
                onChange={handleInputChange}
                placeholder="120"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Timing Context */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Timing Context</label>
              <select
                name="timing"
                value={formData.timing}
                onChange={handleInputChange}
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              >
                <option value="fasting">Fasting</option>
                <option value="pre-meal">Pre-meal</option>
                <option value="post-meal-1hr">Post-meal (1 hour)</option>
                <option value="post-meal-2hr">Post-meal (2 hours)</option>
                <option value="bedtime">Bedtime</option>
                <option value="random">Random</option>
              </select>
            </div>

            {/* Meal Description */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Meal Description (optional)</label>
              <input
                type="text"
                name="mealDescription"
                value={formData.mealDescription}
                onChange={handleInputChange}
                placeholder="e.g., Breakfast with eggs and toast"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any additional context..."
                rows={3}
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full resize-none"
              />
            </div>

            {/* Inline error message */}
            {formError && (
              <div className="p-3 rounded-kairos-sm bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                {formError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={createGlucose.isPending}
                className="kairos-btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createGlucose.isPending ? "Saving..." : "Save Reading"}
              </button>
              <button
                onClick={handleCancel}
                disabled={createGlucose.isPending}
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
        <KPICard label="Current" value={stats.current} unit="mg/dL" icon={<Droplets size={16} />} highlight />
        <KPICard label="Average" value={stats.avg} unit="mg/dL" trend="flat" trendValue={formattedRange} />
        <KPICard label="High" value={stats.max} unit="mg/dL" icon={<TrendingUp size={16} />} />
        <KPICard label="Low" value={stats.min} unit="mg/dL" icon={<TrendingDown size={16} />} />
        <KPICard label="Time in Range" value={stats.timeInRange} unit="%" icon={<Target size={16} />} highlight />
        <KPICard label="Est. A1C" value={stats.avg ? ((Number(stats.avg) + 46.7) / 28.7).toFixed(1) : "---"} unit="%" trend="flat" trendValue="estimated" icon={<Clock size={16} />} />
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
                const x = padding.left + (rawReadings.length > 1 ? (i / (rawReadings.length - 1)) * plotW : plotW / 2);
                const y = padding.top + plotH - ((d.value - yMin) / (yMax - yMin)) * plotH;
                return `${x},${y}`;
              }).join(" ")}
              fill="none" stroke={themeColors.accent} strokeWidth="1.5" strokeLinejoin="round"
            />
            {rawReadings
              .filter((_, i) => i % Math.max(1, Math.floor(rawReadings.length / 6)) === 0)
              .map((d, idx) => {
                const origIdx = rawReadings.indexOf(d);
                const x = padding.left + (rawReadings.length > 1 ? (origIdx / (rawReadings.length - 1)) * plotW : plotW / 2);
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
          <h3 className="font-heading font-semibold text-white mb-4">Recent Readings</h3>
          <div className="space-y-3">
            {rawReadings.length === 0 ? (
              <p className="text-sm font-body text-kairos-silver-dark py-4 text-center">No glucose readings for this period.</p>
            ) : (
              rawReadings.slice(-5).reverse().map((r, i) => {
                const val = Number(r.value);
                const status = val >= 70 && val <= 100 ? "optimal"
                  : val <= 140 ? "normal"
                  : val <= 160 ? "warning"
                  : "elevated";
                return (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <span className="text-xs font-body text-kairos-gold w-16 flex-shrink-0">{r.time}</span>
                    <div className="flex-1"><p className="text-sm font-body text-white">Glucose reading</p></div>
                    <span className={`text-xs font-heading font-semibold px-2 py-0.5 rounded-full ${
                      status === "optimal" ? "bg-green-500/15 text-green-400" :
                      status === "warning" ? "bg-yellow-500/15 text-yellow-400" :
                      status === "elevated" ? "bg-red-500/15 text-red-400" :
                      "bg-kairos-silver/10 text-kairos-silver"
                    }`}>{val} mg/dL</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Glucose Summary</h3>
          <div className="space-y-4">
            {stats.timeInRange > 0 && (
              <div className={`flex gap-3 p-3 rounded-kairos-sm ${stats.timeInRange >= 70 ? "bg-green-500/5 border border-green-500/20" : "bg-yellow-500/5 border border-yellow-500/20"}`}>
                <Target size={16} className={`${stats.timeInRange >= 70 ? "text-green-400" : "text-yellow-400"} mt-0.5 flex-shrink-0`} />
                <div>
                  <p className="text-sm font-body text-white">Time in range: {stats.timeInRange}%</p>
                  <p className="text-xs font-body text-kairos-silver-dark mt-0.5">{stats.timeInRange >= 70 ? "Within the recommended target of 70%+ time in range." : "Below the recommended target of 70%+ time in range."}</p>
                </div>
              </div>
            )}
            {stats.avg ? (
              <div className="flex gap-3 p-3 rounded-kairos-sm bg-kairos-gold/5 border border-kairos-gold/20">
                <TrendingDown size={16} className="text-kairos-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-body text-white">Estimated A1C: {((Number(stats.avg) + 46.7) / 28.7).toFixed(1)}%</p>
                  <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Calculated from your average glucose readings using the ADAG formula. Discuss with your provider for clinical interpretation.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 p-3 rounded-kairos-sm bg-kairos-silver/5 border border-kairos-silver/20">
                <Target size={16} className="text-kairos-silver mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-body text-white">No glucose data yet</p>
                  <p className="text-xs font-body text-kairos-silver-dark mt-0.5">Log readings manually or connect a CGM to see insights here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
