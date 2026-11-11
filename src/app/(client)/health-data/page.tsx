"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { HealthDataView } from "@/components/health/HealthDataView";
import { MetricTrendCard } from "@/components/charts/MetricTrendCard";
import { METRIC_BY_KEY } from "@/lib/health/metrics";

/** Metrics to open on, in order, when the client has data for them. */
const PREFERRED = ["sleep_total_min", "hrv", "resting_hr", "steps", "readiness", "weight", "glucose"];

export default function HealthDataPage() {
  const q = trpc.clientPortal.healthData.summary.useQuery(undefined, { retry: false });
  const available = useMemo(
    () => (q.data?.groups ?? []).flatMap((g) => g.metrics.map((m) => ({ key: m.key, label: m.label, group: g.title }))),
    [q.data],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const metric = picked && available.some((a) => a.key === picked)
    ? picked
    : PREFERRED.find((k) => available.some((a) => a.key === k)) ?? available[0]?.key ?? null;
  const def = metric ? METRIC_BY_KEY[metric] : null;
  // Sleep durations read better in hours.
  const asHours = def?.group === "sleep" && def.unit === "min";

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
        <>
          {metric && def ? (
            <MetricTrendCard
              key={metric}
              title={`${def.label} trend`}
              subtitle={def.about}
              views={[{ id: metric, label: def.label, lines: [{ key: metric }], ...(asHours ? { factor: 1 / 60, unit: "h", decimals: 1 } : {}) }]}
              empty={{ message: "connect Apple Health, Oura or another device.", actions: [{ label: "Connect a device", href: "/settings" }] }}
              headerAction={
                <label className="flex items-center gap-2 text-xs text-kairos-silver-dark">
                  <span className="sr-only sm:not-sr-only">Metric</span>
                  <select value={metric} onChange={(e) => setPicked(e.target.value)}
                    className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-2 py-1.5 text-xs focus:border-sky-400 focus:outline-none">
                    {available.map((a) => <option key={a.key} value={a.key}>{a.group}: {a.label}</option>)}
                  </select>
                </label>
              }
            />
          ) : (
            <MetricTrendCard
              title="Your trends"
              views={[{ id: "sleep", label: "Time asleep", lines: [{ key: "sleep_total_min" }], factor: 1 / 60, unit: "h", decimals: 1 }]}
              empty={{ message: "connect Apple Health, Oura or another device.", actions: [{ label: "Connect a device", href: "/settings" }] }}
            />
          )}
          <HealthDataView data={q.data} />
        </>
      ) : null}
    </div>
  );
}
