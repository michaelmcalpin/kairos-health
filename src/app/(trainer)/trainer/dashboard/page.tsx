"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  AlertOctagon,
  AlertTriangle,
  MessageSquare,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Video,
  Phone,
  MapPin,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────

/** Local YYYY-MM-DD (avoids the UTC shift from toISOString). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "09:00" → "9:00 AM" */
function formatTime12(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function waitedFor(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

const humanize = (s: string | null | undefined) =>
  (s ?? "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const MEETING_ICON: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  phone: <Phone size={14} />,
  in_person: <MapPin size={14} />,
};

const STATUS_STYLE = {
  critical: { label: "Critical", dot: "bg-red-400", pill: "bg-red-500/15 text-red-400" },
  attention: { label: "Needs attention", dot: "bg-amber-400", pill: "bg-amber-500/15 text-amber-400" },
} as const;

type TriageFilter = "all" | "critical" | "attention";

// ─── Page ────────────────────────────────────────────────────────

export default function CoachTodayPage() {
  const [today] = useState(() => new Date());
  const date = localDateStr(today);
  const [triageFilter, setTriageFilter] = useState<TriageFilter>("all");

  const { data, isLoading, error } = trpc.coach.dashboard.getToday.useQuery(
    { date },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const tiles = data?.tiles;
  const triage = data?.triage ?? [];
  const shown = triageFilter === "all" ? triage : triage.filter((t) => t.status === triageFilter);
  const upcoming = (data?.schedule ?? []).filter((s) => s.status !== "cancelled");
  const nowHm = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const next = upcoming.find((s) => s.startTime >= nowHm);

  const focusTriage = (f: TriageFilter) => {
    setTriageFilter((cur) => (cur === f ? "all" : f));
    document.getElementById("triage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Today</h1>
          <p className="text-sm text-kairos-silver-dark mt-0.5">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/trainer/inbox"
          className="inline-flex items-center gap-2 text-sm font-heading font-semibold px-3 py-2 rounded-lg border border-kairos-border text-kairos-silver hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <Inbox size={16} /> Open Inbox
        </Link>
      </div>

      {error ? (
        <div className="kairos-card">
          <p className="text-sm text-red-400/80">Couldn&apos;t load today&apos;s overview. Please refresh.</p>
        </div>
      ) : (
        <>
          {/* ── Priority strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              loading={isLoading}
              icon={<AlertOctagon size={18} className="text-red-400" />}
              label="Critical clients"
              value={tiles?.critical ?? 0}
              hint={tiles?.critical ? "Review first" : "None right now"}
              active={triageFilter === "critical"}
              tone={tiles?.critical ? "text-red-400" : "text-white"}
              onClick={() => focusTriage("critical")}
            />
            <Tile
              loading={isLoading}
              icon={<AlertTriangle size={18} className="text-amber-400" />}
              label="Needs attention"
              value={tiles?.attention ?? 0}
              hint={tiles?.attention ? "Check in this week" : "None right now"}
              active={triageFilter === "attention"}
              tone={tiles?.attention ? "text-amber-400" : "text-white"}
              onClick={() => focusTriage("attention")}
            />
            <Tile
              loading={isLoading}
              icon={<MessageSquare size={18} className="text-kairos-gold" />}
              label="Unanswered messages"
              value={tiles?.unanswered ?? 0}
              hint={tiles?.oldestWaitingHours != null ? `Oldest waiting ${waitedFor(tiles.oldestWaitingHours)}` : "All caught up"}
              href="/trainer/inbox?category=messages"
            />
            <Tile
              loading={isLoading}
              icon={<CalendarDays size={18} className="text-kairos-silver" />}
              label="Today's sessions"
              value={tiles?.sessions ?? 0}
              hint={next ? `Next at ${formatTime12(next.startTime)}` : tiles?.sessions ? "No more today" : "None booked"}
              href="/trainer/schedule"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── Client triage ── */}
            <section id="triage" className="lg:col-span-2 kairos-card scroll-mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-heading font-semibold text-white">Clients who need you</h2>
                {triage.length > 0 && (
                  <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                    {(["all", "critical", "attention"] as const).map((f) => {
                      const n = f === "all" ? triage.length : triage.filter((t) => t.status === f).length;
                      return (
                        <button
                          key={f}
                          onClick={() => setTriageFilter(f)}
                          className={`px-2.5 py-1 text-xs font-heading font-semibold rounded-md transition-colors ${
                            triageFilter === f ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"
                          }`}
                        >
                          {f === "all" ? "All" : STATUS_STYLE[f].label} {n}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {isLoading ? (
                <Skeleton rows={4} />
              ) : !data || data.roster.total === 0 ? (
                <Empty
                  title="No clients yet"
                  body="Once clients join, the ones who need you show up here."
                  link={{ href: "/trainer/clients", label: "Add clients" }}
                />
              ) : triage.length === 0 ? (
                <Empty
                  title="No one needs you right now"
                  body={rosterLine(data.roster)}
                  link={{ href: "/trainer/clients", label: "See all clients" }}
                />
              ) : shown.length === 0 ? (
                <p className="text-sm text-kairos-silver-dark py-6 text-center">
                  No {triageFilter === "critical" ? "critical" : "needs-attention"} clients right now.
                </p>
              ) : (
                <ul className="divide-y divide-kairos-border/60">
                  {shown.map((c) => {
                    const st = STATUS_STYLE[c.status];
                    return (
                      <li key={c.id} className="flex items-center gap-3 py-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} aria-hidden />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/trainer/clients/${c.id}`}
                              className="text-sm font-heading font-semibold text-white hover:text-kairos-gold transition-colors truncate"
                            >
                              {c.name}
                            </Link>
                            <span className={`text-xs font-heading font-semibold rounded-full px-2 py-0.5 ${st.pill}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-sm text-kairos-silver mt-0.5 truncate">{c.reason}</p>
                        </div>
                        <div className="w-20 text-right shrink-0" title="Core LifeScore">
                          {c.core != null ? (
                            <span className="inline-flex items-center gap-1 justify-end">
                              <span className="font-heading font-bold text-white text-lg tabular-nums">{c.core}</span>
                              {c.trend === "down" && <TrendingDown size={14} className="text-red-400" aria-label="Trending down" />}
                              {c.trend === "up" && <TrendingUp size={14} className="text-emerald-400" aria-label="Trending up" />}
                            </span>
                          ) : (
                            <span className="text-xs text-kairos-silver-dark">Not scored</span>
                          )}
                          <p className="text-xs text-kairos-silver-dark">LifeScore</p>
                        </div>
                        <Link
                          href={c.action.href}
                          className={`shrink-0 inline-flex items-center gap-1 text-xs font-heading font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            c.action.kind === "open"
                              ? "border-kairos-border text-kairos-silver hover:text-white hover:bg-gray-800/50"
                              : "border-kairos-gold/40 text-kairos-gold hover:bg-kairos-gold/10"
                          }`}
                        >
                          {c.action.label}
                          {c.action.kind === "message" && c.waiting ? ` · ${waitedFor(c.waiting.hours)}` : ""}
                          <ArrowRight size={12} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Schedule rail ── */}
            <aside className="kairos-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-white">Schedule</h2>
                <Link href="/trainer/schedule" className="text-xs font-heading font-semibold text-kairos-gold hover:underline">
                  Open calendar
                </Link>
              </div>
              {isLoading ? (
                <Skeleton rows={3} />
              ) : (data?.schedule.length ?? 0) === 0 ? (
                <p className="text-sm text-kairos-silver-dark">No sessions today.</p>
              ) : (
                <ul className="space-y-2">
                  {data!.schedule.map((s) => {
                    const cancelled = s.status === "cancelled";
                    return (
                      <li
                        key={s.id}
                        className={`rounded-xl border border-kairos-border bg-gray-800/40 px-3 py-2.5 flex items-center gap-3 ${cancelled ? "opacity-50" : ""}`}
                      >
                        <div className="w-16 shrink-0">
                          <p className="text-xs font-heading font-semibold text-white">{formatTime12(s.startTime)}</p>
                          {s.endTime && <p className="text-xs text-kairos-silver-dark">{formatTime12(s.endTime)}</p>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/trainer/clients/${s.clientId}`}
                            className="text-sm font-heading font-semibold text-white hover:text-kairos-gold transition-colors truncate block"
                          >
                            {s.clientName}
                          </Link>
                          <p className="text-xs text-kairos-silver-dark flex items-center gap-1">
                            <span aria-hidden>{MEETING_ICON[s.meetingType] ?? <Video size={14} />}</span>
                            {humanize(s.sessionType)}
                            {cancelled && <span className="text-red-400/80"> · Cancelled</span>}
                          </p>
                        </div>
                        {s.meetingLink && !cancelled && (
                          <a
                            href={s.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-heading font-semibold px-2.5 py-1 rounded-lg text-kairos-gold border border-kairos-gold/40 hover:bg-kairos-gold/15 transition-colors shrink-0"
                          >
                            Join
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────

function rosterLine(r: { total: number; stable: number; noData: number }): string {
  const parts = [`${r.stable} of ${r.total} client${r.total === 1 ? "" : "s"} on track`];
  if (r.noData) parts.push(`${r.noData} without enough data to score yet`);
  return `${parts.join(" · ")}.`;
}

function Tile(props: {
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-heading font-semibold text-kairos-silver-dark uppercase tracking-wide">{props.label}</span>
        {props.icon}
      </div>
      {props.loading ? (
        <div className="h-8 w-12 mt-2 rounded animate-pulse bg-gray-800/60" />
      ) : (
        <p className={`font-heading font-bold text-3xl mt-1 tabular-nums ${props.tone ?? "text-white"}`}>{props.value}</p>
      )}
      <p className="text-xs text-kairos-silver-dark mt-1 truncate">{props.loading ? " " : props.hint}</p>
    </>
  );
  const cls = `kairos-card text-left block transition-colors hover:border-kairos-gold/40 ${props.active ? "border-kairos-gold/60" : ""}`;
  return props.href ? (
    <Link href={props.href} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={props.onClick} className={cls} aria-pressed={props.active}>{body}</button>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl animate-pulse bg-gray-800/50" />
      ))}
    </div>
  );
}

function Empty({ title, body, link }: { title: string; body: string; link?: { href: string; label: string } }) {
  return (
    <div className="py-10 text-center">
      <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/60" />
      <p className="text-sm font-heading font-semibold text-white">{title}</p>
      <p className="text-sm text-kairos-silver-dark mt-1">{body}</p>
      {link && (
        <Link href={link.href} className="inline-block mt-3 text-xs font-heading font-semibold text-kairos-gold hover:underline">
          {link.label}
        </Link>
      )}
    </div>
  );
}
