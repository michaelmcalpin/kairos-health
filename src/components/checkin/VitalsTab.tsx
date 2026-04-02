'use client';

import React, { useState } from 'react';
import { Activity, Camera, Image, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ProgressPhoto {
  id: string;
  url: string;
  pose: 'front' | 'side' | 'back';
  timestamp: string;
}

interface VitalsTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  dataSources?: Record<string, string>;
}

const POSE_OPTIONS = [
  { id: 'front', label: 'Front', emoji: '🧍' },
  { id: 'side', label: 'Side', emoji: '🧍' },
  { id: 'back', label: 'Back', emoji: '🧍' },
] as const;

let uidCounter = 0;
const uid = () => `${Date.now().toString(36)}_${(++uidCounter).toString(36)}`;

export const VitalsTab: React.FC<VitalsTabProps> = ({
  data,
  onChange,
  dataSources = {},
}) => {
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [selectedPose, setSelectedPose] = useState<'front' | 'side' | 'back'>('front');
  const progressPhotos = (Array.isArray(data.progressPhotos) ? data.progressPhotos : []) as ProgressPhoto[];

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

  // ── Progress photo handlers ──
  const addProgressPhoto = (pose: 'front' | 'side' | 'back') => {
    // In production: trigger file upload → S3/R2 → return URL
    // For now, create a placeholder entry
    const photo: ProgressPhoto = {
      id: uid(),
      url: 'pending-upload',
      pose,
      timestamp: new Date().toISOString(),
    };
    onChange('progressPhotos', [...progressPhotos, photo]);
  };

  const removeProgressPhoto = (photoId: string) => {
    onChange('progressPhotos', progressPhotos.filter((p) => p.id !== photoId));
  };

  // ── Which poses already have a photo today ──
  const posesTaken = new Set(progressPhotos.map((p) => p.pose));

  return (
    <div className="space-y-6">
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
            value={(data.weight as number) || 0}
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
              value={(data.sleepHours as number) || 0}
              onChange={(e) => onChange('sleepHours', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="7.5"
              className="kairos-input w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-body text-kairos-silver">
              Sleep Quality
              <span className="ml-2 text-kairos-gold font-semibold">{(data.sleepQuality as number) || 0}/10</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={(data.sleepQuality as number) || 5}
              onChange={(e) => onChange('sleepQuality', parseInt(e.target.value))}
              className={`w-full h-2 bg-kairos-border rounded-lg appearance-none cursor-pointer ${getSliderColor(
                (data.sleepQuality as number) || 5
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
              value={(data.hrv as number) || 0}
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
              value={(data.readiness as number) || 0}
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
            value={(data.steps as number) || 0}
            onChange={(e) => onChange('steps', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="8500"
            className="kairos-input w-full"
          />
        </div>

        <div className="text-xs font-body text-kairos-silver-dark">
          Data auto-populated from connected devices will be marked &quot;Auto&quot;.
        </div>
      </div>

      {/* Progress Photos Section */}
      <div className="kairos-card space-y-4">
        <button
          onClick={() => setShowPhotoSection(!showPhotoSection)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-semibold text-white">Progress Photos</h2>
            {progressPhotos.length > 0 && (
              <span className="text-xs font-body text-kairos-silver-dark">
                {progressPhotos.length} photo{progressPhotos.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {showPhotoSection ? (
            <ChevronUp size={16} className="text-kairos-silver" />
          ) : (
            <ChevronDown size={16} className="text-kairos-silver" />
          )}
        </button>

        {showPhotoSection && (
          <div className="space-y-4">
            {/* Pose selector + upload */}
            <div className="grid grid-cols-3 gap-3">
              {POSE_OPTIONS.map((pose) => {
                const hasPose = posesTaken.has(pose.id);
                return (
                  <div key={pose.id} className="space-y-2">
                    <button
                      onClick={() => {
                        if (!hasPose) {
                          setSelectedPose(pose.id);
                          addProgressPhoto(pose.id);
                        }
                      }}
                      className={`w-full aspect-[3/4] rounded-kairos-sm border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                        hasPose
                          ? 'border-kairos-gold/50 bg-kairos-gold/5'
                          : 'border-kairos-border hover:border-kairos-gold/30 cursor-pointer'
                      }`}
                    >
                      {hasPose ? (
                        <>
                          <Image size={24} className="text-kairos-gold" />
                          <span className="text-xs font-body text-kairos-gold">Uploaded</span>
                        </>
                      ) : (
                        <>
                          <Camera size={24} className="text-kairos-silver-dark" />
                          <span className="text-xs font-body text-kairos-silver-dark">Tap to add</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs font-body text-kairos-silver text-center">{pose.label}</p>
                    {hasPose && (
                      <button
                        onClick={() => {
                          const photo = progressPhotos.find((p) => p.pose === pose.id);
                          if (photo) removeProgressPhoto(photo.id);
                        }}
                        className="w-full text-center text-[10px] font-body text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded border border-kairos-border bg-kairos-gold/5">
              <p className="text-xs font-body text-kairos-silver-dark">
                Progress photos help your trainer track visual changes over time. For best results, use consistent lighting, distance, and poses.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
