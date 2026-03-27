'use client';

import React, { useState } from 'react';
import { Droplet } from 'lucide-react';

interface BloodSugarReading {
  id: string;
  timing: string;
  valueMgdl: number;
  mealDescription?: string;
  createdAt: string;
}

interface BloodSugarTabProps {
  readings: BloodSugarReading[];
  onAdd: (reading: {
    timing: string;
    valueMgdl: number;
    mealDescription?: string;
    notes?: string;
  }) => void;
}

export const BloodSugarTab: React.FC<BloodSugarTabProps> = ({ readings, onAdd }) => {
  const [formData, setFormData] = useState({
    timing: '',
    valueMgdl: '',
    mealDescription: '',
    notes: '',
  });

  const timingOptions = ['Fasted', '1hr', '2hr', '3hr', '4hr'];

  const handleAddReading = () => {
    if (!formData.timing || !formData.valueMgdl) {
      return;
    }

    onAdd({
      timing: formData.timing,
      valueMgdl: parseInt(formData.valueMgdl),
      mealDescription: formData.mealDescription || undefined,
      notes: formData.notes || undefined,
    });

    setFormData({
      timing: '',
      valueMgdl: '',
      mealDescription: '',
      notes: '',
    });
  };

  const getReadingColor = (value: number) => {
    if (value < 70) return 'text-blue-400';
    if (value <= 100) return 'text-green-400';
    if (value <= 140) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Droplet className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Blood Sugar</h2>
      </div>

      {/* Input Section */}
      <div className="space-y-4 p-4 rounded border border-kairos-border bg-kairos-gold/5">
        <h3 className="text-sm font-semibold text-kairos-silver">Log Reading</h3>

        {/* Timing Selector */}
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Timing</label>
          <select
            value={formData.timing}
            onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
            className="kairos-input w-full appearance-none bg-right pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23D4AF37' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="">Select timing</option>
            {timingOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'Fasted' ? 'Fasted' : `${option} post-meal`}
              </option>
            ))}
          </select>
        </div>

        {/* Value Input */}
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Blood Sugar (mg/dL)</label>
          <input
            type="number"
            value={formData.valueMgdl}
            onChange={(e) => setFormData({ ...formData, valueMgdl: e.target.value })}
            placeholder="95"
            className="kairos-input w-full"
          />
        </div>

        {/* Meal Description */}
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Meal Description (optional)</label>
          <input
            type="text"
            value={formData.mealDescription}
            onChange={(e) => setFormData({ ...formData, mealDescription: e.target.value })}
            placeholder="e.g., Eggs and toast"
            className="kairos-input w-full"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Notes (optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional context..."
            rows={2}
            className="kairos-input w-full resize-none"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddReading}
          disabled={!formData.timing || !formData.valueMgdl}
          className="kairos-btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Reading
        </button>
      </div>

      {/* Recent Readings */}
      {readings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-kairos-silver">Recent Readings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left py-2 px-3 font-semibold text-kairos-silver text-xs">
                    Time
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-kairos-silver text-xs">
                    Timing
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-kairos-silver text-xs">
                    Value
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-kairos-silver text-xs">
                    Meal
                  </th>
                </tr>
              </thead>
              <tbody>
                {readings.slice().reverse().map((reading) => (
                  <tr key={reading.id} className="border-b border-kairos-border/30">
                    <td className="py-2 px-3 text-kairos-silver-dark">
                      {formatDate(reading.createdAt)}
                    </td>
                    <td className="py-2 px-3 text-kairos-silver">{reading.timing}</td>
                    <td className={`py-2 px-3 font-semibold ${getReadingColor(reading.valueMgdl)}`}>
                      {reading.valueMgdl}
                    </td>
                    <td className="py-2 px-3 text-kairos-silver-dark text-xs">
                      {reading.mealDescription || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {readings.length === 0 && (
        <div className="p-4 rounded border border-kairos-border text-center">
          <p className="text-sm font-body text-kairos-silver-dark">
            No readings logged yet.
          </p>
        </div>
      )}
    </div>
  );
};
