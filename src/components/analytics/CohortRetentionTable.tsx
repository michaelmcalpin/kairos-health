"use client";

import type { RetentionSummary } from "@/lib/analytics/types";

interface CohortRetentionTableProps {
  data: RetentionSummary;
}

export function CohortRetentionTable({ data }: CohortRetentionTableProps) {
  const maxMonths = Math.max(...data.cohorts.map((c) => c.retention.length));

  return (
    <div className="kairos-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-bold text-lg text-white">Cohort Retention</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-gray-500">30-day avg: </span>
            <span className="text-white font-bold">{data.avgRetention30Day}%</span>
          </div>
          <div>
            <span className="text-gray-500">90-day avg: </span>
            <span className="text-white font-bold">{data.avgRetention90Day}%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-500 pb-3 pr-4">Cohort</th>
              <th className="text-center text-xs text-gray-500 pb-3 px-2">Users</th>
              {Array.from({ length: maxMonths }).map((_, i) => (
                <th key={`m${i}`} className="text-center text-xs text-gray-500 pb-3 px-2">
                  M{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((cohort, idx) => (
              <tr
                key={cohort.cohort}
                className={idx !== data.cohorts.length - 1 ? "border-b border-gray-800" : ""}
              >
                <td className="text-sm text-white py-3 pr-4 whitespace-nowrap">{cohort.label}</td>
                <td className="text-center py-3 px-2 text-sm text-gray-400">{cohort.totalUsers}</td>
                {cohort.retention.map((rate, i) => {
                  const opacity = rate / 100;
                  return (
                    <td
                      key={`${cohort.cohort}-m${i}`}
                      className="text-center py-3 px-2"
                      style={{
                        backgroundColor: `rgba(212, 175, 55, ${opacity * 0.3})`,
                      }}
                    >
                      <span className="text-sm text-white">{rate}%</span>
                    </td>
                  );
                })}
                {/* Fill empty cells */}
                {Array.from({ length: maxMonths - cohort.retention.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="text-center py-3 px-2">
                    <span className="text-sm text-gray-700">—</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
