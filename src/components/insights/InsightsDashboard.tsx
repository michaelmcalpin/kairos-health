"use client";

import { useState, useMemo } from "react";
import type { HealthInsight, InsightCategory, InsightSeverity } from "@/lib/ai/types";
import { InsightCard } from "./InsightCard";

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

const CATEGORY_TABS: { value: InsightCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "glucose", label: "Glucose" },
  { value: "sleep", label: "Sleep" },
  { value: "nutrition", label: "Nutrition" },
  { value: "activity", label: "Activity" },
  { value: "supplements", label: "Supplements" },
  { value: "fasting", label: "Fasting" },
  { value: "composite", label: "Overall" },
];

const SEVERITY_TABS: { value: InsightSeverity | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
  { value: "warning", label: "Attention", color: "bg-amber-100 text-amber-700" },
  { value: "info", label: "Info", color: "bg-blue-100 text-blue-700" },
  { value: "positive", label: "Wins", color: "bg-emerald-100 text-emerald-700" },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface InsightsDashboardProps {
  insights: HealthInsight[];
  title?: string;
  showFilters?: boolean;
}

export function InsightsDashboard({
  insights,
  title = "Health Insights",
  showFilters = true,
}: InsightsDashboardProps) {
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<InsightSeverity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = insights;
    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (severityFilter !== "all") {
      result = result.filter((i) => i.severity === severityFilter);
    }
    return result;
  }, [insights, categoryFilter, severityFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const map: Record<string, number> = { critical: 0, warning: 0, info: 0, positive: 0 };
    for (const i of insights) {
      map[i.severity] = (map[i.severity] ?? 0) + 1;
    }
    return map;
  }, [insights]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2 text-xs">
          {counts.critical > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
              {counts.critical} critical
            </span>
          )}
          {counts.warning > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
              {counts.warning} attention
            </span>
          )}
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
            {counts.positive} wins
          </span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-2">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategoryFilter(tab.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === tab.value
                    ? "bg-[#122055] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Severity pills */}
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSeverityFilter(tab.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  severityFilter === tab.value
                    ? tab.value === "all" ? "bg-[#122055] text-white" : tab.color
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                {tab.value !== "all" && counts[tab.value] ? ` (${counts[tab.value]})` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Insight Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No insights match the current filters.</p>
          </div>
        ) : (
          filtered.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={expandedId === insight.id}
              onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
