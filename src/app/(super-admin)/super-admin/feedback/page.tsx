"use client";

/**
 * Super-admin Feedback page.
 *
 * Stats overview, filterable table of user-submitted feedback
 * (bugs / feature requests / redesign suggestions), inline status
 * triage, and an on-demand AI consolidation of the last 7 days.
 */

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type FeedbackType = "bug" | "feature" | "redesign";
type FeedbackStatus = "new" | "reviewed" | "resolved";
type FeedbackPlatform = "web" | "mobile";

const TYPE_BADGE: Record<FeedbackType, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  feature: { label: "Feature", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  redesign: { label: "Redesign", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

const TYPE_FILTERS: Array<{ value: FeedbackType | undefined; label: string }> = [
  { value: undefined, label: "All Types" },
  { value: "bug", label: "Bugs" },
  { value: "feature", label: "Features" },
  { value: "redesign", label: "Redesign" },
];

const STATUS_FILTERS: Array<{ value: FeedbackStatus | undefined; label: string }> = [
  { value: undefined, label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
];

const PLATFORM_FILTERS: Array<{ value: FeedbackPlatform | undefined; label: string }> = [
  { value: undefined, label: "All Platforms" },
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
];

const MESSAGE_TRUNCATE = 120;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function FilterChips<T extends string | undefined>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onChange(opt.value)}
          className={
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
            (value === opt.value
              ? "bg-kairos-gold/15 text-kairos-gold border-kairos-gold/40"
              : "bg-transparent text-gray-400 border-white/10 hover:text-white hover:border-white/25")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [typeFilter, setTypeFilter] = useState<FeedbackType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [platformFilter, setPlatformFilter] = useState<FeedbackPlatform | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<{ text: string; itemCount: number } | null>(null);

  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.feedback.stats.useQuery(undefined, { staleTime: 30_000 });
  const { data: list, isLoading } = trpc.admin.feedback.list.useQuery(
    { type: typeFilter, status: statusFilter, platform: platformFilter, limit: 100 },
    { staleTime: 15_000 },
  );

  const updateStatusMutation = trpc.admin.feedback.updateStatus.useMutation({
    onSuccess: () => {
      utils.admin.feedback.list.invalidate();
      utils.admin.feedback.stats.invalidate();
    },
  });

  const consolidateMutation = trpc.admin.feedback.consolidate.useMutation({
    onSuccess: (data) => {
      setAnalysis({ text: data.analysis, itemCount: data.itemCount });
    },
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const items = list?.items ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Feedback</h1>
          <p className="text-gray-400 mt-1">
            Bug reports, feature requests, and redesign suggestions from all users.
          </p>
        </div>
        <button
          onClick={() => consolidateMutation.mutate({ days: 7 })}
          disabled={consolidateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-kairos-sm bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/40 text-sm font-medium hover:bg-kairos-gold/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {consolidateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {consolidateMutation.isPending ? "Analyzing..." : "AI Consolidate (7 days)"}
        </button>
      </div>

      {/* Consolidation error */}
      {consolidateMutation.isError && (
        <div className="kairos-card p-4 mb-6 border border-red-500/30">
          <p className="text-sm text-red-400">
            {consolidateMutation.error?.message ?? "AI consolidation failed."}
          </p>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="kairos-card p-5 mb-6 border border-kairos-gold/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-kairos-gold" />
              <h2 className="font-heading font-semibold text-white text-sm">
                AI Consolidated Analysis — last 7 days ({analysis.itemCount} item{analysis.itemCount === 1 ? "" : "s"})
              </h2>
            </div>
            <button
              onClick={() => setAnalysis(null)}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Dismiss analysis"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {analysis.text}
          </p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-xl font-heading font-bold text-white">{stats?.total ?? 0}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">New</p>
          <p className="text-xl font-heading font-bold text-kairos-gold">{stats?.byStatus.new ?? 0}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last 7 Days</p>
          <p className="text-xl font-heading font-bold text-white">{stats?.last7Days ?? 0}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Bugs</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats?.byType.bug ?? 0}</p>
        </div>
        <div className="kairos-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Features</p>
          </div>
          <p className="text-xl font-heading font-bold text-white">{stats?.byType.feature ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <FilterChips options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
        <div className="w-px h-5 bg-white/10" />
        <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        <div className="w-px h-5 bg-white/10" />
        <FilterChips options={PLATFORM_FILTERS} value={platformFilter} onChange={setPlatformFilter} />
      </div>

      {/* Feedback Table */}
      <div className="kairos-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Date</th>
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">User</th>
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Platform / Page</th>
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Type</th>
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Message</th>
              <th className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  <Loader2 size={18} className="animate-spin inline-block mr-2 align-middle" />
                  Loading feedback...
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No feedback matches the current filters.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const badge = TYPE_BADGE[item.type as FeedbackType] ?? TYPE_BADGE.bug;
              const expanded = expandedIds.has(item.id);
              const isLong = item.message.length > MESSAGE_TRUNCATE;
              const displayMessage =
                !isLong || expanded ? item.message : item.message.slice(0, MESSAGE_TRUNCATE) + "…";
              const userName =
                [item.userFirstName, item.userLastName].filter(Boolean).join(" ") || "Unknown user";

              return (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] align-top">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{userName}</p>
                    <p className="text-gray-500 text-[11px]">{item.userEmail ?? "—"}</p>
                    {item.role && (
                      <p className="text-kairos-silver-dark text-[10px] uppercase tracking-wider mt-0.5">
                        {item.role.replace(/_/g, " ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="text-gray-300 capitalize">{item.platform ?? "—"}</p>
                    <p className="text-gray-500 text-[11px] break-all max-w-[160px]">{item.page ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p
                      className={
                        "text-gray-300 text-xs whitespace-pre-wrap " + (isLong ? "cursor-pointer" : "")
                      }
                      onClick={isLong ? () => toggleExpanded(item.id) : undefined}
                      title={isLong ? (expanded ? "Click to collapse" : "Click to expand") : undefined}
                    >
                      {displayMessage}
                    </p>
                    {item.aiSummary && (
                      <p className="text-kairos-silver-dark text-[11px] mt-1.5 italic">
                        AI: {item.aiSummary}
                      </p>
                    )}
                    {item.aiTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.aiTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status ?? "new"}
                      onChange={(e) =>
                        updateStatusMutation.mutate({
                          id: item.id,
                          status: e.target.value as FeedbackStatus,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      className="bg-transparent border border-white/15 rounded-kairos-sm px-2 py-1 text-xs text-gray-300 hover:border-white/30 focus:outline-none focus:border-kairos-gold/50 disabled:opacity-50 [&>option]:bg-gray-900"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {list && list.total > items.length && (
        <p className="text-xs text-gray-500 mt-3">
          Showing {items.length} of {list.total} items.
        </p>
      )}
    </div>
  );
}
