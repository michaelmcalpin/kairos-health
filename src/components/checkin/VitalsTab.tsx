'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface VitalsTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  dataSources?: Record<string, string>;
}

export const VitalsTab: React.FC<VitalsTabProps> = ({
  data,
  onChange,
  dataSources = {},
}) => {
  const getSourceBadge = (field: string) => {
    const source = dataSources[field];
    if (!source) return null;

    return (
      <span className="ml-2 inline-block px-2 py-1 text-xs rounded bg-kairos-gold/20 text-kairos-gold font-body">
        {source === 'manual' ? 'Manual' : source}
      </span>
    );
  };

  const getSliderColor = (value: number, maxValue: number = 10) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 70) return 'accent-kairos-gold';
    if (percentage >= 40) return 'accent-yellow-500';
    return 'accent-red-500';
  };

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Vitals</h2>
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">
          Weight (lbs)
          {getSourceBadge('weight')}
        </label>
        <input
          type="number"
          value={data.weight ?? ''}
          onChange={(e) => onChange('weight', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="180"
          className="kairos-input w-full"
        />
      </div>

      {/* Sleep */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">
            Sleep Hours
            {getSourceBadge('sleepHours')}
          </label>
          <input
            type="number"
            step="0.5"
            value={data.sleepHours ?? ''}
            onChange={(e) => onChange('sleepHours', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="7.5"
            className="kairos-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">
            Sleep Quality
            <span className="ml-2 text-kairos-gold font-semibold">{data.sleepQuality ?? 0}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={data.sleepQuality ?? 5}
            onChange={(e) => onChange('sleepQuality', parseInt(e.target.value))}
            className={`w-full h-2 bg-kairos-border rounded-lg appearance-none cursor-pointer ${getSliderColor(
              data.sleepQuality ?? 5
            )}`}
          />
        </div>
      </div>

      {/* HRV & Readiness */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">
            HRV Score
            {getSourceBadge('hrv')}
          </label>
          <input
            type="number"
            value={data.hrv ?? ''}
            onChange={(e) => onChange('hrv', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="45"
            className="kairos-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">
            Readiness Score
            {getSourceBadge('readiness')}
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={data.readiness ?? ''}
            onChange={(e) => onChange('readiness', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="78"
            className="kairos-input w-full"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">
          Steps
          {getSourceBadge('steps')}
        </label>
        <input
          type="number"
          value={data.steps ?? ''}
          onChange={(e) => onChange('steps', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="8500"
          className="kairos-input w-full"
        />
      </div>

      <div className="text-xs font-body text-kairos-silver-dark">
        Data auto-populated from connected devices will be marked "Auto".
      </div>
    </div>
  );
};
