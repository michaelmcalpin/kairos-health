'use client';

import React from 'react';
import { Heart } from 'lucide-react';

interface WellnessTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export const WellnessTab: React.FC<WellnessTabProps> = ({ data, onChange }) => {
  const getSliderColor = (field: string, value: number) => {
    // For stress and hunger, LOWER is better (reversed)
    const isReversed = field === 'stress' || field === 'hunger';

    if (isReversed) {
      if (value <= 3) return 'accent-green-500';
      if (value <= 6) return 'accent-yellow-500';
      return 'accent-red-500';
    } else {
      // For energy and mood, HIGHER is better
      if (value >= 7) return 'accent-green-500';
      if (value >= 4) return 'accent-yellow-500';
      return 'accent-red-500';
    }
  };

  const getColorLabel = (field: string, value: number) => {
    const isReversed = field === 'stress' || field === 'hunger';

    if (isReversed) {
      if (value <= 3) return 'text-green-400';
      if (value <= 6) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value >= 7) return 'text-green-400';
      if (value >= 4) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const SliderField = ({
    label,
    field,
    value,
  }: {
    label: string;
    field: string;
    value: number;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-body text-kairos-silver">{label}</label>
        <span className={`text-sm font-semibold ${getColorLabel(field, value)}`}>
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(field, parseInt(e.target.value))}
        className={`w-full h-2 bg-kairos-border rounded-lg appearance-none cursor-pointer ${getSliderColor(
          field,
          value
        )}`}
      />
    </div>
  );

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Wellness</h2>
      </div>

      {/* Stress Level */}
      <SliderField label="Stress Level" field="stress" value={data.stress ?? 5} />

      {/* Hunger Level */}
      <SliderField label="Hunger Level" field="hunger" value={data.hunger ?? 5} />

      {/* Energy Level */}
      <SliderField label="Energy Level" field="energy" value={data.energy ?? 7} />

      {/* Mood */}
      <SliderField label="Mood" field="mood" value={data.mood ?? 7} />

      {/* Deviations */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Deviations</label>
        <textarea
          value={data.deviations ?? ''}
          onChange={(e) => onChange('deviations', e.target.value)}
          placeholder="Note any unusual circumstances or deviations from plan..."
          rows={3}
          className="kairos-input w-full resize-none"
        />
        <p className="text-xs font-body text-kairos-silver-dark">
          e.g., Late dinner, extra stress from work, sickness
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">General Notes</label>
        <textarea
          value={data.notes ?? ''}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Any additional observations or comments about the day..."
          rows={3}
          className="kairos-input w-full resize-none"
        />
      </div>
    </div>
  );
};
