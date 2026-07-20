"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyBrand, isPlatformBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  Bell,
  Activity,
  WifiOff,
  CalendarX,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

// ─── Date helpers ────────────────────────────────────────────────

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function dateLabel(d: Date): string {
  const today = new Date();
  const str = toDateStr(d);
  if (str === toDateStr(today)) return "Today";
  if (str === toDateStr(addDays(today, 1))) return "Tomorrow";
  if (str === toDateStr(addDays(today, -1))) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "09:00" → "9:00 AM" */
function formatTime12(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function waitingLabel(hours: number): string {
  if (hours < 1) return "waiting <1h";
  if (hours >= 24) return `waiting ${Math.floor(hours / 24)}d`;
  return `waiting ${Math.round(hours)}h`;
}

/** "follow_up" → "Follow Up" */
function humanize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Small shared UI bits ────────────────────────────────────────

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl animate-pulse bg-gray-800/50" />
      ))}
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  return <p className="text-sm text-red-400/80 py-4">{message}</p>;
}

const MEETING_TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  phone: <Phone size={14} />,
  in_person: <MapPin size={14} />,
};

const KIND_ICON: Record<string, React.ReactNode> = {
  alert: <Bell size={14} />,
  hrv: <Activity size={14} />,
  no_data: <WifiOff size={14} />,
};

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-blue-400",
};

// ─── Page ────────────────────────────────────────────────────────

export default function TrainerDashboard() {
  const router = useRouter();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = !isPlatformBrand(brand);
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;
  const accent = accentColor || "rgb(var(--k-accent))";

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateStr = toDateStr(selectedDate);
  const isToday = dateStr === toDateStr(new Date());

  // ── tRPC queries (per-panel loading/error) ──
  const schedule = trpc.coach.dashboard.getDaySchedule.useQuery(
    { date: dateStr },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );
  const attention = trpc.coach.dashboard.getClientAlertsFeed.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const unresponded = trpc.coach.dashboard.getUnresponded.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Group appointments by starting hour ──
  const { hours, apptsByHour } = useMemo(() => {
    const appts = schedule.data ?? [];
    const byHour = new Map<number, typeof appts>();
    let minHour = 6;
    let maxHour = 20;
    for (const a of appts) {
      const h = parseInt(a.startTime.split(":")[0], 10);
      if (Number.isNaN(h)) continue;
      minHour = Math.min(minHour, h);
      maxHour = Math.max(maxHour, h);
      const list = byHour.get(h) ?? [];
      list.push(a);
      byHour.set(h, list);
    }
    const hourList: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hourList.push(h);
    return { hours: hourList, apptsByHour: byHour };
  }, [schedule.data]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Date bar ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="p-2 rounded-lg border border-kairos-border text-kairos-silver hover:text-white hover:bg-gray-800/50 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="p-2 rounded-lg border border-kairos-border text-kairos-silver hover:text-white hover:bg-gray-800/50 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={16} />
        </button>
        <h2 className="font-heading font-semibold text-white text-lg">
          {dateLabel(selectedDate)}
        </h2>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-heading font-semibold px-3 py-1.5 rounded-lg border border-kairos-border text-kairos-gold hover:bg-kairos-gold/10 transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── LEFT: Day schedule ── */}
        <div className="lg:col-span-3 kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Schedule</h3>

          {schedule.isLoading ? (
            <PanelSkeleton rows={6} />
          ) : schedule.error ? (
            <PanelError message="Unable to load the schedule. Please try refreshing." />
          ) : (schedule.data?.length ?? 0) === 0 ? (
            <div className="py-12 text-center">
              <CalendarX size={36} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500">No appointments this day.</p>
            </div>
          ) : (
            <div>
              {hours.map((hour) => {
                const hourAppts = apptsByHour.get(hour) ?? [];
                return (
                  <div key={hour} className="flex gap-3 border-t border-kairos-border/50 first:border-t-0">
                    <div className="w-16 shrink-0 pt-2 pb-2">
                      <span className="text-[11px] text-gray-500 font-heading">
                        {formatTime12(`${String(hour).padStart(2, "0")}:00`)}
                      </span>
                    </div>
                    <div className="flex-1 py-1.5 min-h-[2.25rem] space-y-2">
                      {hourAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className={`rounded-xl border border-kairos-border bg-gray-800/40 px-3 py-2.5 flex items-center gap-3 ${
                            appt.status === "cancelled" ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/trainer/clients/${appt.clientId}`}
                                className="text-sm font-heading font-semibold text-white hover:text-kairos-gold transition-colors truncate"
                              >
                                {appt.clientName}
                              </Link>
                              <span
                                className="text-[10px] font-heading font-semibold rounded-full px-2 py-0.5 shrink-0"
                                style={{ backgroundColor: accent + "20", color: accent }}
                              >
                                {humanize(appt.sessionType)}
                              </span>
                              {appt.status === "cancelled" && (
                                <span className="text-[10px] text-red-400/80 shrink-0">Cancelled</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatTime12(appt.startTime)}
                              {appt.endTime ? ` – ${formatTime12(appt.endTime)}` : ""}
                            </p>
                          </div>
                          <span className="text-kairos-silver shrink-0" title={humanize(appt.meetingType)}>
                            {MEETING_TYPE_ICON[appt.meetingType] ?? <Video size={14} />}
                          </span>
                          {appt.meetingLink && appt.status === "confirmed" && (
                            <a
                              href={appt.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-heading font-semibold px-2.5 py-1 rounded-lg text-kairos-gold border border-kairos-gold/40 hover:bg-kairos-gold/15 transition-colors shrink-0"
                            >
                              Join
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: attention + unresponded ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Needs Attention */}
          <div className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-4">Needs Attention</h3>
            {attention.isLoading ? (
              <PanelSkeleton rows={4} />
            ) : attention.error ? (
              <PanelError message="Unable to load client alerts." />
            ) : (attention.data?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/60" />
                <p className="text-sm text-gray-500">All clients look good.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {attention.data!.map((item, i) => (
                  <div
                    key={`${item.clientId}-${item.kind}-${i}`}
                    className="flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-800/40 transition-colors"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[item.severity] ?? "bg-blue-400"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/trainer/clients/${item.clientId}`}
                          className="text-sm font-heading font-semibold text-white hover:text-kairos-gold transition-colors truncate"
                        >
                          {item.clientName}
                        </Link>
                        <span className="text-kairos-silver shrink-0">
                          {KIND_ICON[item.kind] ?? <Bell size={14} />}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.detail}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0 mt-0.5">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Awaiting Your Reply */}
          <div className="kairos-card">
            <h3 className="font-heading font-semibold text-white mb-4">Awaiting Your Reply</h3>
            {unresponded.isLoading ? (
              <PanelSkeleton rows={3} />
            ) : unresponded.error ? (
              <PanelError message="Unable to load messages." />
            ) : (unresponded.data?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-500">You&apos;re all caught up.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {unresponded.data!.map((conv) => (
                  <button
                    key={conv.conversationId}
                    onClick={() =>
                      router.push(`/trainer/messages?conversationId=${conv.conversationId}`)
                    }
                    className="w-full text-left flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-semibold text-white truncate">
                        {conv.clientName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {conv.lastMessageBody}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-heading font-semibold rounded-full px-2 py-0.5 shrink-0 mt-0.5 ${
                        conv.hoursWaiting > 24
                          ? "bg-red-500/15 text-red-400"
                          : conv.hoursWaiting > 4
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-gray-700/50 text-gray-400"
                      }`}
                    >
                      {waitingLabel(conv.hoursWaiting)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
