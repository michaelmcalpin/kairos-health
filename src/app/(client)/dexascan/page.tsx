"use client";

import { Scan } from "lucide-react";

export default function DexaScanPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">DexaScan</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          Body composition analysis via DEXA scanning
        </p>
      </div>

      <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-4">
          <Scan size={32} className="text-kairos-gold" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-white mb-2">Coming Soon</h2>
        <p className="text-sm font-body text-kairos-silver-dark max-w-md">
          Upload and track your DEXA scan results to monitor bone density,
          lean mass, and fat distribution over time.
        </p>
      </div>
    </div>
  );
}
