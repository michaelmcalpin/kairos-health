"use client";

import type { HealthInsight } from "@/lib/ai/types";

// ─── Severity Styles ─────────────────────────────────────────────────────────

const severityConfig = {
  positive: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: "✓",
    iconBg: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Positive",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    icon: "ℹ",
    iconBg: "bg-blue-100 text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    label: "Info",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: "⚠",
    iconBg: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    label: "Attention",
  },
  critical: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: "!",
    iconBg: "bg-red-100 text-red-700",
    badge: "bg-red-100 text-red-800",
    label: "Critical",
  },
};

const categoryLabels: Record<string, string> = {
  glucose: "Glucose",
  sleep: "Sleep",
  nutrition: "Nutrition",
  activity: "Activity",
  supplements: "Supplements",
  fasting: "Fasting",
  labs: "Labs",
  composite: "Overall",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: HealthInsight;
  expanded?: boolean;
  onToggle?: () => void;
}

export function InsightCard({ insight, expanded = false, onToggle }: InsightCardProps) {
  const config = severityConfig[insight.severity];

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.iconBg} text-sm font-bold`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
              {config.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {categoryLabels[insight.category] ?? insight.category}
            </span>
            {insight.confidence >= 0.9 && (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                High confidence
              </span>
            )}
          </div>
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            {insight.title}
          </h3>
          <p className="mt-1 text-sm text-gray-700">
            {insight.summary}
          </p>
        </div>
      </div>

      {/* Data Points */}
      {insight.dataPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 pl-11">
          {insight.dataPoints.map((dp, i) => (
            <div key={i} className="rounded-lg bg-white/60 px-3 py-1.5 text-xs">
              <span className="font-medium text-gray-500">{dp.metric}:</span>{" "}
              <span className="font-semibold text-gray-900">
                {dp.value}{dp.unit.startsWith("/") || dp.unit === "%" ? dp.unit : ` ${dp.unit}`}
              </span>
              {dp.context && (
                <span className="ml-1 text-gray-400">({dp.context})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expandable Detail + Actions */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="mt-2 pl-11 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pl-11 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">{insight.detail}</p>

          {insight.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recommended Actions
              </p>
              {insight.actions
                .sort((a, b) => a.priority - b.priority)
                .map((action, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-kairos-royal text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{action.label}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
