"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  Heart,
  Plus,
  X,
  Trash2,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bluetooth,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// BP Category helpers (AHA guidelines)
// ---------------------------------------------------------------------------

type BPCategory = "Normal" | "Elevated" | "Stage 1" | "Stage 2" | "Crisis";

function getBPCategory(systolic: number, diastolic: number): BPCategory {
  if (systolic > 180 || diastolic > 120) return "Crisis";
  if (systolic >= 140 || diastolic >= 90) return "Stage 2";
  if (systolic >= 130 || diastolic >= 80) return "Stage 1";
  if (systolic >= 120 && diastolic < 80) return "Elevated";
  return "Normal";
}

const categoryStyles: Record<BPCategory, string> = {
  Normal: "bg-green-500/15 text-green-400",
  Elevated: "bg-yellow-500/15 text-yellow-400",
  "Stage 1": "bg-orange-500/15 text-orange-400",
  "Stage 2": "bg-red-500/15 text-red-400",
  Crisis: "bg-red-900/25 text-red-300",
};

function CategoryBadge({ systolic, diastolic }: { systolic: number; diastolic: number }) {
  const cat = getBPCategory(systolic, diastolic);
  return (
    <span
      className={cn(
        "text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        categoryStyles[cat],
      )}
    >
      {cat}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BloodPressurePage() {
  const {
    period,
    setPeriod,
    dateRange,
    formattedRange,
    isCurrent,
    canForward,
    goBack,
    goForward,
    goToToday,
  } = useDateRange({ initialPeriod: "week" });

  // ---- tRPC queries ----
  const queryRange = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const historyQuery = trpc.clientPortal.bloodPressure.getHistory.useQuery(queryRange);
  const latestQuery = trpc.clientPortal.bloodPressure.getLatest.useQuery();
  const averagesQuery = trpc.clientPortal.bloodPressure.getAverages.useQuery(queryRange);

  // ---- tRPC mutations ----
  const utils = trpc.useUtils();
  const addMutation = trpc.clientPortal.bloodPressure.add.useMutation({
    onSuccess: () => {
      utils.clientPortal.bloodPressure.getHistory.invalidate();
      utils.clientPortal.bloodPressure.getLatest.invalidate();
      utils.clientPortal.bloodPressure.getAverages.invalidate();
    },
  });
  const deleteMutation = trpc.clientPortal.bloodPressure.delete.useMutation({
    onSuccess: () => {
      utils.clientPortal.bloodPressure.getHistory.invalidate();
      utils.clientPortal.bloodPressure.getLatest.invalidate();
      utils.clientPortal.bloodPressure.getAverages.invalidate();
    },
  });

  // ---- Derived data ----
  const latest = latestQuery.data ?? null;
  const averages = averagesQuery.data ?? null;
  const readings = useMemo(
    () => [...(historyQuery.data ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [historyQuery.data],
  );

  // ---- Form state ----
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    systolic: "",
    diastolic: "",
    pulse: "",
    position: "sitting" as "sitting" | "standing" | "lying",
    arm: "left" as "left" | "right",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      systolic: "",
      diastolic: "",
      pulse: "",
      position: "sitting",
      arm: "left",
      notes: "",
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.systolic || !formData.diastolic) {
      alert("Please enter both systolic and diastolic values");
      return;
    }
    const sys = parseInt(formData.systolic, 10);
    const dia = parseInt(formData.diastolic, 10);
    if (isNaN(sys) || isNaN(dia)) {
      alert("Please enter valid numbers for systolic and diastolic");
      return;
    }
    try {
      await addMutation.mutateAsync({
        date: formData.date,
        systolic: sys,
        diastolic: dia,
        pulse: formData.pulse ? parseInt(formData.pulse, 10) : undefined,
        position: formData.position,
        arm: formData.arm,
        notes: formData.notes || undefined,
        source: "manual",
      });
      setShowForm(false);
      resetForm();
    } catch {
      alert("Failed to save reading. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      alert("Failed to delete reading.");
    }
  };

  // ---- Chart helpers ----
  const chartWidth = 800;
  const chartHeight = 240;
  const pad = { top: 15, right: 15, bottom: 35, left: 45 };
  const plotW = chartWidth - pad.left - pad.right;
  const plotH = chartHeight - pad.top - pad.bottom;
  const yMin = 50;
  const yMax = 200;
  const toY = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const sortedForChart = useMemo(
    () => [...(historyQuery.data ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [historyQuery.data],
  );

  const hasReadings = readings.length > 0;

  // ---- Render ----
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Blood Pressure</h2>
          <p className="text-sm font-body text-kairos-silver-dark">Track and monitor your cardiovascular health</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="kairos-btn-gold flex items-center gap-2">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close" : "Add Reading"}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Add Reading Form (expandable) */}
      {/* ------------------------------------------------------------------ */}
      {showForm && (
        <div className="kairos-card border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add Blood Pressure Reading</h3>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-kairos-silver-dark hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInput}
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Systolic / Diastolic / Pulse row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">
                  Systolic <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="systolic"
                  value={formData.systolic}
                  onChange={handleInput}
                  placeholder="120"
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">
                  Diastolic <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="diastolic"
                  value={formData.diastolic}
                  onChange={handleInput}
                  placeholder="80"
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-kairos-silver-dark mb-2">Pulse</label>
                <input
                  type="number"
                  name="pulse"
                  value={formData.pulse}
                  onChange={handleInput}
                  placeholder="72"
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Position</label>
              <div className="flex gap-4">
                {(["sitting", "standing", "lying"] as const).map((pos) => (
                  <label key={pos} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="position"
                      value={pos}
                      checked={formData.position === pos}
                      onChange={() => setFormData((prev) => ({ ...prev, position: pos }))}
                      className="accent-kairos-gold"
                    />
                    <span className="text-sm font-body text-white capitalize">{pos}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Arm toggle */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Arm</label>
              <div className="inline-flex bg-kairos-royal-surface rounded-kairos-sm border border-kairos-border">
                {(["left", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, arm: a }))}
                    className={cn(
                      "px-4 py-2 text-sm font-heading font-semibold transition-colors capitalize",
                      formData.arm === a
                        ? "bg-kairos-gold text-kairos-royal-dark"
                        : "text-kairos-silver-dark hover:text-white",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInput}
                placeholder="e.g., after exercise, feeling stressed..."
                rows={3}
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={addMutation.isPending}
                className="kairos-btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addMutation.isPending ? "Saving..." : "Save Reading"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={addMutation.isPending}
                className="kairos-btn-outline flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date range navigator */}
      <DateRangeNavigator
        availablePeriods={["week", "month", "quarter"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* ================================================================= */}
      {/* Empty state */}
      {/* ================================================================= */}
      {!hasReadings && !historyQuery.isLoading && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-4">
            <Heart size={32} className="text-kairos-gold" />
          </div>
          <h3 className="font-heading font-semibold text-white text-lg mb-2">No blood pressure readings yet</h3>
          <p className="text-sm font-body text-kairos-silver-dark max-w-sm mb-6">
            Start tracking your blood pressure to monitor trends and receive insights about your cardiovascular health.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="kairos-btn-gold flex items-center gap-2"
          >
            <Plus size={18} />
            Add Your First Reading
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* Summary cards */}
      {/* ================================================================= */}
      {hasReadings && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Latest Reading */}
            <div className="kairos-card border border-kairos-border">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={16} className="text-kairos-gold" />
                <span className="text-xs font-heading text-kairos-silver-dark">Latest Reading</span>
              </div>
              {latest ? (
                <>
                  <p className="text-2xl font-heading font-bold text-white">
                    {latest.systolic}/{latest.diastolic}
                    <span className="text-xs font-body text-kairos-silver-dark ml-1">mmHg</span>
                  </p>
                  <div className="mt-2">
                    <CategoryBadge systolic={latest.systolic} diastolic={latest.diastolic} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-kairos-silver-dark">--</p>
              )}
            </div>

            {/* Avg Systolic */}
            <div className="kairos-card border border-kairos-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-400" />
                <span className="text-xs font-heading text-kairos-silver-dark">Avg Systolic</span>
              </div>
              <p className="text-2xl font-heading font-bold text-white">
                {averages ? Math.round(averages.avgSystolic) : "--"}
                <span className="text-xs font-body text-kairos-silver-dark ml-1">mmHg</span>
              </p>
              {averages && (
                <p className="text-[10px] font-body text-kairos-silver-dark mt-1">
                  Range: {averages.minSystolic}&ndash;{averages.maxSystolic}
                </p>
              )}
            </div>

            {/* Avg Diastolic */}
            <div className="kairos-card border border-kairos-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-green-400" />
                <span className="text-xs font-heading text-kairos-silver-dark">Avg Diastolic</span>
              </div>
              <p className="text-2xl font-heading font-bold text-white">
                {averages ? Math.round(averages.avgDiastolic) : "--"}
                <span className="text-xs font-body text-kairos-silver-dark ml-1">mmHg</span>
              </p>
              {averages && (
                <p className="text-[10px] font-body text-kairos-silver-dark mt-1">
                  {averages.count} reading{averages.count !== 1 ? "s" : ""} this period
                </p>
              )}
            </div>

            {/* Pulse */}
            <div className="kairos-card border border-kairos-border">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-rose-400" />
                <span className="text-xs font-heading text-kairos-silver-dark">Pulse</span>
              </div>
              <p className="text-2xl font-heading font-bold text-white">
                {latest?.pulse != null ? latest.pulse : averages?.avgPulse != null ? Math.round(averages.avgPulse) : "--"}
                <span className="text-xs font-body text-kairos-silver-dark ml-1">bpm</span>
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark mt-1">Latest reading</p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* Trend Chart (SVG) */}
          {/* ================================================================= */}
          <div className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-4">
              {formattedRange} &mdash; Blood Pressure Trend
            </h3>

            {sortedForChart.length < 2 ? (
              <p className="text-sm font-body text-kairos-silver-dark py-8 text-center">
                At least two readings are needed to display the trend chart.
              </p>
            ) : (
              <>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" aria-label="Blood pressure trend chart">
                  {/* Normal systolic band 90-120 */}
                  <rect
                    x={pad.left}
                    y={toY(120)}
                    width={plotW}
                    height={toY(90) - toY(120)}
                    fill="rgba(59,130,246,0.06)"
                  />
                  {/* Normal diastolic band 60-80 */}
                  <rect
                    x={pad.left}
                    y={toY(80)}
                    width={plotW}
                    height={toY(60) - toY(80)}
                    fill="rgba(34,197,94,0.06)"
                  />

                  {/* Horizontal grid lines */}
                  {[60, 80, 100, 120, 140, 160, 180].map((v) => (
                    <g key={v}>
                      <line
                        x1={pad.left}
                        y1={toY(v)}
                        x2={pad.left + plotW}
                        y2={toY(v)}
                        stroke="rgba(30,42,90,0.4)"
                        strokeDasharray={v === 120 || v === 80 ? "4 2" : undefined}
                      />
                      <text
                        x={pad.left - 6}
                        y={toY(v) + 3}
                        textAnchor="end"
                        className="fill-kairos-silver-dark text-[9px]"
                      >
                        {v}
                      </text>
                    </g>
                  ))}

                  {/* Systolic line (blue) */}
                  <polyline
                    points={sortedForChart
                      .map((d, i) => {
                        const x = pad.left + (i / (sortedForChart.length - 1)) * plotW;
                        const y = toY(d.systolic);
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Diastolic line (green) */}
                  <polyline
                    points={sortedForChart
                      .map((d, i) => {
                        const x = pad.left + (i / (sortedForChart.length - 1)) * plotW;
                        const y = toY(d.diastolic);
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Data points */}
                  {sortedForChart.map((d, i) => {
                    const x = pad.left + (i / (sortedForChart.length - 1)) * plotW;
                    return (
                      <g key={d.id}>
                        <circle cx={x} cy={toY(d.systolic)} r="3" fill="#3b82f6" />
                        <circle cx={x} cy={toY(d.diastolic)} r="3" fill="#22c55e" />
                      </g>
                    );
                  })}

                  {/* X-axis date labels */}
                  {sortedForChart.map((d, i) => {
                    // Show a limited number of labels to avoid overlap
                    const step = Math.max(1, Math.floor(sortedForChart.length / 7));
                    if (i % step !== 0 && i !== sortedForChart.length - 1) return null;
                    const x = pad.left + (i / (sortedForChart.length - 1)) * plotW;
                    const dateObj = new Date(d.date);
                    const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                    return (
                      <text
                        key={`label-${i}`}
                        x={x}
                        y={chartHeight - 5}
                        textAnchor="middle"
                        className="fill-kairos-silver-dark text-[9px]"
                      >
                        {label}
                      </text>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-3 text-xs font-body text-kairos-silver-dark">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 inline-block bg-blue-500 rounded" />
                    Systolic
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 inline-block bg-green-500 rounded" />
                    Diastolic
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 inline-block rounded-sm border border-blue-500/30" style={{ backgroundColor: "rgba(59,130,246,0.06)" }} />
                    Normal Systolic (90&ndash;120)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 inline-block rounded-sm border border-green-500/30" style={{ backgroundColor: "rgba(34,197,94,0.06)" }} />
                    Normal Diastolic (60&ndash;80)
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ================================================================= */}
          {/* Reading History Table */}
          {/* ================================================================= */}
          <div className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-4">Reading History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-kairos-border text-kairos-silver-dark text-left">
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Date</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Sys/Dia</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Pulse</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Category</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Position</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Arm</th>
                    <th className="pb-3 pr-4 font-heading font-semibold text-xs">Notes</th>
                    <th className="pb-3 font-heading font-semibold text-xs w-10" />
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => {
                    const dateObj = new Date(r.date);
                    const dateStr = dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    return (
                      <tr key={r.id} className="border-b border-kairos-border/50 hover:bg-kairos-royal-surface/50 transition-colors">
                        <td className="py-3 pr-4 text-white whitespace-nowrap">{dateStr}</td>
                        <td className="py-3 pr-4 text-white font-heading font-semibold">
                          {r.systolic}/{r.diastolic}
                        </td>
                        <td className="py-3 pr-4 text-kairos-silver-dark">{r.pulse ?? "--"}</td>
                        <td className="py-3 pr-4">
                          <CategoryBadge systolic={r.systolic} diastolic={r.diastolic} />
                        </td>
                        <td className="py-3 pr-4 text-kairos-silver-dark capitalize">{r.position ?? "--"}</td>
                        <td className="py-3 pr-4 text-kairos-silver-dark capitalize">{r.arm ?? "--"}</td>
                        <td className="py-3 pr-4 text-kairos-silver-dark max-w-[160px] truncate">
                          {r.notes || "--"}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-kairos-sm text-kairos-silver-dark hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            aria-label="Delete reading"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Device Sync Placeholder */}
      {/* ================================================================= */}
      <div className="kairos-card border border-kairos-border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-kairos-gold/10 flex items-center justify-center flex-shrink-0">
            <Bluetooth size={24} className="text-kairos-gold" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-heading font-semibold text-white">Connect a BP Monitor</h3>
              <span className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full bg-kairos-gold/15 text-kairos-gold">
                Coming Soon
              </span>
            </div>
            <p className="text-sm font-body text-kairos-silver-dark mb-4">
              Automatically sync your blood pressure readings from supported devices. No more manual entry &mdash;
              just take a measurement and it appears here.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-2 rounded-kairos-sm bg-kairos-royal-surface border border-kairos-border">
                <span className="text-sm font-heading font-semibold text-white">Withings</span>
                <span className="text-[9px] font-body text-kairos-silver-dark">BPM Connect / Core</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-kairos-sm bg-kairos-royal-surface border border-kairos-border">
                <span className="text-sm font-heading font-semibold text-white">Omron</span>
                <span className="text-[9px] font-body text-kairos-silver-dark">Evolv / Platinum</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
