'use client';

import React from 'react';
import { Apple } from 'lucide-react';

interface NutritionTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export const NutritionTab: React.FC<NutritionTabProps> = ({ data, onChange }) => {
  const protein = data.protein ?? 0;
  const carbs = data.carbs ?? 0;
  const fat = data.fat ?? 0;

  const macroTotal = protein * 4 + carbs * 4 + fat * 9;

  const getPercentage = (macro: number) => {
    if (macroTotal === 0) return 0;
    return ((macro * (macro === protein || macro === carbs ? 4 : 9)) / macroTotal) * 100;
  };

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Apple className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Nutrition</h2>
      </div>

      {/* Plan */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Nutrition Plan</label>
        <input
          type="text"
          value={data.plan ?? ''}
          onChange={(e) => onChange('plan', e.target.value)}
          placeholder="e.g., Low carb, Maintenance, Keto"
          className="kairos-input w-full"
        />
      </div>

      {/* Macro Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Protein (g)</label>
          <input
            type="number"
            value={data.protein ?? ''}
            onChange={(e) => onChange('protein', e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="150"
            className="kairos-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Carbs (g)</label>
          <input
            type="number"
            value={data.carbs ?? ''}
            onChange={(e) => onChange('carbs', e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="180"
            className="kairos-input w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Fat (g)</label>
          <input
            type="number"
            value={data.fat ?? ''}
            onChange={(e) => onChange('fat', e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="60"
            className="kairos-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Fiber (g)</label>
          <input
            type="number"
            value={data.fiber ?? ''}
            onChange={(e) => onChange('fiber', e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="35"
            className="kairos-input w-full"
          />
        </div>
      </div>

      {/* Macro Indicators */}
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-body text-kairos-silver-dark">Macro Breakdown</span>
          <span className="text-sm font-body text-kairos-silver">
            {macroTotal.toFixed(0)} kcal
          </span>
        </div>
        <div className="flex gap-2 items-end">
          {/* Protein Indicator */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full border-2 border-kairos-gold/50 bg-kairos-gold/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-kairos-gold">
                {getPercentage(protein).toFixed(0)}%
              </span>
            </div>
            <span className="text-xs font-body text-kairos-silver-dark">Protein</span>
          </div>

          {/* Carbs Indicator */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/50 bg-blue-500/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-400">
                {getPercentage(carbs).toFixed(0)}%
              </span>
            </div>
            <span className="text-xs font-body text-kairos-silver-dark">Carbs</span>
          </div>

          {/* Fat Indicator */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full border-2 border-green-500/50 bg-green-500/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-green-400">
                {getPercentage(fat).toFixed(0)}%
              </span>
            </div>
            <span className="text-xs font-body text-kairos-silver-dark">Fat</span>
          </div>
        </div>
      </div>

      {/* Calories & Hydration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Total Calories</label>
          <input
            type="number"
            value={data.totalCalories ?? ''}
            onChange={(e) => onChange('totalCalories', e.target.value ? parseInt(e.target.value) : 0)}
            placeholder="2100"
            className="kairos-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Water (oz)</label>
          <input
            type="number"
            value={data.water ?? ''}
            onChange={(e) => onChange('water', e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="64"
            className="kairos-input w-full"
          />
        </div>
      </div>

      {/* Electrolytes Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Electrolytes</label>
        <button
          onClick={() => onChange('electrolytes', !data.electrolytes)}
          className={`w-full py-2 px-4 rounded border font-body text-sm transition-colors ${
            data.electrolytes
              ? 'border-kairos-gold bg-kairos-gold/10 text-kairos-gold'
              : 'border-kairos-border text-kairos-silver hover:border-kairos-gold/30'
          }`}
        >
          {data.electrolytes ? '✓ Electrolytes Taken' : 'Not Taken'}
        </button>
      </div>

      {/* BM Count */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">BM Count</label>
        <input
          type="number"
          min="0"
          value={data.bmCount ?? ''}
          onChange={(e) => onChange('bmCount', e.target.value ? parseInt(e.target.value) : 0)}
          placeholder="1"
          className="kairos-input w-full"
        />
      </div>
    </div>
  );
};
