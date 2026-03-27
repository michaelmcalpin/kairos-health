"use client";

import { useState } from "react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useMeasurements } from "@/hooks/client/useMeasurements";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Ruler,
  Heart,
  Activity,
  Target,
  Plus,
  X,
} from "lucide-react";

interface VitalCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "flat";
  change: string;
  targetRange: string;
}

function VitalCard({ label, value, unit, icon, trend, change, targetRange }: VitalCardProps) {
  const trendIcon =
    trend === "up" ? <TrendingUp className="w-4 h-4 text-red-400" /> :
    trend === "down" ? <TrendingDown className="w-4 h-4 text-green-400" /> :
    <Minus className="w-4 h-4 text-gray-400" />;

  return (
    <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
      <div className="flex items-start justify-between mb-3">
        <div className="text-kairos-gold">{icon}</div>
        <div className="flex items-center gap-1 text-xs font-body">
          {trendIcon}
          <span className={trend === "down" ? "text-green-400" : "text-red-400"}>{change}</span>
        </div>
      </div>
      <p className="text-xs font-body text-kairos-silver-dark mb-2">{label}</p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-sm font-body text-kairos-silver-dark">{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <Target className="w-3 h-3 text-kairos-gold" />
        <span className="text-xs font-body text-kairos-silver-dark">{targetRange}</span>
      </div>
    </div>
  );
}

