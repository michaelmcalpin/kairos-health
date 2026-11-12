"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Inbox as InboxIcon,
  MessageSquare,
  RotateCcw,
  WifiOff,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CATEGORY_LABEL,
  SEVERITIES,
  SEVERITY_LABEL,
  STATE_LABEL,
  countInbox,
  filterInbox,
  inboxQuery,
  parseInboxFilter,
  type InboxCategory,
  type InboxFilter,
  type InboxItem,
  type InboxState,
  type StateFilter,
} from "@/lib/coach-inbox/model";

const SEVERITY_STYLE = {
  urgent: { text: "text-red-400", pill: "bg-red-500/15 text-red-400", ring: "border-red-500/50" },
  action: { text: "text-amber-400", pill: "bg-amber-500/15 text-amber-400", ring: "border-amber-500/50" },
  info: { text: "text-kairos-silver", pill: "bg-kairos-silver/10 text-kairos-silver", ring: "border-kairos-silver/40" },
} as const;

const STATE_PILL: Record<InboxState, string> = {
  new: "bg-kairos-gold/15 text-kairos-gold",
  acknowledged: "bg-blue-500/15 text-blue-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
};

const KIND_ICON: Record<InboxItem["kind"], React.ReactNode> = {
  alert: <Bell size={16} />,
  scheduling: <CalendarDays size={16} />,
  hrv: <Activity size={16} />,
  no_data: <WifiOff size={16} />,
  message: <MessageSquare size={16} />,
};

