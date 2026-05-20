"use client";

import { Bug } from "lucide-react";

export default function GutBiomePage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">Gut Biome</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          Microbiome analysis and gut health tracking
        </p>
      </div>

      <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-4">
          <Bug size={32} className="text-kairos-gold" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-white mb-2">Coming Soon</h2>
        <p className="text-sm font-body text-kairos-silver-dark max-w-md">
          Upload gut biome test results to track microbial diversity,
          inflammation markers, and receive personalized dietary recommendations.
        </p>
      </div>
    </div>
  );
}
