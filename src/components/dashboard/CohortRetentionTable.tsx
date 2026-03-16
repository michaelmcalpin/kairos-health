"use client";

import { HeatMap } from "@/components/charts";

/**
 * Cohort retention heat map for admin analytics.
 * Shows user retention by signup month across 6 months.
 */

interface CohortData {
  cohort: string;
  totalUsers: number;
  retention: number[];
}

interface CohortRetentionTableProps {
  cohorts: CohortData[];
}

export function CohortRetentionTable({ cohorts }: CohortRetentionTableProps) {
  if (cohorts.length === 0) {
    return (
      <div className="kairos-card p-5">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-4">
          Cohort Retention
        </h3>
        <p className="text-sm text-kairos-silver-dark">
          Not enough data to display cohort retention. Check back once users have been active for at least one month.
        </p>
      </div>
    );
  }

  const maxMonths = Math.max(...cohorts.map((c) => c.retention.length));
  const columnLabels = Array.from({ length: maxMonths }, (_, i) =>
    i === 0 ? "M0" : `M${i}`
  );

  const rows = cohorts.map((c) => ({
    label: c.cohort,
    values: c.retention,
  }));

  return (
    <div className="kairos-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver">
          Cohort Retention
        </h3>
        <div className="flex items-center gap-2 text-xs text-kairos-silver-dark">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-500 opacity-80" />
            &gt;60%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-amber-500 opacity-80" />
            40-60%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-red-500 opacity-80" />
            &lt;40%
          </span>
        </div>
      </div>

      {/* Cohort sizes */}
      <div className="mb-4 flex flex-wrap gap-2">
        {cohorts.map((c) => (
          <span
            key={c.cohort}
            className="rounded-full bg-kairos-royal-dark px-2.5 py-0.5 text-xs text-kairos-silver-dark"
          >
            {c.cohort}: <span className="font-medium text-kairos-silver">{c.totalUsers}</span> users
          </span>
        ))}
      </div>

      <HeatMap rows={rows} columnLabels={columnLabels} />
    </div>
  );
}
