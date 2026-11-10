"use client";

import { Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { HealthDataView } from "@/components/health/HealthDataView";

export default function HealthDataPage() {
  const q = trpc.clientPortal.healthData.summary.useQuery(undefined, { retry: false });
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Health Data</h1>
        <p className="text-gray-400 mt-1 max-w-2xl text-sm">
          Everything your devices share, from Apple Health, Oura and more. Tap a name to learn what it means.
          These numbers feed the Physical part of your LifeScore.
        </p>
      </div>
      {q.isLoading ? (
        <div className="kairos-card flex items-center justify-center py-16"><Loader2 className="animate-spin text-kairos-gold" /></div>
      ) : q.error ? (
        <div className="kairos-card text-center text-sm text-gray-400 py-10">Couldn&apos;t load your health data. Please try again.</div>
      ) : q.data ? (
        <HealthDataView data={q.data} />
      ) : null}
    </div>
  );
}
