"use client";

import { useState } from "react";
import type { WeeklyHealthReport } from "@/lib/ai/types";
import { InsightCard } from "./InsightCard";

interface WeeklyReportCardProps {
  report: WeeklyHealthReport;
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps) {
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scoreColor =
    report.overallScore >= 80 ? "text-emerald-600" :
    report.overallScore >= 60 ? "text-amber-600" :
    "text-red-600";

  const changeIcon =
    report.scoreChange > 0 ? "↑" :
    report.scoreChange < 0 ? "↓" :
    "→";

  const displayInsights = showAllInsights ? report.insights : report.insights.slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-kairos-royal to-kairos-royal-dark p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Weekly Health Report</p>
            <p className="mt-1 text-sm text-white/80">
              {report.weekStart} — {report.weekEnd}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-heading font-bold ${scoreColor} bg-white rounded-xl px-4 py-2`}>
              {report.overallScore}
            </p>
            <p className={`mt-1 text-sm font-medium ${report.scoreChange >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {changeIcon} {Math.abs(report.scoreChange)} pts from last week
            </p>
          </div>
        </div>
      </div>

      {/* Wins & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {/* Top Wins */}
        <div className="rounded-xl bg-emerald-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-xs">✓</span>
            This Week&apos;s Wins
          </h3>
          {report.topWins.length > 0 ? (
            <ul className="space-y-2">
              {report.topWins.map((win, i) => (
                <li key={i} className="text-sm text-emerald-700 leading-relaxed">
                  {win}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-600/60">Keep tracking to earn wins!</p>
          )}
        </div>

        {/* Areas to Improve */}
        <div className="rounded-xl bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs">↑</span>
            Focus Areas
          </h3>
          {report.areasToImprove.length > 0 ? (
            <ul className="space-y-2">
              {report.areasToImprove.map((area, i) => (
                <li key={i} className="text-sm text-amber-700 leading-relaxed">
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-600/60">Great job — no major areas of concern!</p>
          )}
        </div>
      </div>

      {/* Coach Note */}
      {report.coachNote && (
        <div className="mx-6 mb-4 rounded-xl bg-purple-50 border border-purple-100 p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            Trainer Note
          </p>
          <p className="text-sm text-purple-800 leading-relaxed">{report.coachNote}</p>
        </div>
      )}

      {/* Detailed Insights */}
      <div className="border-t border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            Detailed Insights ({report.insights.length})
          </h3>
          {report.insights.length > 5 && (
            <button
              onClick={() => setShowAllInsights(!showAllInsights)}
              className="text-xs font-medium text-kairos-royal hover:text-kairos-royal-dark transition-colors"
            >
              {showAllInsights ? "Show less" : `Show all ${report.insights.length}`}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {displayInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={expandedId === insight.id}
              onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
        <p className="text-xs text-gray-400 text-center">
          Generated {new Date(report.generatedAt).toLocaleString()} • KAIROS AI Health Engine
        </p>
      </div>
    </div>
  );
}
