"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Ruler,
  Activity,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Camera,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawMeasurement {
  id: string;
  date: string;
  weightLbs: number | null;
  bodyFatPct: number | null;
  waistInches: number | null;
  chestInches: number | null;
  hipsInches: number | null;
  rightBicepInches: number | null;
  leftBicepInches: number | null;
  rightThighInches: number | null;
  leftThighInches: number | null;
  rightCalfInches: number | null;
  leftCalfInches: number | null;
  neckInches: number | null;
  shouldersInches: number | null;
  source: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcBmi(weightLbs: number, heightIn: number): number {
  if (!heightIn || !weightLbs) return 0;
  return (weightLbs / (heightIn * heightIn)) * 703;
}

function calcLeanMass(weightLbs: number, bodyFatPct: number): number {
  return weightLbs * (1 - bodyFatPct / 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function trendDir(current: number, previous: number): "up" | "down" | "flat" {
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "flat";
  return diff > 0 ? "up" : "down";
}

function signed(n: number, decimals = 1): string {
  const v = Number(n.toFixed(decimals));
  return v > 0 ? `+${v}` : `${v}`;
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  unit,
  icon,
  trend,
  changeText,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "flat";
  changeText: string;
}) {
  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trend === "flat"
      ? "text-gray-400"
      : label === "Lean Mass"
        ? trend === "up"
          ? "text-green-400"
          : "text-red-400"
        : trend === "down"
          ? "text-green-400"
          : "text-red-400";

  return (
    <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
      <div className="flex items-start justify-between mb-3">
        <div className="text-kairos-gold">{icon}</div>
        <div className={cn("flex items-center gap-1 text-xs font-body", trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span>{changeText}</span>
        </div>
      </div>
      <p className="text-xs font-body text-kairos-silver-dark mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm font-body text-kairos-silver-dark">{unit}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (tiny SVG for circumference cards)
// ---------------------------------------------------------------------------

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 3) return null;
  const w = 60;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block">
      <polyline
        points={pts.join(" ")}
        fill="none"
        className="stroke-kairos-gold"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Circumference Card (single site)
// ---------------------------------------------------------------------------

function CircCard({
  label,
  current,
  previous,
  history,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  history: (number | null)[];
}) {
  const valid = history.filter((v): v is number => v != null);
  const change =
    current != null && previous != null ? current - previous : null;

  return (
    <div className="kairos-card p-4 rounded-kairos-sm border border-kairos-border">
      <p className="text-xs font-body text-kairos-silver-dark mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-lg font-bold text-white">
          {current != null ? current.toFixed(1) : "--"}
        </span>
        <span className="text-xs text-kairos-silver-dark">in</span>
      </div>
      {change != null && (
        <p
          className={cn(
            "text-xs font-body",
            Math.abs(change) < 0.05
              ? "text-gray-400"
              : change < 0
                ? "text-green-400"
                : "text-amber-400",
          )}
        >
          {signed(change)} in
        </p>
      )}
      <Sparkline values={valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paired Circumference Card (L/R)
// ---------------------------------------------------------------------------

function PairedCircCard({
  label,
  leftCurrent,
  rightCurrent,
  leftPrev,
  rightPrev,
  leftHistory,
  rightHistory,
}: {
  label: string;
  leftCurrent: number | null;
  rightCurrent: number | null;
  leftPrev: number | null;
  rightPrev: number | null;
  leftHistory: (number | null)[];
  rightHistory: (number | null)[];
}) {
  const diff =
    leftCurrent != null && rightCurrent != null
      ? Math.abs(leftCurrent - rightCurrent)
      : null;
  const asymmetric = diff != null && diff > 0.5;

  const leftChange =
    leftCurrent != null && leftPrev != null ? leftCurrent - leftPrev : null;
  const rightChange =
    rightCurrent != null && rightPrev != null ? rightCurrent - rightPrev : null;

  const leftValid = leftHistory.filter((v): v is number => v != null);
  const rightValid = rightHistory.filter((v): v is number => v != null);

  return (
    <div
      className={cn(
        "kairos-card p-4 rounded-kairos-sm border",
        asymmetric ? "border-amber-500/60" : "border-kairos-border",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-body text-kairos-silver-dark">{label}</p>
        {asymmetric && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-body">
            <AlertTriangle className="w-3 h-3" />
            {diff!.toFixed(1)}&quot; diff
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Left */}
        <div>
          <p className="text-[10px] text-kairos-silver-dark mb-0.5">L</p>
          <span className="text-lg font-bold text-white">
            {leftCurrent != null ? leftCurrent.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-kairos-silver-dark ml-1">in</span>
          {leftChange != null && (
            <p className="text-xs text-gray-400">{signed(leftChange)} in</p>
          )}
          <Sparkline values={leftValid} />
        </div>
        {/* Right */}
        <div>
          <p className="text-[10px] text-kairos-silver-dark mb-0.5">R</p>
          <span className="text-lg font-bold text-white">
            {rightCurrent != null ? rightCurrent.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-kairos-silver-dark ml-1">in</span>
          {rightChange != null && (
            <p className="text-xs text-gray-400">{signed(rightChange)} in</p>
          )}
          <Sparkline values={rightValid} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weight Trend Chart (SVG)
// ---------------------------------------------------------------------------

function WeightTrendChart({
  measurements,
  label,
}: {
  measurements: RawMeasurement[];
  label: string;
}) {
  const entries = useMemo(
    () =>
      [...measurements]
        .filter((m) => m.weightLbs != null)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [measurements],
  );
  if (entries.length === 0) return null;

  const weights = entries.map((e) => e.weightLbs!);
  const minW = Math.floor(Math.min(...weights)) - 2;
  const maxW = Math.ceil(Math.max(...weights)) + 2;
  const range = maxW - minW || 1;

  const chartW = 500;
  const chartH = 160;
  const pad = { top: 20, right: 10, bottom: 30, left: 40 };

  const pts = weights.map((w, i) => ({
    x: pad.left + (i / Math.max(weights.length - 1, 1)) * (chartW - pad.left - pad.right),
    y: pad.top + (1 - (w - minW) / range) * (chartH - pad.top - pad.bottom),
    v: w,
  }));

  // Target band: +/- 3% of mean
  const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
  const bandTop =
    pad.top + (1 - (mean * 1.015 - minW) / range) * (chartH - pad.top - pad.bottom);
  const bandBot =
    pad.top + (1 - (mean * 0.985 - minW) / range) * (chartH - pad.top - pad.bottom);

  return (
    <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
      <h2 className="text-lg font-bold font-heading text-white mb-4">
        Weight Trend &mdash; {label}
      </h2>
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full max-w-2xl"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* target band */}
          <rect
            x={pad.left}
            y={bandTop}
            width={chartW - pad.left - pad.right}
            height={Math.max(bandBot - bandTop, 1)}
            className="fill-green-900/20"
            rx={4}
          />
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y =
              pad.top + (1 - pct) * (chartH - pad.top - pad.bottom);
            const val = (minW + pct * range).toFixed(0);
            return (
              <g key={pct}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={chartW - pad.right}
                  y2={y}
                  className="stroke-kairos-border"
                  strokeWidth="0.5"
                />
                <text
                  x={pad.left - 6}
                  y={y + 3}
                  className="fill-kairos-silver-dark text-[10px] font-body"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}
          {/* line */}
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            className="stroke-kairos-gold"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* dots */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              className="fill-kairos-gold"
            />
          ))}
          {/* date labels (first and last) */}
          {entries.length > 0 && (
            <>
              <text
                x={pad.left}
                y={chartH - 4}
                className="fill-kairos-silver-dark text-[10px] font-body"
                textAnchor="start"
              >
                {fmtDate(entries[0].date)}
              </text>
              {entries.length > 1 && (
                <text
                  x={chartW - pad.right}
                  y={chartH - 4}
                  className="fill-kairos-silver-dark text-[10px] font-body"
                  textAnchor="end"
                >
                  {fmtDate(entries[entries.length - 1].date)}
                </text>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body Composition Bar
// ---------------------------------------------------------------------------

function BodyCompBar({
  weightLbs,
  bodyFatPct,
}: {
  weightLbs: number;
  bodyFatPct: number;
}) {
  const fatMass = weightLbs * (bodyFatPct / 100);
  const leanMass = weightLbs - fatMass;
  const leanPct = 100 - bodyFatPct;

  return (
    <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
      <h2 className="text-lg font-bold font-heading text-white mb-4">
        Body Composition
      </h2>
      {/* stacked bar */}
      <div className="w-full h-8 rounded-full overflow-hidden flex">
        <div
          className="bg-kairos-gold flex items-center justify-center text-xs font-bold text-black"
          style={{ width: `${bodyFatPct}%` }}
        >
          {bodyFatPct >= 8 ? `${bodyFatPct.toFixed(1)}%` : ""}
        </div>
        <div
          className="bg-green-500 flex items-center justify-center text-xs font-bold text-black"
          style={{ width: `${leanPct}%` }}
        >
          {leanPct >= 8 ? `${leanPct.toFixed(1)}%` : ""}
        </div>
      </div>
      {/* legend */}
      <div className="flex items-center justify-between mt-3 text-sm font-body">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-kairos-gold inline-block" />
          <span className="text-kairos-silver-dark">
            Fat Mass:{" "}
            <span className="text-white font-semibold">
              {fatMass.toFixed(1)} lbs
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-kairos-silver-dark">
            Lean Mass:{" "}
            <span className="text-white font-semibold">
              {leanMass.toFixed(1)} lbs
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Measurement Form
// ---------------------------------------------------------------------------

const inputCls =
  "bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full";

function NumberField({
  label,
  name,
  value,
  onChange,
  step = "0.1",
  placeholder = "0",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-body text-kairos-silver-dark mb-1.5">
        {label}
      </label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  weightLbs: "",
  bodyFatPct: "",
  waistInches: "",
  hipsInches: "",
  chestInches: "",
  neckInches: "",
  shouldersInches: "",
  leftBicepInches: "",
  rightBicepInches: "",
  leftThighInches: "",
  rightThighInches: "",
  leftCalfInches: "",
  rightCalfInches: "",
  notes: "",
};

function AddMeasurementForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const createMutation = trpc.clientPortal.measurements.create.useMutation({
    onSuccess: () => {
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    },
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    const toNum = (v: string) => (v ? parseFloat(v) : undefined);
    const hasAtLeastOne =
      form.weightLbs ||
      form.bodyFatPct ||
      form.waistInches ||
      form.hipsInches ||
      form.chestInches ||
      form.neckInches ||
      form.shouldersInches ||
      form.leftBicepInches ||
      form.rightBicepInches ||
      form.leftThighInches ||
      form.rightThighInches ||
      form.leftCalfInches ||
      form.rightCalfInches;

    if (!hasAtLeastOne) return;

    createMutation.mutate({
      date: form.date || undefined,
      weightLbs: toNum(form.weightLbs),
      bodyFatPct: toNum(form.bodyFatPct),
      waistInches: toNum(form.waistInches),
      hipsInches: toNum(form.hipsInches),
      chestInches: toNum(form.chestInches),
      neckInches: toNum(form.neckInches),
      shouldersInches: toNum(form.shouldersInches),
      leftBicepInches: toNum(form.leftBicepInches),
      rightBicepInches: toNum(form.rightBicepInches),
      leftThighInches: toNum(form.leftThighInches),
      rightThighInches: toNum(form.rightThighInches),
      leftCalfInches: toNum(form.leftCalfInches),
      rightCalfInches: toNum(form.rightCalfInches),
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold font-heading text-white">
          New Measurement
        </h2>
        <button
          onClick={onClose}
          className="text-kairos-silver-dark hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Core */}
      <fieldset className="mb-5">
        <legend className="text-sm font-heading text-kairos-gold mb-3">
          Core
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-body text-kairos-silver-dark mb-1.5">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              className={inputCls}
            />
          </div>
          <NumberField label="Weight (lbs)" name="weightLbs" value={form.weightLbs} onChange={onChange} />
          <NumberField label="Body Fat %" name="bodyFatPct" value={form.bodyFatPct} onChange={onChange} />
        </div>
      </fieldset>

      {/* Circumference */}
      <fieldset className="mb-5">
        <legend className="text-sm font-heading text-kairos-gold mb-3">
          Circumference (inches)
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <NumberField label="Waist" name="waistInches" value={form.waistInches} onChange={onChange} />
          <NumberField label="Hips" name="hipsInches" value={form.hipsInches} onChange={onChange} />
          <NumberField label="Chest" name="chestInches" value={form.chestInches} onChange={onChange} />
          <NumberField label="Neck" name="neckInches" value={form.neckInches} onChange={onChange} />
          <NumberField label="Shoulders" name="shouldersInches" value={form.shouldersInches} onChange={onChange} />
        </div>
      </fieldset>

      {/* Arms */}
      <fieldset className="mb-5">
        <legend className="text-sm font-heading text-kairos-gold mb-3">
          Arms (inches)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Left Bicep" name="leftBicepInches" value={form.leftBicepInches} onChange={onChange} />
          <NumberField label="Right Bicep" name="rightBicepInches" value={form.rightBicepInches} onChange={onChange} />
        </div>
      </fieldset>

      {/* Legs */}
      <fieldset className="mb-5">
        <legend className="text-sm font-heading text-kairos-gold mb-3">
          Legs (inches)
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField label="Left Thigh" name="leftThighInches" value={form.leftThighInches} onChange={onChange} />
          <NumberField label="Right Thigh" name="rightThighInches" value={form.rightThighInches} onChange={onChange} />
          <NumberField label="Left Calf" name="leftCalfInches" value={form.leftCalfInches} onChange={onChange} />
          <NumberField label="Right Calf" name="rightCalfInches" value={form.rightCalfInches} onChange={onChange} />
        </div>
      </fieldset>

      {/* Notes */}
      <div className="mb-5">
        <label className="block text-sm font-body text-kairos-silver-dark mb-1.5">
          Notes
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows={2}
          placeholder="Any notes about this measurement..."
          className={cn(inputCls, "resize-none")}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          disabled={createMutation.isPending}
          className="kairos-btn-outline px-4 py-2 rounded-kairos-sm font-body text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="kairos-btn-gold px-4 py-2 rounded-kairos-sm font-body text-sm disabled:opacity-50"
        >
          {createMutation.isPending ? "Saving..." : "Save Measurement"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Table
// ---------------------------------------------------------------------------

function HistoryTable({ measurements }: { measurements: RawMeasurement[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (measurements.length === 0) return null;

  return (
    <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowTable((p) => !p)}
          className="flex items-center gap-2"
        >
          {showTable ? (
            <ChevronDown className="w-5 h-5 text-kairos-gold" />
          ) : (
            <ChevronRight className="w-5 h-5 text-kairos-gold" />
          )}
          <h2 className="text-lg font-bold font-heading text-white">
            Measurement History
          </h2>
        </button>
        <Link
          href="/progress-photos"
          className="flex items-center gap-1.5 text-sm font-body text-kairos-gold hover:underline"
        >
          <Camera className="w-4 h-4" />
          View Progress Photos &rarr;
        </Link>
      </div>

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-kairos-border">
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold w-6" />
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Date
                </th>
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Weight
                </th>
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Body Fat
                </th>
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Waist
                </th>
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Chest
                </th>
                <th className="text-left py-3 px-2 text-kairos-gold font-semibold">
                  Hips
                </th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => {
                const isExpanded = expandedId === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr
                      className={cn(
                        "border-b border-kairos-border cursor-pointer hover:bg-kairos-royal-surface/50 transition",
                        i === 0 && "bg-kairos-royal-surface",
                      )}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : m.id)
                      }
                    >
                      <td className="py-3 px-2 text-kairos-silver-dark">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {fmtDate(m.date)}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {m.weightLbs != null
                          ? `${m.weightLbs} lbs`
                          : "--"}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {m.bodyFatPct != null
                          ? `${m.bodyFatPct.toFixed(1)}%`
                          : "--"}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {m.waistInches != null
                          ? `${m.waistInches.toFixed(1)}"`
                          : "--"}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {m.chestInches != null
                          ? `${m.chestInches.toFixed(1)}"`
                          : "--"}
                      </td>
                      <td className="py-3 px-2 text-white">
                        {m.hipsInches != null
                          ? `${m.hipsInches.toFixed(1)}"`
                          : "--"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-kairos-border bg-kairos-royal-surface/30">
                        <td colSpan={7} className="py-3 px-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs font-body">
                            <Detail label="Neck" value={m.neckInches} />
                            <Detail label="Shoulders" value={m.shouldersInches} />
                            <Detail label="Left Bicep" value={m.leftBicepInches} />
                            <Detail label="Right Bicep" value={m.rightBicepInches} />
                            <Detail label="Left Thigh" value={m.leftThighInches} />
                            <Detail label="Right Thigh" value={m.rightThighInches} />
                            <Detail label="Left Calf" value={m.leftCalfInches} />
                            <Detail label="Right Calf" value={m.rightCalfInches} />
                            {m.notes && (
                              <div className="col-span-full mt-1 text-kairos-silver-dark">
                                <span className="text-kairos-gold">Notes:</span>{" "}
                                {m.notes}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <span className="text-kairos-silver-dark">{label}:</span>{" "}
      <span className="text-white">
        {value != null ? `${value.toFixed(1)}"` : "--"}
      </span>
    </div>
  );
}

// We need Fragment for the table rows
import { Fragment } from "react";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MeasurementsPage() {
  const [showForm, setShowForm] = useState(false);

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
  } = useDateRange({ initialPeriod: "month" });

  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const utils = trpc.useUtils();

  const { data: measurements = [], isLoading } =
    trpc.clientPortal.measurements.list.useQuery({ startDate, endDate });

  // Client's actual height (from Settings) — required for a real BMI
  const { data: settings } = trpc.clientPortal.settings.getSettings.useQuery();
  const heightInches = settings?.clientProfile?.heightInches ?? null;

  const sorted = useMemo(
    () =>
      [...measurements].sort(
        (a, b) => b.date.localeCompare(a.date),
      ) as RawMeasurement[],
    [measurements],
  );

  const current = sorted[0] ?? null;
  const previous = sorted.length > 1 ? sorted[1] : null;

  // Derived values
  const weightLbs = current?.weightLbs ?? null;
  const bodyFatPct = current?.bodyFatPct ?? null;
  const leanMass =
    weightLbs != null && bodyFatPct != null
      ? calcLeanMass(weightLbs, bodyFatPct)
      : null;
  const bmi =
    weightLbs != null && heightInches != null
      ? calcBmi(weightLbs, heightInches)
      : null;

  const prevWeight = previous?.weightLbs ?? null;
  const prevBodyFat = previous?.bodyFatPct ?? null;
  const prevLean =
    prevWeight != null && prevBodyFat != null
      ? calcLeanMass(prevWeight, prevBodyFat)
      : null;
  const prevBmi =
    prevWeight != null && heightInches != null
      ? calcBmi(prevWeight, heightInches)
      : null;

  // History accessors for sparklines (oldest first)
  const historyAsc = useMemo(() => [...sorted].reverse(), [sorted]);
  const fieldHistory = (field: keyof RawMeasurement) =>
    historyAsc.map((m) => m[field] as number | null);

  const handleRefresh = () => {
    utils.clientPortal.measurements.list.invalidate({ startDate, endDate });
  };

  // ---- Empty state ----
  if (!isLoading && sorted.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading text-white mb-1">
              Body Measurements
            </h1>
            <p className="text-sm font-body text-kairos-silver-dark">
              Track your body composition over time
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-body text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Measurement
          </button>
        </div>

        <DateRangeNavigator
          availablePeriods={["month", "quarter", "year"]}
          selectedPeriod={period}
          onPeriodChange={setPeriod}
          formattedRange={formattedRange}
          isCurrent={isCurrent}
          canForward={canForward}
          onBack={goBack}
          onForward={goForward}
          onToday={goToToday}
        />

        {showForm && (
          <AddMeasurementForm
            onClose={() => setShowForm(false)}
            onSuccess={handleRefresh}
          />
        )}

        <div className="kairos-card p-12 text-center rounded-kairos-sm border border-kairos-border">
          <Scale className="w-12 h-12 text-kairos-gold mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-heading text-white mb-2">
            No measurements yet
          </h3>
          <p className="text-sm font-body text-kairos-silver-dark mb-6 max-w-md mx-auto">
            Start tracking your body composition by adding your first
            measurement. Log weight, body fat, and circumference
            measurements to see trends over time.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="kairos-btn-gold px-6 py-2.5 rounded-kairos-sm font-body text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Measurement
          </button>
        </div>
      </div>
    );
  }

  // ---- Main content ----
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-1">
            Body Measurements
          </h1>
          <p className="text-sm font-body text-kairos-silver-dark">
            Track your body composition over time
          </p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-body text-sm"
        >
          {showForm ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {showForm ? "Close" : "Add Measurement"}
        </button>
      </div>

      {/* Add measurement form (expandable) */}
      {showForm && (
        <AddMeasurementForm
          onClose={() => setShowForm(false)}
          onSuccess={handleRefresh}
        />
      )}

      {/* Date range navigator */}
      <DateRangeNavigator
        availablePeriods={["month", "quarter", "year"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Weight"
          value={weightLbs != null ? weightLbs.toFixed(1) : "--"}
          unit="lbs"
          icon={<Scale className="w-5 h-5" />}
          trend={
            weightLbs != null && prevWeight != null
              ? trendDir(weightLbs, prevWeight)
              : "flat"
          }
          changeText={
            weightLbs != null && prevWeight != null
              ? `${signed(weightLbs - prevWeight)} lbs`
              : "--"
          }
        />
        <SummaryCard
          label="Body Fat"
          value={bodyFatPct != null ? bodyFatPct.toFixed(1) : "--"}
          unit="%"
          icon={<Activity className="w-5 h-5" />}
          trend={
            bodyFatPct != null && prevBodyFat != null
              ? trendDir(bodyFatPct, prevBodyFat)
              : "flat"
          }
          changeText={
            bodyFatPct != null && prevBodyFat != null
              ? `${signed(bodyFatPct - prevBodyFat)}%`
              : "--"
          }
        />
        <SummaryCard
          label="Lean Mass"
          value={leanMass != null ? leanMass.toFixed(1) : "--"}
          unit="lbs"
          icon={<Activity className="w-5 h-5" />}
          trend={
            leanMass != null && prevLean != null
              ? trendDir(leanMass, prevLean)
              : "flat"
          }
          changeText={
            leanMass != null && prevLean != null
              ? `${signed(leanMass - prevLean)} lbs`
              : "--"
          }
        />
        {heightInches != null ? (
          <SummaryCard
            label="BMI"
            value={bmi != null ? bmi.toFixed(1) : "--"}
            unit=""
            icon={<Scale className="w-5 h-5" />}
            trend={
              bmi != null && prevBmi != null
                ? trendDir(bmi, prevBmi)
                : "flat"
            }
            changeText={
              bmi != null && prevBmi != null
                ? signed(bmi - prevBmi, 2)
                : "--"
            }
          />
        ) : (
          <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
            <div className="flex items-start justify-between mb-3">
              <div className="text-kairos-gold">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-body text-kairos-silver-dark mb-1">BMI</p>
            <p className="text-sm font-body text-kairos-silver">
              Add your height in Settings to see BMI
            </p>
          </div>
        )}
      </div>

      {/* 2. Body Composition Bar */}
      {weightLbs != null && bodyFatPct != null && (
        <BodyCompBar weightLbs={weightLbs} bodyFatPct={bodyFatPct} />
      )}

      {/* 3. Circumference Measurements */}
      {current && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-heading text-white">
            Circumference Measurements
          </h2>

          {/* Single-site measurements */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <CircCard
              label="Waist"
              current={current.waistInches}
              previous={previous?.waistInches ?? null}
              history={fieldHistory("waistInches")}
            />
            <CircCard
              label="Hips"
              current={current.hipsInches}
              previous={previous?.hipsInches ?? null}
              history={fieldHistory("hipsInches")}
            />
            <CircCard
              label="Chest"
              current={current.chestInches}
              previous={previous?.chestInches ?? null}
              history={fieldHistory("chestInches")}
            />
            <CircCard
              label="Neck"
              current={current.neckInches}
              previous={previous?.neckInches ?? null}
              history={fieldHistory("neckInches")}
            />
            <CircCard
              label="Shoulders"
              current={current.shouldersInches}
              previous={previous?.shouldersInches ?? null}
              history={fieldHistory("shouldersInches")}
            />
          </div>

          {/* Paired L/R measurements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PairedCircCard
              label="Biceps"
              leftCurrent={current.leftBicepInches}
              rightCurrent={current.rightBicepInches}
              leftPrev={previous?.leftBicepInches ?? null}
              rightPrev={previous?.rightBicepInches ?? null}
              leftHistory={fieldHistory("leftBicepInches")}
              rightHistory={fieldHistory("rightBicepInches")}
            />
            <PairedCircCard
              label="Thighs"
              leftCurrent={current.leftThighInches}
              rightCurrent={current.rightThighInches}
              leftPrev={previous?.leftThighInches ?? null}
              rightPrev={previous?.rightThighInches ?? null}
              leftHistory={fieldHistory("leftThighInches")}
              rightHistory={fieldHistory("rightThighInches")}
            />
            <PairedCircCard
              label="Calves"
              leftCurrent={current.leftCalfInches}
              rightCurrent={current.rightCalfInches}
              leftPrev={previous?.leftCalfInches ?? null}
              rightPrev={previous?.rightCalfInches ?? null}
              leftHistory={fieldHistory("leftCalfInches")}
              rightHistory={fieldHistory("rightCalfInches")}
            />
          </div>
        </div>
      )}

      {/* 4. Weight Trend Chart */}
      <WeightTrendChart
        measurements={sorted as RawMeasurement[]}
        label={formattedRange}
      />

      {/* 5. Measurement History */}
      <HistoryTable measurements={sorted as RawMeasurement[]} />
    </div>
  );
}
