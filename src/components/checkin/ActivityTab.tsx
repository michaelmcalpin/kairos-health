'use client';

import React from 'react';
import { Zap } from 'lucide-react';

interface ActivityTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ data, onChange }) => {
  const trainingTypes = ['Weights', 'HIIT', 'Cardio', 'Yoga', 'Rest Day', 'Other'];

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Activity</h2>
      </div>

      {/* Cardio Minutes */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Cardio Minutes</label>
        <input
          type="number"
          value={data.cardioMinutes ?? ''}
          onChange={(e) => onChange('cardioMinutes', e.target.value ? parseInt(e.target.value) : 0)}
          placeholder="30"
          className="kairos-input w-full"
        />
      </div>

      {/* Training Type Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Training Type</label>
        <select
          value={data.trainingType ?? ''}
          onChange={(e) => onChange('trainingType', e.target.value)}
          className="kairos-input w-full appearance-none bg-right pr-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23D4AF37' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          <option value="">Select training type</option>
          {trainingTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Training Description */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Training Description</label>
        <textarea
          value={data.trainingDescription ?? ''}
          onChange={(e) => onChange('trainingDescription', e.target.value)}
          placeholder="e.g., Upper body focus, 3 sets of squats, 20 min run"
          rows={4}
          className="kairos-input w-full resize-none"
        />
      </div>

      {/* Steps (optional override if not auto-filled) */}
      <div className="space-y-2">
        <label className="text-sm font-body text-kairos-silver">Steps (if manual entry)</label>
        <input
          type="number"
          value={data.steps ?? ''}
          onChange={(e) => onChange('steps', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="8500"
          className="kairos-input w-full"
        />
        <p className="text-xs font-body text-kairos-silver-dark">
          Leave blank to use data from Vitals tab or connected devices.
        </p>
      </div>
    </div>
  );
};
