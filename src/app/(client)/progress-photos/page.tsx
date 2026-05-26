"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Calendar, ImageIcon, X, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

type PoseType = "front" | "side" | "back";

const POSE_LABELS: Record<PoseType, string> = { front: "Front", side: "Side", back: "Back" };

export default function ProgressPhotosPage() {
  const utils = trpc.useUtils();
  const { data: photos = [], isLoading } = trpc.clientPortal.progressPhotos.getRecent.useQuery(
    { limit: 20 },
    { retry: false }
  );

  const addPhoto = trpc.clientPortal.progressPhotos.add.useMutation({
    onSuccess: () => {
      utils.clientPortal.progressPhotos.getRecent.invalidate();
      setShowUpload(false);
      setPreviewUrl(null);
      setSelectedPose("front");
    },
  });

  const deletePhoto = trpc.clientPortal.progressPhotos.delete.useMutation({
    onSuccess: () => utils.clientPortal.progressPhotos.getRecent.invalidate(),
  });

  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState<PoseType>("front");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleUpload() {
    if (!previewUrl) return;
    addPhoto.mutate({
      date: new Date().toISOString().split("T")[0],
      photoUrls: [previewUrl],
      poseType: selectedPose,
    });
  }

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
        <button
          onClick={() => setShowUpload(true)}
          className="kairos-btn-gold flex items-center gap-2"
        >
          <Camera size={16} />
          <span className="font-heading text-sm">Add Photo</span>
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Upload Progress Photo</h3>
            <button
              onClick={() => { setShowUpload(false); setPreviewUrl(null); }}
              className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Pose selector */}
          <div className="flex gap-2 mb-4">
            {(["front", "side", "back"] as PoseType[]).map((pose) => (
              <button
                key={pose}
                onClick={() => setSelectedPose(pose)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-colors",
                  selectedPose === pose
                    ? "bg-kairos-gold text-kairos-royal-dark"
                    : "bg-kairos-royal-surface border border-kairos-border text-kairos-silver-dark hover:text-white"
                )}
              >
                {POSE_LABELS[pose]}
              </button>
            ))}
          </div>

          {/* File input / Preview */}
          {previewUrl ? (
            <div className="relative mb-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-xl bg-kairos-royal-surface"
              />
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-kairos-border rounded-xl py-12 flex flex-col items-center gap-3 hover:border-kairos-gold/40 transition-colors mb-4"
            >
              <Upload size={28} className="text-kairos-silver-dark" />
              <p className="text-sm font-body text-kairos-silver-dark">
                Tap to select a photo
              </p>
              <p className="text-xs font-body text-kairos-silver-dark/60">JPG, PNG up to 10MB</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={handleUpload}
            disabled={!previewUrl || addPhoto.isPending}
            className="w-full kairos-btn-gold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addPhoto.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-kairos-royal-dark border-t-transparent rounded-full" />
            ) : (
              <Check size={16} />
            )}
            <span className="font-heading text-sm">
              {addPhoto.isPending ? "Uploading..." : "Save Photo"}
            </span>
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="kairos-card flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full" />
        </div>
      )}

      {/* Photos Grid */}
      {!isLoading && photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(selectedPhoto === photo.id ? null : photo.id)}
              className={cn(
                "kairos-card p-0 aspect-square flex flex-col items-center justify-center overflow-hidden rounded-xl relative group",
                selectedPhoto === photo.id && "ring-2 ring-kairos-gold"
              )}
            >
              {photo.photoUrls?.[0] ? (
                <img
                  src={photo.photoUrls[0]}
                  alt={photo.poseType ?? "Progress photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={32} className="text-kairos-silver-dark" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <div>
                    {photo.poseType && (
                      <span className="text-[10px] font-heading font-semibold text-white/80 uppercase">
                        {photo.poseType}
                      </span>
                    )}
                    {photo.date && (
                      <p className="text-[10px] font-body text-white/60">{photo.date}</p>
                    )}
                  </div>
                  {selectedPhoto === photo.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto.mutate({ id: photo.id });
                        setSelectedPhoto(null);
                      }}
                      className="p-1 rounded bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && photos.length === 0 && !showUpload && (
        <div className="kairos-card flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-kairos-royal-surface flex items-center justify-center mb-4">
            <Camera size={32} className="text-kairos-silver-dark" />
          </div>
          <h3 className="font-heading font-semibold text-white text-lg mb-2">No Photos Yet</h3>
          <p className="text-sm font-body text-kairos-silver-dark text-center max-w-sm mb-6">
            Take your first progress photo to start tracking your visual transformation.
            Consistent photos help you see changes that the scale can&apos;t measure.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="kairos-btn-outline flex items-center gap-2"
          >
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
