"use client";

import { Camera, Upload, Calendar, ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ProgressPhotosPage() {
  const { data: photos = [] } = trpc.clientPortal.progressPhotos.getRecent.useQuery(
    { limit: 20 },
    { retry: false }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Progress Photos</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Track your visual transformation over time
          </p>
        </div>
        <button className="kairos-btn-gold flex items-center gap-2">
          <Camera size={16} />
          <span className="font-heading text-sm">Add Photo</span>
        </button>
      </div>

      {/* Photos Grid or Empty State */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="kairos-card aspect-square flex flex-col items-center justify-center overflow-hidden rounded-xl">
              {photo.photoUrls?.[0] ? (
                <img src={photo.photoUrls[0]} alt={photo.poseType ?? "Progress photo"} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={32} className="text-kairos-silver-dark" />
              )}
              {photo.date && (
                <p className="text-[10px] font-body text-kairos-silver-dark mt-1">{photo.date}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="kairos-card flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-kairos-royal-surface flex items-center justify-center mb-4">
            <Camera size={32} className="text-kairos-silver-dark" />
          </div>
          <h3 className="font-heading font-semibold text-white text-lg mb-2">No Photos Yet</h3>
          <p className="text-sm font-body text-kairos-silver-dark text-center max-w-sm mb-6">
            Take your first progress photo to start tracking your visual transformation.
            Consistent photos help you see changes that the scale can&apos;t measure.
          </p>
          <button className="kairos-btn-outline flex items-center gap-2">
            <Upload size={16} />
            <span className="font-heading text-sm">Upload Photo</span>
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-3">Photo Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kairos-gold/10 flex items-center justify-center flex-shrink-0">
              <Camera size={14} className="text-kairos-gold" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-white">Same Pose</p>
              <p className="text-xs font-body text-kairos-silver-dark">Use consistent poses and angles for accurate comparisons</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kairos-gold/10 flex items-center justify-center flex-shrink-0">
              <Calendar size={14} className="text-kairos-gold" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-white">Weekly</p>
              <p className="text-xs font-body text-kairos-silver-dark">Take photos at the same time each week for best results</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kairos-gold/10 flex items-center justify-center flex-shrink-0">
              <ImageIcon size={14} className="text-kairos-gold" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-white">Good Lighting</p>
              <p className="text-xs font-body text-kairos-silver-dark">Natural light works best — avoid harsh shadows</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
