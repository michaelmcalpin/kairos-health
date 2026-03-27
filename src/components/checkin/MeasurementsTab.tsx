'use client';

import React from 'react';
import { Ruler } from 'lucide-react';

interface MeasurementsTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export const MeasurementsTab: React.FC<MeasurementsTabProps> = ({ data, onChange }) => {
  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center gap-2">
        <Ruler className="w-5 h-5 text-kairos-gold" />
        <h2 className="font-heading font-semibold text-white">Measurements</h2>
      </div>

      {/* Weight (from vitals) */}
      <div className="p-3 rounded border border-kairos-border/50 bg-kairos-gold/5">
        <p className="text-xs font-body text-kairos-silver-dark mb-1">Weight (from Vitals)</p>
        <p className="text-lg font-semibold text-kairos-gold">
          {data.weight ? `${data.weight} lbs` : '—'}
        </p>
      </div>

      {/* Circumference Measurements */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-kairos-silver">Body Measurements (inches)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-body text-kairos-silver">Chest</label>
            <input
              type="number"
              step="0.1"
              value={data.chest ?? ''}
              onChange={(e) => onChange('chest', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="40.0"
              className="kairos-input w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-body text-kairos-silver">Waist</label>
            <input
              type="number"
              step="0.1"
              value={data.waist ?? ''}
              onChange={(e) => onChange('waist', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="32.0"
              className="kairos-input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-body text-kairos-silver">Hips</label>
            <input
              type="number"
              step="0.1"
              value={data.hips ?? ''}
              onChange={(e) => onChange('hips', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="38.5"
              className="kairos-input w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-body text-kairos-silver">Right Thigh</label>
            <input
              type="number"
              step="0.1"
              value={data.rightThigh ?? ''}
              onChange={(e) => onChange('rightThigh', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="22.5"
              className="kairos-input w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body text-kairos-silver">Right Bicep</label>
          <input
            type="number"
            step="0.1"
            value={data.rightBicep ?? ''}
            onChange={(e) => onChange('rightBicep', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="14.5"
            className="kairos-input w-full"
          />
        </div>
      </div>

      {/* Progress Photos Section */}
      <div className="space-y-3 p-4 rounded border border-kairos-border/50 bg-kairos-gold/5">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-kairos-silver">Progress Photos</h3>
          <p className="text-xs font-body text-kairos-silver-dark">
            Monthly progress photos help visualize body composition changes.
          </p>
        </div>

        <div className="border-2 border-dashed border-kairos-border rounded-lg p-6 text-center hover:border-kairos-gold/50 transition-colors cursor-pointer">
          <div className="space-y-2">
            <div className="text-kairos-gold">
              <svg
                className="w-8 h-8 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-body text-kairos-silver">
                Drag and drop or click to upload
              </p>
              <p className="text-xs font-body text-kairos-silver-dark">
                Front, side, and back photos recommended
              </p>
            </div>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                const fileList = Array.from(files).map((f) => ({
                  name: f.name,
                  size: f.size,
                }));
                onChange('progressPhotos', fileList);
              }
            }}
          />
        </div>

        {data.progressPhotos && Array.isArray(data.progressPhotos) && data.progressPhotos.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-body text-kairos-silver-dark">
              {data.progressPhotos.length} photo{data.progressPhotos.length !== 1 ? 's' : ''} selected
            </p>
            <ul className="space-y-1">
              {data.progressPhotos.map((photo: any, idx: number) => (
                <li key={idx} className="text-xs font-body text-kairos-silver-dark">
                  • {typeof photo === 'string' ? photo : photo.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="text-xs font-body text-kairos-silver-dark space-y-1">
        <p>• Measurements best taken in the morning before eating</p>
        <p>• Use the same measuring tape location each month for consistency</p>
        <p>• Track progress even if weight stays the same (body recomposition)</p>
      </div>
    </div>
  );
};