const STATE_FILTER_LABEL: Record<StateFilter, string> = {
  open: "Open",
  new: "New",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  all: "All",
};

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CoachInboxPage() {
  return (
    <Suspense fallback={<div className="kairos-card h-64 animate-pulse bg-gray-800/50" />}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = useMemo(() => parseInboxFilter(searchParams), [searchParams]);
  const setFilter = (patch: Partial<InboxFilter>) =>
    router.replace(`${pathname}${inboxQuery({ ...filter, ...patch })}`, { scroll: false });

  const includeResolved = filter.state === "resolved" || filter.state === "all";
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.coach.inbox.list.useQuery(
    { includeResolved },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );
  const setState = trpc.coach.inbox.setState.useMutation({
    onSuccess: () => {
      void utils.coach.inbox.list.invalidate();
      void utils.coach.dashboard.getToday.invalidate();
      void utils.coach.alerts.activeCount.invalidate();
    },
  });

  const items = data?.items ?? [];
  const counts = countInbox(items, filter);
  const list = filterInbox(items, filter);
  const clientName = filter.clientId ? items.find((i) => i.clientId === filter.clientId)?.clientName ?? "This client" : null;

  const toggleCategory = (c: InboxCategory) => {
    const has = filter.categories.includes(c);
    setFilter({ categories: has ? filter.categories.filter((x) => x !== c) : [...filter.categories, c] });
  };

  const scopeLabel = STATE_FILTER_LABEL[filter.state].toLowerCase();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <h1 className="font-heading font-bold text-2xl text-white">Inbox</h1>
        <p className="text-sm text-kairos-silver-dark mt-0.5">
          {isLoading
            ? "Loading…"
            : `${counts.total} ${scopeLabel}${counts.urgent ? ` · ${counts.urgent} urgent` : ""}`}
        </p>
      </div>

      {/* ── Severity tiles (counts = rows below for the current filters) ── */}
      <div className="grid grid-cols-3 gap-3">
        {SEVERITIES.map((s) => {
          const active = filter.severity === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter({ severity: active ? "all" : s })}
              className={`kairos-card text-left transition-colors hover:border-kairos-gold/40 ${active ? SEVERITY_STYLE[s].ring : ""}`}
            >
              <p className="text-xs font-heading font-semibold uppercase tracking-wide text-kairos-silver-dark">{SEVERITY_LABEL[s]}</p>
              <p className={`font-heading font-bold text-3xl mt-1 tabular-nums ${counts[s] ? SEVERITY_STYLE[s].text : "text-white"}`}>
                {isLoading ? "–" : counts[s]}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1" role="group" aria-label="State">
          {(["open", "new", "acknowledged", "resolved", "all"] as StateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter({ state: f })}
              className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${
                filter.state === f ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              {STATE_FILTER_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap" role="group" aria-label="Category">
          <Chip active={filter.categories.length === 0} onClick={() => setFilter({ categories: [] })}>All types</Chip>
          {(["health", "messages", "sessions"] as InboxCategory[]).map((c) => (
            <Chip key={c} active={filter.categories.includes(c)} onClick={() => toggleCategory(c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
        {clientName && (
          <button
            onClick={() => setFilter({ clientId: null })}
            className="inline-flex items-center gap-1 text-xs font-heading font-semibold px-2.5 py-1 rounded-full bg-kairos-gold/15 text-kairos-gold"
          >
            {clientName} <X size={12} aria-label="Clear client filter" />
          </button>
        )}
      </div>

      {includeResolved && (
        <p className="text-xs text-kairos-silver-dark -mt-3">
          Resolved shows alerts resolved in the last 30 days. HRV, device and message items leave the Inbox by themselves once the client syncs or you reply.
        </p>
      )}

      {/* ── List ── */}
      {error ? (
        <div className="kairos-card">
          <p className="text-sm text-red-400/80">Couldn&apos;t load the Inbox. Please refresh.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse bg-gray-800/50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="kairos-card py-12 text-center">
          {filter.state === "open" || filter.state === "new" ? (
            <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/60" />
          ) : (
            <InboxIcon size={32} className="mx-auto mb-3 text-gray-600" />
          )}
          <p className="text-sm font-heading font-semibold text-white">{emptyTitle(filter)}</p>
          <p className="text-sm text-kairos-silver-dark mt-1">
            Alerts, client messages, HRV changes and missing device data all land here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <li key={item.key} className={`kairos-card flex items-start gap-3 ${item.state === "resolved" ? "opacity-70" : ""}`}>
              <span className={`mt-0.5 shrink-0 ${SEVERITY_STYLE[item.severity].text}`} aria-hidden>
                {KIND_ICON[item.kind]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-heading font-semibold rounded-full px-2 py-0.5 ${SEVERITY_STYLE[item.severity].pill}`}>
                    {SEVERITY_LABEL[item.severity]}
                  </span>
                  <span className={`text-xs font-heading font-semibold rounded-full px-2 py-0.5 ${STATE_PILL[item.state]}`}>
                    {STATE_LABEL[item.state]}
                  </span>
                  <Link
                    href={`/trainer/clients/${item.clientId}`}
                    className="text-sm font-heading font-semibold text-white hover:text-kairos-gold transition-colors"
                  >
                    {item.clientName}
                  </Link>
                  <span className="text-xs text-kairos-silver-dark">{relativeTime(item.timestamp)}</span>
                </div>
                <p className="text-sm font-heading font-semibold text-white mt-1">{item.title}</p>
                {item.detail && <p className="text-sm text-kairos-silver-dark mt-0.5 line-clamp-4">{item.detail}</p>}
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                <Link
                  href={item.action.href}
                  className="text-xs font-heading font-semibold px-3 py-1.5 rounded-lg border border-kairos-gold/40 text-kairos-gold hover:bg-kairos-gold/10 transition-colors"
                >
                  {item.action.label}
                </Link>
                <StateButtons
                  item={item}
                  pending={setState.isPending && setState.variables?.key === item.key}
                  onSet={(state) => setState.mutate({ key: item.key, state })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function emptyTitle(f: InboxFilter): string {
  if (f.state === "open" || f.state === "new") return "Nothing needs you right now";
  if (f.state === "acknowledged") return "Nothing acknowledged and waiting";
  if (f.state === "resolved") return "Nothing resolved in the last 30 days";
  return "Nothing here";
}

function StateButtons({ item, pending, onSet }: { item: InboxItem; pending: boolean; onSet: (s: InboxState) => void }) {
  const base = "text-xs font-heading font-semibold px-3 py-1.5 rounded-lg border border-kairos-border text-kairos-silver hover:text-white hover:bg-gray-800/50 transition-colors disabled:opacity-50";
  if (item.state === "resolved") {
    return (
      <button className={`${base} inline-flex items-center gap-1`} disabled={pending} onClick={() => onSet("new")}>
        <RotateCcw size={12} /> Reopen
      </button>
    );
  }
  return (
    <>
      {item.state === "new" && (
        <button className={base} disabled={pending} onClick={() => onSet("acknowledged")}>
          Acknowledge
        </button>
      )}
      <button className={base} disabled={pending} onClick={() => onSet("resolved")}>
        Resolve
      </button>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-full border transition-colors ${
        active ? "border-kairos-gold/60 text-kairos-gold bg-kairos-gold/10" : "border-kairos-border text-kairos-silver-dark hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
