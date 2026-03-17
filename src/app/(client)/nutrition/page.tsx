"use client";

import { useState } from "react";
import {
  Apple,
  Droplets,
  Flame,
  Target,
  TrendingUp,
  CheckCircle,
  UtensilsCrossed,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useNutrition } from "@/hooks/client/useNutrition";
import { generateMeals } from "@/lib/client-ops";

export default function NutritionPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const [waterGlasses, setWaterGlasses] = useState(6);
  const waterTarget = 8;

  const { records: nutritionData, stats: nutritionStats } = useNutrition(dateRange);
  const stats = nutritionStats;

  const macros = {
    calories: { target: 2000, actual: stats.calories, unit: "kcal", label: "Calories" },
    protein: { target: 150, actual: stats.protein, unit: "g", label: "Protein" },
    carbs: { target: 100, actual: stats.carbs, unit: "g", label: "Carbs" },
    fat: { target: 120, actual: stats.fat, unit: "g", label: "Fat" },
  };

  const meals = generateMeals(dateRange.startDate);

  const calculatePercentage = (actual: number, target: number) => Math.min((actual / target) * 100, 100);

  const renderCircularProgress = (percentage: number, label: string, value: string) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 mb-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-kairos-royal-surface" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="text-kairos-gold transition-all duration-500" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-kairos-gold">{Math.round(percentage)}%</span>
            <span className="text-xs text-kairos-silver-dark">{value}</span>
          </div>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Nutrition Protocol</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold">Mediterranean-Keto Hybrid</span>
          <span className="text-xs font-body text-kairos-silver-dark">Optimized for longevity</span>
        </div>
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

      {/* Daily Macros Progress */}
      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-lg text-white">
            {period === "day" ? "Today\u0027s Macros" : `Avg Daily Macros — ${formattedRange}`}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(macros).map(([key, macro]) => (
            <div key={key}>
              {renderCircularProgress(
                calculatePercentage(macro.actual, macro.target),
                macro.label,
                `${macro.actual}/${macro.target}${macro.unit}`
              )}
            </div>
          ))}
        </div>
      </div>

      {/* DAY VIEW: Meal log */}
      {period === "day" && (
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-6">
            <UtensilsCrossed className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Meal Log</h2>
          </div>
          <div className="space-y-4">
            {meals.map((meal, idx) => (
              <div key={idx} className="border border-kairos-border rounded-kairos-sm bg-kairos-royal-surface/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-semibold text-white">{meal.name}</h3>
                  <span className="text-kairos-gold font-bold text-sm">{meal.calories} kcal</span>
                </div>
                <ul className="text-sm text-kairos-silver-dark font-body mb-3 space-y-1">
                  {meal.items.map((item, i) => (<li key={i}>• {item}</li>))}
                </ul>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">P: </span><span className="text-kairos-gold font-semibold">{meal.protein}g</span></div>
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">C: </span><span className="text-kairos-gold font-semibold">{meal.carbs}g</span></div>
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">F: </span><span className="text-kairos-gold font-semibold">{meal.fat}g</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEEK/MONTH VIEW: Daily nutrition trend */}
      {(period === "week" || period === "month") && (
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Daily Calorie Trend — {formattedRange}</h2>
          </div>
          <div className="space-y-2">
            {nutritionData.slice(0, period === "week" ? 7 : 30).map((day, i) => {
              const pct = Math.min((day.calories / 2500) * 100, 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-heading text-kairos-silver-dark w-10">{day.dateLabel}</span>
                  <div className="flex-1 h-6 bg-kairos-royal-surface rounded-kairos-sm overflow-hidden relative">
                    <div className="h-full bg-kairos-gold/30 rounded-kairos-sm" style={{ width: `${pct}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-heading font-semibold text-white">{day.calories} kcal</span>
                  </div>
                  <span className="text-xs font-body text-kairos-silver-dark w-16 text-right">P:{day.protein}g</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Apple className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">Dietary Guidelines</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">Foods to Emphasize</p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>✓ Fatty fish (salmon, mackerel, sardines) - high omega-3</li>
                <li>✓ Anti-inflammatory vegetables (broccoli, leafy greens)</li>
                <li>✓ Grass-fed beef and pasture-raised eggs</li>
                <li>✓ Nuts and seeds (almonds, macadamia)</li>
                <li>✓ Extra virgin olive oil for healthy fats</li>
              </ul>
            </div>
            <div className="border-t border-kairos-border pt-4">
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">Foods to Minimize</p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>✕ Refined carbohydrates and sugar</li>
                <li>✕ Seed oils (soybean, canola, sunflower)</li>
                <li>✕ Processed foods and ultra-processed ingredients</li>
                <li>✕ High-sugar fruits (limit dried fruits)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">Hydration Tracker</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="grid grid-cols-4 gap-2 mb-6">
              {Array.from({ length: waterTarget }).map((_, i) => (
                <button key={i} onClick={() => setWaterGlasses(i + 1)}
                  className={`w-12 h-12 rounded-kairos-sm border-2 transition-all ${i < waterGlasses ? "bg-kairos-gold border-kairos-gold" : "border-kairos-border bg-kairos-royal-surface hover:border-kairos-gold"}`}
                  title={`Glass ${i + 1}`}
                >
                  <Droplets className={`w-5 h-5 mx-auto ${i < waterGlasses ? "text-kairos-royal" : "text-kairos-silver-dark"}`} />
                </button>
              ))}
            </div>
            <p className="text-center">
              <span className="text-2xl font-heading font-bold text-kairos-gold">{waterGlasses}</span>
              <span className="text-kairos-silver-dark font-body text-sm"> / {waterTarget} glasses</span>
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-3">
              {waterGlasses >= waterTarget ? (
                <span className="flex items-center gap-1 text-kairos-gold"><CheckCircle className="w-4 h-4" /> Hydration goal met!</span>
              ) : (
                <span>{waterTarget - waterGlasses} more glasses to goal</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-kairos-gold" />
          <h3 className="font-heading font-bold text-white">Daily Summary</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Avg Calories</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">{stats.calories} / 2000</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">{Math.round((stats.calories / 2000) * 100)}% of target</p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Macro Balance</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">94% Score</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">Excellent adherence</p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Meal Frequency</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">4 Meals</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">Well distributed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