export default function MeasurementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: "",
    bodyFat: "",
    waistCircumference: "",
    systolic: "",
    diastolic: "",
    restingHR: "",
    notes: "",
  });

  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const { records: measurements } = useMeasurements(dateRange);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // UI-only, no tRPC calls
    console.log("Save measurement:", formData);
    // Reset form and hide
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: "",
      bodyFat: "",
      waistCircumference: "",
      systolic: "",
      diastolic: "",
      restingHR: "",
      notes: "",
    });
    setShowForm(false);
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: "",
      bodyFat: "",
      waistCircumference: "",
      systolic: "",
      diastolic: "",
      restingHR: "",
      notes: "",
    });
    setShowForm(false);
  };

  const current = measurements[0];
  const previous = measurements.length > 1 ? measurements[1] : measurements[0];

  if (!current) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-1">Body Measurements</h1>
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
        <div className="kairos-card p-8 text-center">
          <p className="text-kairos-silver-dark font-body">No measurements found for this period.</p>
        </div>
      </div>
    );
  }

  const weightChange = (current.weight - previous.weight).toFixed(1);
  const bodyFatChange = (current.bodyFat - previous.bodyFat).toFixed(1);
  const bmiChange = (current.bmi - previous.bmi).toFixed(2);
  const hrChange = (current.restingHR - previous.restingHR).toFixed(0);

  // Generate SVG line chart for weight trend
  const weights = measurements.map((m) => m.weight).reverse();
  const minWeight = Math.floor(Math.min(...weights));
  const maxWeight = Math.ceil(Math.max(...weights));
  const weightRange = maxWeight - minWeight || 1;
  const chartHeight = 120;
  const chartWidth = 320;
  const points = weights.map((w, i) => ({
    x: (i / Math.max(weights.length - 1, 1)) * chartWidth,
    y: chartHeight - ((w - minWeight) / weightRange) * chartHeight,
    value: w,
  }));

  const fatPercentage = current.bodyFat;
  const leanPercentage = 100 - current.bodyFat;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-1">Body Measurements</h1>
          <p className="text-sm font-body text-kairos-silver-dark">Track your body composition &amp; vitals over time</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-body text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Measurement
        </button>
      </div>

      {/* Add Measurement Form */}
      {showForm && (
        <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-heading text-white">New Measurement</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-kairos-silver-dark hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date */}
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

            {/* Weight */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Weight (lbs)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="0"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Body Fat % */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Body Fat (%)</label>
              <input
                type="number"
                name="bodyFat"
                value={formData.bodyFat}
                onChange={handleInputChange}
                placeholder="0"
                step="0.1"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Waist Circumference */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Waist Circumference (in)</label>
              <input
                type="number"
                name="waistCircumference"
                value={formData.waistCircumference}
                onChange={handleInputChange}
                placeholder="0"
                step="0.1"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Blood Pressure Systolic */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Blood Pressure Systolic</label>
              <input
                type="number"
                name="systolic"
                value={formData.systolic}
                onChange={handleInputChange}
                placeholder="0"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Blood Pressure Diastolic */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Blood Pressure Diastolic</label>
              <input
                type="number"
                name="diastolic"
                value={formData.diastolic}
                onChange={handleInputChange}
                placeholder="0"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>

            {/* Resting Heart Rate */}
            <div>
              <label className="block text-sm font-body text-kairos-silver-dark mb-2">Resting Heart Rate (bpm)</label>
              <input
                type="number"
                name="restingHR"
                value={formData.restingHR}
                onChange={handleInputChange}
                placeholder="0"
                className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-body text-kairos-silver-dark mb-2">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any notes about this measurement..."
              rows={3}
              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="kairos-btn-outline px-4 py-2 rounded-kairos-sm font-body text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="kairos-btn-gold px-4 py-2 rounded-kairos-sm font-body text-sm"
            >
              Save Measurement
            </button>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VitalCard label="Weight" value={current.weight.toString()} unit="lbs" icon={<Scale className="w-5 h-5" />}
          trend={parseFloat(weightChange) > 0 ? "up" : "down"} change={`${parseFloat(weightChange) > 0 ? "+" : ""}${weightChange} lbs`} targetRange="170 - 180 lbs" />
        <VitalCard label="Body Fat %" value={current.bodyFat.toFixed(1)} unit="%" icon={<Activity className="w-5 h-5" />}
          trend={parseFloat(bodyFatChange) > 0 ? "up" : "down"} change={`${parseFloat(bodyFatChange) > 0 ? "+" : ""}${bodyFatChange}%`} targetRange="15 - 20%" />
        <VitalCard label="Lean Mass" value={current.leanMass.toFixed(1)} unit="lbs" icon={<Activity className="w-5 h-5" />}
          trend="flat" change="0.0 lbs" targetRange="140 - 150 lbs" />
        <VitalCard label="BMI" value={current.bmi.toFixed(1)} unit="" icon={<Scale className="w-5 h-5" />}
          trend={parseFloat(bmiChange) > 0 ? "up" : "down"} change={`${parseFloat(bmiChange) > 0 ? "+" : ""}${bmiChange}`} targetRange="18.5 - 24.9" />
        <VitalCard label="Waist Circumference" value={current.waistCircumference.toFixed(1)} unit="in" icon={<Ruler className="w-5 h-5" />}
          trend="down" change="-0.3 in" targetRange="30 - 33 in" />
        <VitalCard label="Blood Pressure" value={`${current.systolic}/${current.diastolic}`} unit="mmHg" icon={<Heart className="w-5 h-5" />}
          trend="down" change="-2/-1" targetRange="< 120/80" />
        <VitalCard label="Resting HR" value={current.restingHR.toString()} unit="bpm" icon={<Heart className="w-5 h-5" />}
          trend={parseInt(hrChange) > 0 ? "up" : "down"} change={`${parseInt(hrChange) > 0 ? "+" : ""}${hrChange}`} targetRange="60 - 100 bpm" />
        <VitalCard label="VO2 Max (Est.)" value={current.vo2Max.toFixed(1)} unit="ml/kg/min" icon={<Activity className="w-5 h-5" />}
          trend="up" change="+0.4" targetRange="45 - 55" />
      </div>

      {/* Weight Trend Chart */}
      <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
        <h2 className="text-lg font-bold font-heading text-white mb-4">Weight Trend — {formattedRange}</h2>
        <div className="flex justify-center">
          <svg width={chartWidth + 40} height={chartHeight + 40} viewBox={`0 0 ${chartWidth + 40} ${chartHeight + 40}`} className="w-full max-w-md">
            <text x="20" y="20" className="text-xs font-body fill-kairos-silver-dark" textAnchor="end">{maxWeight.toFixed(0)}</text>
            <text x="20" y={chartHeight + 10} className="text-xs font-body fill-kairos-silver-dark" textAnchor="end">{minWeight.toFixed(0)}</text>
            <line x1="25" y1="15" x2={chartWidth + 25} y2="15" className="stroke-kairos-border" strokeWidth="1" />
            <line x1="25" y1={chartHeight + 15} x2={chartWidth + 25} y2={chartHeight + 15} className="stroke-kairos-border" strokeWidth="1" />
            <polyline points={points.map((p) => `${p.x + 25},${p.y + 15}`).join(" ")} fill="none" className="stroke-kairos-gold" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x + 25} cy={p.y + 15} r="3" className="fill-kairos-gold" />
            ))}
            <text x={chartWidth / 2 + 25} y={chartHeight + 35} className="text-xs font-body fill-kairos-silver-dark" textAnchor="middle">{formattedRange}</text>
          </svg>
        </div>
      </div>

      {/* Body Composition */}
      <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
        <h2 className="text-lg font-bold font-heading text-white mb-4">Body Composition</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="font-body text-sm text-kairos-silver-dark">Fat Mass</span>
            <span className="font-bold text-white">{(current.weight * (current.bodyFat / 100)).toFixed(1)} lbs ({current.bodyFat.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-kairos-border rounded-full h-3 overflow-hidden">
            <div className="bg-kairos-gold h-full" style={{ width: `${fatPercentage}%` }} />
          </div>
          <div className="flex items-center justify-between mt-5 mb-3">
            <span className="font-body text-sm text-kairos-silver-dark">Lean Mass</span>
            <span className="font-bold text-white">{current.leanMass.toFixed(1)} lbs ({leanPercentage.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-kairos-border rounded-full h-3 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${leanPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Measurement History Table */}
      <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border overflow-x-auto">
        <h2 className="text-lg font-bold font-heading text-white mb-4">Measurement History — {formattedRange}</h2>
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">Date</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">Weight</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">Body Fat</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">BMI</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">Waist</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">BP</th>
              <th className="text-left py-3 px-2 text-kairos-gold font-semibold">Resting HR</th>
            </tr>
          </thead>
          <tbody>
            {measurements.slice(0, 12).map((m, i) => (
              <tr key={i} className={`border-b border-kairos-border ${i === 0 ? "bg-kairos-royal-surface" : ""}`}>
                <td className="py-3 px-2 text-white">{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                <td className="py-3 px-2 text-white">{m.weight} lbs</td>
                <td className="py-3 px-2 text-white">{m.bodyFat.toFixed(1)}%</td>
                <td className="py-3 px-2 text-white">{m.bmi.toFixed(1)}</td>
                <td className="py-3 px-2 text-white">{m.waistCircumference.toFixed(1)}&quot;</td>
                <td className="py-3 px-2 text-white">{m.systolic}/{m.diastolic}</td>
                <td className="py-3 px-2 text-white">{m.restingHR} bpm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
