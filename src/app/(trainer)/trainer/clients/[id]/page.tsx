"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MessageSquare, Settings, Calendar, Activity, TrendingUp,
  AlertCircle, Pin, Trash2, CheckCircle, Send, X, Video,
  Droplets, Moon, Heart, Scale, Dumbbell, Target, FlaskConical,
  Apple, Pill, Zap, ClipboardList, ChevronRight, Timer, Footprints,
  Dna, FileText, Lock, MessagesSquare, Users, ShieldCheck,
  Plus, Pencil, Archive, Syringe, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useThemeColors } from "@/lib/theme";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  TIER_LABELS, TIER_BADGE_COLORS, STATUS_LABELS, STATUS_DOT_COLORS,
  STATUS_COLORS, ALERT_PRIORITY_COLORS, formatRelativeTime,
} from "@/lib/coach-clients/types";
import { trpc } from "@/lib/trpc";
import ExercisePicker from "@/components/coach/ExercisePicker";
import { round } from "@/lib/format/number";

// ─── Types ──────────────────────────────────────────────────────

type DataTab = "overview" | "glucose" | "sleep" | "hrv" | "bp" | "body" | "workouts" | "activity" | "fasting" | "goals" | "labs" | "nutrition" | "supplements" | "checkins" | "genetics" | "clinical" | "discussion";

const DATA_TABS: { id: DataTab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "glucose", label: "Glucose", icon: Droplets },
  { id: "sleep", label: "Sleep", icon: Moon },
  { id: "hrv", label: "HRV", icon: Heart },
  { id: "bp", label: "Blood Pressure", icon: Zap },
  { id: "body", label: "Body", icon: Scale },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "activity", label: "Activity", icon: Footprints },
  { id: "goals", label: "Goals", icon: Target },
  { id: "labs", label: "Labs", icon: FlaskConical },
  { id: "genetics", label: "Genetics", icon: Dna },
  { id: "clinical", label: "Clinical Docs", icon: FileText },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "supplements", label: "Supplements", icon: Pill },
  { id: "discussion", label: "Coach Discussion", icon: MessagesSquare },
];

// ─── Access gating (client-controlled sharing) ──────────────────

type AccessCategory = "diet" | "exercise" | "labs" | "healthData";
type AccessLevel = "none" | "read" | "write";

type MyAccess = {
  isPrimary: boolean;
  hasAnyAccess: boolean;
  diet: AccessLevel;
  exercise: AccessLevel;
  labs: AccessLevel;
  healthData: AccessLevel;
};

/** Which sharing category gates each data tab (tabs not listed are never gated). */
const TAB_ACCESS_CATEGORY: Partial<Record<DataTab, AccessCategory>> = {
  nutrition: "diet",
  fasting: "diet",
  supplements: "diet",
  workouts: "exercise",
  activity: "exercise",
  labs: "labs",
  genetics: "labs",
  clinical: "labs",
  glucose: "healthData",
  sleep: "healthData",
  hrv: "healthData",
  bp: "healthData",
  body: "healthData",
  checkins: "healthData",
};

const ACCESS_CATEGORY_LABELS: Record<AccessCategory, string> = {
  diet: "Diet",
  exercise: "Exercise",
  labs: "Labs",
  healthData: "Health Data",
};

const ACCESS_LEVEL_LABELS: Record<Exclude<AccessLevel, "none">, string> = {
  read: "view",
  write: "view & edit",
};

function grantedCategorySummary(access: MyAccess): string {
  const parts = (Object.keys(ACCESS_CATEGORY_LABELS) as AccessCategory[])
    .filter((c) => access[c] !== "none")
    .map((c) => `${ACCESS_CATEGORY_LABELS[c]} (${ACCESS_LEVEL_LABELS[access[c] as "read" | "write"]})`);
  return parts.join(", ");
}

// ─── Sparkline helper ───────────────────────────────────────────

function SparkLine({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  if (data.length < 2) return <div className="h-24 flex items-center justify-center text-xs text-gray-600">No data</div>;
  const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${60 - (val / maxVal) * 50}`).join(" ");
  return (
    <svg viewBox="0 0 100 60" className="w-full h-24">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="0" cy={60 - (data[0] / maxVal) * 50} r="1.5" fill={color} />
      <circle cx="100" cy={60 - (data[data.length - 1] / maxVal) * 50} r="1.5" fill={color} />
    </svg>
  );
}

// ─── Data Table helper ──────────────────────────────────────────

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-3 text-[10px] text-gray-500 uppercase font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-6 text-center text-gray-600">No data for this period</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 text-gray-300">{cell ?? "—"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

// Deep-links a protocol tab's edit action into the single Bulk Edit Protocols
// editor (the source of truth), preselecting the matching grid tab.
function BulkEditLink({ clientId, tab, label }: { clientId: string; tab: "diet" | "supplements" | "peptides" | "workouts"; label: string }) {
  return (
    <Link
      href={`/trainer/clients/${clientId}/protocols?tab=${tab}`}
      className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
    >
      <span className="flex items-center gap-2"><ClipboardList size={15} /> {label}</span>
      <span className="text-xs opacity-70">Open →</span>
    </Link>
  );
}

// Read-only peptides list (peptideCycles is canonical) shown alongside the
// supplement/medication ProtocolEditor, since that editor only reads protocolItems.
function PeptidesPanel({ clientId }: { clientId: string }) {
  const gridQuery = trpc.coach.protocolBulk.getGrid.useQuery(
    { clientId, type: "peptides" },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((gridQuery.data as any)?.rows ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;
  return (
    <div className="kairos-card">
      <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2 mb-3">
        <Syringe size={16} /> Peptides
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Dosage</th>
              <th className="px-3 py-2 font-medium">Frequency</th>
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50 last:border-0">
                <td className="px-3 py-2 text-white whitespace-nowrap">{String(r.name ?? "")}</td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{[r.dosage, r.unit].filter(Boolean).join(" ")}</td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{String(r.frequency ?? "")}</td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{String(r.route ?? "")}</td>
                <td className="px-3 py-2 text-gray-400">{String(r.notes ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Adherence card (daily-task completion) ─────────────────────
// Shows the client's current streak, today's completion %, and a 14-bar
// mini chart of daily completion for accountability/reporting.
function AdherenceCard({ clientId }: { clientId: string }) {
  const q = trpc.coach.clients.getClientAdherence.useQuery(
    { clientId, days: 14 },
    { staleTime: 30_000, refetchOnWindowFocus: false, retry: false },
  );

  if (q.isLoading) {
    return (
      <div className="kairos-card">
        <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
          <ClipboardList size={14} /> Adherence
        </h2>
        <div className="h-24 animate-pulse bg-gray-800/50 rounded-lg" />
      </div>
    );
  }

  const data = q.data;
  const days = data?.days ?? [];
  const hasAny = days.some((d) => d.total > 0);

  return (
    <div className="kairos-card">
      <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
        <ClipboardList size={14} /> Adherence
      </h2>
      {!hasAny ? (
        <p className="text-xs text-gray-500 text-center py-4">No daily-task activity yet</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-heading font-bold text-white">
                {data?.todayPct != null ? `${round(data.todayPct, 0)}%` : "—"}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Today</p>
            </div>
            {data && data.streak > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                🔥 {data.streak}-day streak
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-1 h-14">
            {days.map((d) => {
              const h = d.pct != null ? Math.max(6, Math.round((d.pct / 100) * 48)) : 0;
              const color =
                d.pct == null
                  ? "bg-gray-700/40"
                  : d.pct >= 80
                  ? "bg-green-500"
                  : d.pct >= 50
                  ? "bg-kairos-gold"
                  : d.pct > 0
                  ? "bg-yellow-500"
                  : "bg-red-500/70";
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                  title={`${d.date}: ${d.pct != null ? `${round(d.pct, 0)}%` : "no tasks"} (${d.done}/${d.total})`}
                >
                  {d.pct != null ? (
                    <div className={`w-full rounded-sm ${color}`} style={{ height: h }} />
                  ) : (
                    <div className="w-full h-1 rounded-full bg-gray-700/40" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-2">Last {days.length} days</p>
        </>
      )}
    </div>
  );
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const tc = useThemeColors();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const [activeTab, setActiveTab] = useState<DataTab>("overview");
  const [noteText, setNoteText] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // ── Schedule modal state ──────────────────────────────────────
  const [schedSessionType, setSchedSessionType] = useState<"initial_consultation" | "follow_up" | "protocol_review" | "lab_review" | "goal_setting" | "ad_hoc">("follow_up");
  const [schedMeetingType, setSchedMeetingType] = useState<"video" | "phone" | "in_person">("video");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedNotes, setSchedNotes] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

  // ── "Log Data" quick-entry menu ───────────────────────────────
  const [showLogMenu, setShowLogMenu] = useState(false);
  const [logTarget, setLogTarget] = useState<DataTab | null>(null);
  const [logSignal, setLogSignal] = useState(0);

  // Close tier dropdown on outside click
  useEffect(() => {
    if (!showTierDropdown) return;
    const handler = () => setShowTierDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showTierDropdown]);

  // Close log-data menu on outside click
  useEffect(() => {
    if (!showLogMenu) return;
    const handler = () => setShowLogMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showLogMenu]);

  // ── tRPC queries ──────────────────────────────────────────────
  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId: params.id },
    { staleTime: 15_000, refetchOnWindowFocus: false, retry: false }
  );
  const client = detailQuery.data;

  // My access to this client (primary = full; otherwise client-granted categories)
  const myAccessQuery = trpc.coach.sharedAccess.myAccess.useQuery(
    { clientId: params.id },
    { staleTime: 30_000, refetchOnWindowFocus: false, retry: false }
  );
  const myAccess = myAccessQuery.data as MyAccess | undefined;
  const isSharedOnly = !!myAccess && myAccess.hasAnyAccess && !myAccess.isPrimary;

  const canViewTab = (tab: DataTab): boolean => {
    if (!isSharedOnly) return true;
    const cat = TAB_ACCESS_CATEGORY[tab];
    if (!cat) return true;
    return myAccess![cat] !== "none";
  };

  // Primary coach → full write access. Shared coach → only categories granted at "write".
  const canEditCategory = (cat: AccessCategory): boolean =>
    !isSharedOnly || myAccess?.[cat] === "write";

  const notesQuery = trpc.coach.clients.getNotes.useQuery(
    { clientId: params.id },
    { staleTime: 10_000, refetchOnWindowFocus: false }
  );
  const notes = notesQuery.data ?? [];

  const healthQuery = trpc.coach.clients.getClientHealthData.useQuery(
    {
      clientId: params.id,
      startDate: dateRange.startDate.toISOString().split("T")[0],
      endDate: dateRange.endDate.toISOString().split("T")[0],
    },
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );
  const health = healthQuery.data;

  // ── tRPC mutations ────────────────────────────────────────────
  const utils = trpc.useUtils();

  const resolveAlertMutation = trpc.coach.clients.resolveAlert.useMutation({
    onSuccess: () => { detailQuery.refetch(); },
  });
  const addNoteMutation = trpc.coach.clients.addNote.useMutation({
    onSuccess: () => { notesQuery.refetch(); setNoteText(""); },
  });
  const pinNoteMutation = trpc.coach.clients.pinNote.useMutation({
    onSuccess: () => { notesQuery.refetch(); },
  });
  const deleteNoteMutation = trpc.coach.clients.deleteNote.useMutation({
    onSuccess: () => { notesQuery.refetch(); },
  });
  const startConversationMutation = trpc.coach.messaging.startConversation.useMutation({
    onSuccess: (data) => {
      router.push(`/trainer/messages?conversationId=${data.id}`);
    },
  });

  const bookAppointmentMutation = trpc.coach.schedule.createAppointment.useMutation({
    onSuccess: () => {
      setShowScheduleModal(false);
      setSchedNotes("");
      healthQuery.refetch();
    },
  });

  const removeClientMutation = trpc.coach.clients.removeClient.useMutation({
    onSuccess: () => {
      router.push("/trainer/clients");
    },
  });

  const updateTierMutation = trpc.coach.clients.updateTier.useMutation({
    onSuccess: () => {
      detailQuery.refetch();
      utils.coach.clients.list.invalidate();
      setShowTierDropdown(false);
    },
  });

  // ── Loading ───────────────────────────────────────────────────
  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
          <ArrowLeft size={14} /> Back to clients
        </Link>
        <div className="kairos-card h-28 animate-pulse bg-gray-800/50" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kairos-card p-3 h-16 animate-pulse bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    // Not on my primary roster — if the client shared data with me, show the limited shared view.
    if (myAccessQuery.isLoading) {
      return (
        <div className="space-y-6 animate-fade-in">
          <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
            <ArrowLeft size={14} /> Back to clients
          </Link>
          <div className="kairos-card h-28 animate-pulse bg-gray-800/50" />
        </div>
      );
    }
    if (myAccess?.hasAnyAccess) {
      return <SharedClientView clientId={params.id} access={myAccess} />;
    }
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
          <ArrowLeft size={14} /> Back to clients
        </Link>
        <div className="kairos-card p-12 text-center">
          <p className="text-gray-500">Client not found.</p>
        </div>
      </div>
    );
  }

  const unresolvedAlerts = client.alerts.filter((a) => !a.resolved);
  const trendIcon = client.scoreTrend === "up" ? "↑" : client.scoreTrend === "down" ? "↓" : "→";
  const trendColor = client.scoreTrend === "up" ? "text-green-400" : client.scoreTrend === "down" ? "text-red-400" : "text-gray-400";

  function handleMessageClient() {
    if (health?.conversationId) {
      router.push(`/trainer/messages?conversationId=${health.conversationId}`);
    } else {
      startConversationMutation.mutate({ clientId: params.id, clientName: client?.name ?? "Client" });
    }
  }

  function handleScheduleSession() {
    setShowScheduleModal(true);
    // Default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSchedDate(tomorrow.toISOString().split("T")[0]);
  }

  function handleBookAppointment() {
    if (!schedDate || !schedTime) return;
    bookAppointmentMutation.mutate({
      clientId: params.id,
      clientName: client!.name,
      sessionType: schedSessionType,
      date: schedDate,
      startTime: schedTime,
      meetingType: schedMeetingType,
      notes: schedNotes,
    });
  }

  // Jump to a metric's tab and auto-open its "Add" modal (one click to the form).
  function handleLogMetric(tab: DataTab) {
    // Fasting now lives under the Nutrition tab (diet), so open that tab but
    // still signal the fasting form to open.
    setActiveTab(tab === "fasting" ? "nutrition" : tab);
    setLogTarget(tab);
    setLogSignal((s) => s + 1);
    setShowLogMenu(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      {/* Shared-access banner (non-primary coaches) */}
      {isSharedOnly && myAccess && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-kairos-gold/5 border border-kairos-gold/20">
          <ShieldCheck size={16} className="text-kairos-gold shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">
            Shared access: <span className="text-kairos-gold font-medium">{grantedCategorySummary(myAccess)}</span>
            {" "}— other sections are not shared with you.
          </p>
        </div>
      )}

      {/* Client Header */}
      <div className="kairos-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-kairos-gold/20 flex items-center justify-center text-kairos-gold font-heading font-bold text-xl">
              {client.initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-heading font-bold text-white">{client.name}</h1>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowTierDropdown((v) => !v); }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${TIER_BADGE_COLORS[client.tier]}`}
                  >
                    {TIER_LABELS[client.tier]}
                    <ChevronRight size={10} className={`transition-transform ${showTierDropdown ? "rotate-90" : ""}`} />
                  </button>
                  {showTierDropdown && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                      {(["tier1", "tier2", "tier3"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={(e) => { e.stopPropagation(); if (t !== client.tier) updateTierMutation.mutate({ clientId: params.id, tier: t }); }}
                          disabled={t === client.tier || updateTierMutation.isPending}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                            t === client.tier
                              ? "opacity-50 cursor-default bg-gray-800/50"
                              : "hover:bg-gray-800 cursor-pointer"
                          }`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            t === "tier1" ? "bg-kairos-gold" : t === "tier2" ? "bg-blue-400" : "bg-purple-400"
                          }`} />
                          <span className="text-gray-200">{TIER_LABELS[t]}</span>
                          {t === client.tier && <CheckCircle size={10} className="ml-auto text-green-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  {client.status === "insufficient_data" ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <span className="text-gray-400">Insufficient data</span>
                    </>
                  ) : (
                    <>
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[client.status]}`} />
                      <span className={STATUS_COLORS[client.status]}>{STATUS_LABELS[client.status]}</span>
                    </>
                  )}
                </div>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">{client.email}</span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">Since {client.memberSince}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-heading font-bold text-kairos-gold">{round(client.healthScore, 0)}</p>
            {client.healthScore == null ? (
              <p className="text-sm font-medium text-gray-500">Insufficient data</p>
            ) : (
              <p className={`text-sm font-medium ${trendColor}`}>{trendIcon} Health Score</p>
            )}
          </div>
        </div>

        {/* Action buttons inline in header */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800 flex-wrap">
          {/* Log Data — quick entry point that jumps to a metric tab and opens its Add form */}
          {(canEditCategory("healthData") || canEditCategory("labs")) && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowLogMenu((v) => !v); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold text-kairos-royal-dark border border-kairos-gold hover:bg-kairos-gold-light transition-colors"
              >
                <Plus size={14} /> Log Data
                <ChevronRight size={12} className={`transition-transform ${showLogMenu ? "rotate-90" : ""}`} />
              </button>
              {showLogMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[190px]">
                  {([
                    { tab: "glucose", label: "Glucose", icon: Droplets, cat: "healthData" },
                    { tab: "hrv", label: "HRV", icon: Heart, cat: "healthData" },
                    { tab: "bp", label: "Blood Pressure", icon: Zap, cat: "healthData" },
                    { tab: "body", label: "Body Measurement", icon: Scale, cat: "healthData" },
                    { tab: "activity", label: "Activity", icon: Footprints, cat: "healthData" },
                    { tab: "sleep", label: "Sleep", icon: Moon, cat: "healthData" },
                    { tab: "fasting", label: "Fasting", icon: Timer, cat: "healthData" },
                    { tab: "goals", label: "Goal", icon: Target, cat: "healthData" },
                    { tab: "labs", label: "Lab Result", icon: FlaskConical, cat: "labs" },
                  ] as { tab: DataTab; label: string; icon: typeof Activity; cat: AccessCategory }[])
                    .filter((m) => canEditCategory(m.cat))
                    .map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.tab}
                          onClick={(e) => { e.stopPropagation(); handleLogMetric(m.tab); }}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-gray-200 hover:bg-gray-800 transition-colors"
                        >
                          <Icon size={13} className="text-kairos-gold" />
                          {m.label}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          <button onClick={handleMessageClient} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors">
            <MessageSquare size={14} /> Message
          </button>
          <button onClick={handleScheduleSession} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
            <Video size={14} /> Schedule Session
          </button>
          {(canEditCategory("diet") || canEditCategory("exercise")) && (
            <Link href={`/trainer/clients/${params.id}/protocols`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors">
              <ClipboardList size={14} /> Bulk Edit Protocols
            </Link>
          )}
          <Link href={`/trainer/clients/${params.id}/guidance`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors">
            <ClipboardList size={14} /> Daily Guidance
          </Link>
          <div className="flex-1" />
          <button onClick={() => setShowRemoveConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/5 text-red-400/70 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
            <X size={14} /> Remove
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Adherence", value: `${round(client.metrics.adherence, 0)}%`, color: "text-kairos-gold" },
          { label: "Avg Glucose", value: client.metrics.avgGlucose ? `${round(client.metrics.avgGlucose, 0)}` : "—", unit: "mg/dL" },
          { label: "Sleep Score", value: client.metrics.sleepScore != null ? `${round(client.metrics.sleepScore, 0)}` : "—" },
          { label: "HRV", value: client.metrics.hrv != null ? `${round(client.metrics.hrv, 0)}` : "—", unit: "ms" },
          { label: "Streak", value: `${client.metrics.checkInStreak}`, unit: "days" },
          { label: "Alerts", value: `${unresolvedAlerts.length}`, color: unresolvedAlerts.length > 0 ? "text-orange-400" : "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="kairos-card p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase mb-1">{stat.label}</p>
            <p className={`text-xl font-heading font-bold ${stat.color ?? "text-white"}`}>
              {stat.value}
              {stat.unit && <span className="text-xs text-gray-500 ml-1">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Date Range Navigator */}
      <DateRangeNavigator
        availablePeriods={["week", "month", "quarter"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {DATA_TABS.map((tab) => {
          const Icon = tab.icon;
          const locked = !canViewTab(tab.id);
          if (locked) {
            return (
              <button
                key={tab.id}
                disabled
                title="Not shared with you"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap text-gray-600 border border-transparent cursor-not-allowed"
              >
                <Lock size={11} />
                {tab.label}
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === "discussion" ? (
            <CoachDiscussion clientId={params.id} />
          ) : !canViewTab(activeTab) ? (
            <div className="kairos-card p-10 text-center">
              <Lock size={24} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500">Not shared with you</p>
            </div>
          ) : activeTab === "supplements" ? (
            <div className="space-y-4">
              <BulkEditLink clientId={params.id} tab="supplements" label="Edit supplements & peptides in Bulk Editor" />
              <ProtocolEditor
                clientId={params.id}
                canEdit={!isSharedOnly || myAccess?.diet === "write"}
              />
              <PeptidesPanel clientId={params.id} />
            </div>
          ) : healthQuery.isLoading ? (
            <div className="kairos-card h-64 animate-pulse bg-gray-800/50 flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading health data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Coach write panels (Add / Upload / Create) shown above the read-only data. */}
              {activeTab === "workouts" && (
                <>
                  <BulkEditLink clientId={params.id} tab="workouts" label="Edit workouts in Bulk Editor" />
                  <TrainingProgramManager clientId={params.id} canEdit={canEditCategory("exercise")} />
                </>
              )}
              {activeTab === "nutrition" && (
                <>
                  <BulkEditLink clientId={params.id} tab="diet" label="Edit meal plan in Bulk Editor" />
                  <MealPlanManager clientId={params.id} canEdit={canEditCategory("diet")} />
                  {/* Fasting is part of diet — managed here rather than a separate tab. */}
                  <FastingManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "fasting" ? logSignal : 0} />
                </>
              )}
              {activeTab === "sleep" && (
                <SleepEntryManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "sleep" ? logSignal : 0} />
              )}
              {activeTab === "glucose" && (
                <GlucoseManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "glucose" ? logSignal : 0} />
              )}
              {activeTab === "hrv" && (
                <HrvManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "hrv" ? logSignal : 0} />
              )}
              {activeTab === "bp" && (
                <BloodPressureManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "bp" ? logSignal : 0} />
              )}
              {activeTab === "body" && (
                <BodyMeasurementManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "body" ? logSignal : 0} />
              )}
              {activeTab === "activity" && (
                <ActivityManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "activity" ? logSignal : 0} />
              )}
              {activeTab === "goals" && (
                <GoalManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "goals" ? logSignal : 0} />
              )}
              {activeTab === "fasting" && (
                <FastingManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "fasting" ? logSignal : 0} />
              )}
              {activeTab === "checkins" && (
                <CheckinManager clientId={params.id} canEdit={canEditCategory("healthData")} openSignal={logTarget === "checkins" ? logSignal : 0} />
              )}
              {activeTab === "labs" && (
                <LabResultManager clientId={params.id} canEdit={canEditCategory("labs")} openSignal={logTarget === "labs" ? logSignal : 0} />
              )}
              {activeTab === "clinical" && (
                <ClinicalDocManager clientId={params.id} canEdit={canEditCategory("labs")} />
              )}
              {activeTab === "genetics" && (
                <GeneticsManager clientId={params.id} canEdit={canEditCategory("labs")} />
              )}
              <TabContent tab={activeTab} client={client as unknown as ClientDetail} health={health as unknown as HealthData | undefined} tc={tc} />
            </div>
          )}
        </div>

        {/* Right Sidebar: Alerts, Notes, Upcoming */}
        <div className="space-y-6">
          {/* Daily-task adherence */}
          <AdherenceCard clientId={params.id} />

          {/* Upcoming Appointments */}
          {health?.upcomingAppointments && health.upcomingAppointments.length > 0 && (
            <div className="kairos-card">
              <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                <Calendar size={14} /> Upcoming Sessions
              </h2>
              <div className="space-y-2">
                {health.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs font-bold text-white">{new Date(apt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      <p className="text-[10px] text-gray-500">{apt.startTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{apt.sessionType?.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        {apt.meetingType === "video" && <Video size={10} />}
                        {apt.meetingType ?? "video"}
                      </p>
                    </div>
                    {apt.meetingLink && (
                      <a
                        href={apt.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-kairos-gold hover:bg-kairos-gold/15 transition-colors shrink-0"
                        title="Join Video Call"
                      >
                        <Video size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Alerts */}
          <div className="kairos-card">
            <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <AlertCircle size={14} /> Alerts ({unresolvedAlerts.length})
            </h2>
            {unresolvedAlerts.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {unresolvedAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`p-2 rounded-lg border-l-2 ${ALERT_PRIORITY_COLORS[alert.priority]}`}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300">{alert.message}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{formatRelativeTime(alert.timestamp)}</p>
                      </div>
                      <button
                        onClick={() => resolveAlertMutation.mutate({ clientId: params.id, alertId: alert.id })}
                        className="p-1 text-gray-500 hover:text-green-400 transition-colors shrink-0"
                        title="Resolve"
                      >
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trainer Notes */}
          <div className="kairos-card">
            <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3">Notes</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) addNoteMutation.mutate({ clientId: params.id, content: noteText.trim() }); }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
              />
              <button
                onClick={() => { if (noteText.trim()) addNoteMutation.mutate({ clientId: params.id, content: noteText.trim() }); }}
                disabled={!noteText.trim()}
                className="px-2 py-1.5 rounded-lg text-kairos-gold border border-kairos-gold/30 bg-kairos-gold/10 hover:bg-kairos-gold/20 disabled:opacity-40 transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-3">No notes yet</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {notes.slice(0, 8).map((note) => (
                  <div key={note.id} className="p-2 rounded-lg border border-gray-800 bg-gray-800/30" style={note.pinned ? { borderColor: tc.accent + "30" } : {}}>
                    <p className="text-xs text-gray-300 line-clamp-2">{note.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-500">{formatRelativeTime(note.createdAt)}</p>
                      <div className="flex gap-0.5">
                        <button onClick={() => pinNoteMutation.mutate({ clientId: params.id, noteId: note.id })} className="p-0.5 text-gray-500 hover:text-kairos-gold">
                          <Pin size={10} className={note.pinned ? "text-kairos-gold" : ""} />
                        </button>
                        <button onClick={() => deleteNoteMutation.mutate({ clientId: params.id, noteId: note.id })} className="p-0.5 text-gray-500 hover:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <Modal title="Schedule Session" onClose={() => setShowScheduleModal(false)}>
          <p className="text-sm text-gray-400 mb-4">Book a session with <span className="text-white font-semibold">{client.name}</span></p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Session Type</label>
              <select value={schedSessionType} onChange={(e) => setSchedSessionType(e.target.value as typeof schedSessionType)} className="kairos-input w-full">
                <option value="follow_up">Follow-Up (30 min)</option>
                <option value="initial_consultation">Initial Consultation (60 min)</option>
                <option value="protocol_review">Protocol Review (45 min)</option>
                <option value="lab_review">Lab Review (45 min)</option>
                <option value="goal_setting">Goal Setting (60 min)</option>
                <option value="ad_hoc">Ad Hoc (30 min)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Meeting Type</label>
              <select value={schedMeetingType} onChange={(e) => setSchedMeetingType(e.target.value as typeof schedMeetingType)} className="kairos-input w-full">
                <option value="video">Video Call</option>
                <option value="phone">Phone Call</option>
                <option value="in_person">In Person</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date</label>
                <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="kairos-input w-full" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Time</label>
                <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="kairos-input w-full" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes (optional)</label>
              <textarea value={schedNotes} onChange={(e) => setSchedNotes(e.target.value)} placeholder="Session agenda..." className="kairos-input w-full h-20 resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowScheduleModal(false)} className="kairos-btn-outline flex-1">Cancel</button>
            <button
              onClick={handleBookAppointment}
              disabled={!schedDate || !schedTime || bookAppointmentMutation.isPending}
              className="kairos-btn-gold flex-1 disabled:opacity-50"
            >
              {bookAppointmentMutation.isPending ? "Booking..." : "Book Session"}
            </button>
          </div>
        </Modal>
      )}

      {/* Remove Client Confirmation Modal */}
      {showRemoveConfirm && (
        <Modal title="Remove Client" onClose={() => setShowRemoveConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Are you sure you want to remove <span className="text-white font-semibold">{client.name}</span> from your client roster?
            </p>
            <p className="text-xs text-gray-500">
              This will deactivate the relationship. The client&apos;s data will be preserved and they can be re-assigned later.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowRemoveConfirm(false)} className="kairos-btn-outline flex-1">Cancel</button>
              <button
                onClick={() => removeClientMutation.mutate({ clientId: params.id })}
                disabled={removeClientMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {removeClientMutation.isPending ? "Removing..." : "Remove Client"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Modal wrapper ──────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-kairos-border sticky top-0 bg-kairos-card z-10">
          <h2 className="font-heading font-bold text-lg text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Coach Discussion (coach-to-coach thread) ───────────────────

function CoachDiscussion({ clientId }: { clientId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const getThreadMutation = trpc.coach.sharedAccess.getThread.useMutation({
    onSuccess: (thread) => setThreadId(thread?.id ?? null),
  });
  const getThreadMutate = getThreadMutation.mutate;

  useEffect(() => {
    getThreadMutate({ clientId });
  }, [clientId, getThreadMutate]);

  const messagesQuery = trpc.coach.sharedAccess.getThreadMessages.useQuery(
    { threadId: threadId ?? "" },
    { enabled: !!threadId, refetchInterval: 15_000, refetchOnWindowFocus: false }
  );
  const messages = messagesQuery.data ?? [];

  const coachesQuery = trpc.coach.sharedAccess.coachesForClient.useQuery(
    { clientId },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const coaches = coachesQuery.data ?? [];

  const postMutation = trpc.coach.sharedAccess.postThreadMessage.useMutation({
    onSuccess: () => {
      setBody("");
      messagesQuery.refetch();
    },
  });

  // Auto-scroll to the newest message
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!threadId || !body.trim() || postMutation.isPending) return;
    postMutation.mutate({ threadId, body: body.trim() });
  };

  return (
    <div className="kairos-card">
      <h2 className="text-base font-heading font-bold text-kairos-gold mb-1 flex items-center gap-2">
        <MessagesSquare size={16} /> Coach Discussion
      </h2>
      <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
        <Lock size={10} /> Private coach-to-coach discussion. Clients cannot see these messages.
      </p>

      {/* Care team chips */}
      {coaches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4 pb-3 border-b border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
            <Users size={11} /> Care team:
          </span>
          {coaches.map((c) => {
            const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || "Coach";
            return (
              <span
                key={c.coachId}
                className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full text-[11px] border ${
                  c.isPrimary
                    ? "bg-kairos-gold/10 text-kairos-gold border-kairos-gold/30"
                    : "bg-gray-800 text-gray-300 border-gray-700"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    ((c.firstName?.[0] ?? c.email?.[0] ?? "C") + (c.lastName?.[0] ?? "")).toUpperCase()
                  )}
                </span>
                {name}
                {c.isPrimary && <span className="text-[9px] uppercase opacity-80">(Primary)</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div className="max-h-96 min-h-[160px] overflow-y-auto space-y-3 mb-4 pr-1">
        {getThreadMutation.isPending || (threadId && messagesQuery.isLoading) ? (
          <p className="text-xs text-gray-500 text-center py-8">Loading discussion...</p>
        ) : getThreadMutation.isError ? (
          <p className="text-xs text-red-400 text-center py-8">{getThreadMutation.error.message}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">No messages yet. Start the discussion.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 border ${
                  m.isMe
                    ? "bg-kairos-gold/10 border-kairos-gold/20"
                    : "bg-gray-800/60 border-gray-700/50"
                }`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={`text-[11px] font-semibold ${m.isMe ? "text-kairos-gold" : "text-gray-300"}`}>
                    {m.isMe ? "You" : m.senderName}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-gray-200 whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      {postMutation.isError && (
        <p className="text-xs text-red-400 mb-2">{postMutation.error.message}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Message the care team..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          disabled={!threadId}
          className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!threadId || !body.trim() || postMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors disabled:opacity-40"
        >
          <Send size={13} /> Send
        </button>
      </div>
    </div>
  );
}

// ─── Shared client view (non-primary coach, no roster relationship) ──

function SharedClientView({ clientId, access }: { clientId: string; access: MyAccess }) {
  const sharedQuery = trpc.coach.sharedAccess.sharedWithMe.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const shared = sharedQuery.data?.find((s) => s.clientId === clientId);
  const name = shared ? `${shared.firstName ?? ""} ${shared.lastName ?? ""}`.trim() || shared.email || "Shared Client" : "Shared Client";
  const clientInitials = shared
    ? ((shared.firstName?.[0] ?? shared.email?.[0] ?? "C") + (shared.lastName?.[0] ?? "")).toUpperCase()
    : "?";

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      {/* Client header */}
      <div className="kairos-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-kairos-gold/20 flex items-center justify-center text-kairos-gold font-heading font-bold text-lg overflow-hidden">
              {shared?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shared.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                clientInitials
              )}
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">{name}</h1>
              {shared?.email && <p className="text-sm text-gray-500">{shared.email}</p>}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <ShieldCheck size={12} /> Shared with you
          </span>
        </div>
      </div>

      {/* Access summary banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-kairos-gold/5 border border-kairos-gold/20">
        <ShieldCheck size={16} className="text-kairos-gold shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">
          Shared access: <span className="text-kairos-gold font-medium">{grantedCategorySummary(access)}</span>
          {" "}— other sections are not shared with you.
        </p>
      </div>

      {/* Category access grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(ACCESS_CATEGORY_LABELS) as AccessCategory[]).map((cat) => {
          const level = access[cat];
          return (
            <div key={cat} className="kairos-card p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase mb-1">{ACCESS_CATEGORY_LABELS[cat]}</p>
              {level === "none" ? (
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Lock size={10} /> Not shared with you
                </p>
              ) : (
                <p className={`text-xs font-medium ${level === "write" ? "text-kairos-gold" : "text-blue-400"}`}>
                  {ACCESS_LEVEL_LABELS[level]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Protocol (shared Diet access) + Coach discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {access.diet !== "none" && (
            <ProtocolEditor clientId={clientId} canEdit={access.diet === "write"} />
          )}
          <CoachDiscussion clientId={clientId} />
        </div>
      </div>
    </div>
  );
}

// ─── Protocol Editor (coach.protocols) ──────────────────────────

type ProtocolCategory = "supplement" | "medication" | "peptide" | "injection";

const PROTOCOL_CATEGORY_ORDER: ProtocolCategory[] = ["supplement", "medication", "peptide", "injection"];

const PROTOCOL_CATEGORY_LABELS: Record<ProtocolCategory, string> = {
  supplement: "Supplement",
  medication: "Medication",
  peptide: "Peptide",
  injection: "Injection",
};

const PROTOCOL_CATEGORY_BADGES: Record<ProtocolCategory, string> = {
  supplement: "bg-green-500/10 text-green-400 border-green-500/30",
  medication: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  peptide: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  injection: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const PROTOCOL_STATUS_BADGES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  proposed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  archived: "bg-gray-700/50 text-gray-400 border-gray-600",
};

type ProtocolItem = {
  id: string;
  name: string;
  category: string;
  dosage: string | null;
  unit: string | null;
  form: string | null;
  route: string | null;
  frequency: string | null;
  timeOfDay: string | null;
  rationale: string | null;
  coachNotes: string | null;
};

type ProtocolItemFormState = {
  category: ProtocolCategory;
  name: string;
  dosage: string;
  unit: string;
  form: string;
  route: string;
  frequency: string;
  timeOfDay: string;
  rationale: string;
  coachNotes: string;
};

function ProtocolEditor({ clientId, canEdit = true }: { clientId: string; canEdit?: boolean }) {
  const utils = trpc.useUtils();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProtocolItem | null>(null);
  const [removingItem, setRemovingItem] = useState<ProtocolItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const protocolQuery = trpc.coach.protocols.getActive.useQuery(
    { clientId },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false }
  );
  const protocol = protocolQuery.data;

  const invalidate = () => utils.coach.protocols.getActive.invalidate({ clientId });
  const surfaceError = (err: { message?: string }) =>
    setErrorMsg(err.message || "Something went wrong. Please try again.");

  const createMutation = trpc.coach.protocols.create.useMutation({
    onSuccess: () => { invalidate(); setShowItemModal(false); setEditingItem(null); setErrorMsg(null); },
    onError: surfaceError,
  });
  const addItemMutation = trpc.coach.protocols.addItem.useMutation({
    onSuccess: () => { invalidate(); setShowItemModal(false); setEditingItem(null); setErrorMsg(null); },
    onError: surfaceError,
  });
  const updateItemMutation = trpc.coach.protocols.updateItem.useMutation({
    onSuccess: () => { invalidate(); setShowItemModal(false); setEditingItem(null); setErrorMsg(null); },
    onError: surfaceError,
  });
  const removeItemMutation = trpc.coach.protocols.removeItem.useMutation({
    onSuccess: () => { invalidate(); setRemovingItem(null); setErrorMsg(null); },
    onError: surfaceError,
  });
  const updateStatusMutation = trpc.coach.protocols.updateStatus.useMutation({
    onSuccess: () => { invalidate(); setShowArchiveConfirm(false); setErrorMsg(null); },
    onError: surfaceError,
  });

  const savingItem = createMutation.isPending || addItemMutation.isPending || updateItemMutation.isPending;

  const openAddModal = () => { setEditingItem(null); setErrorMsg(null); setShowItemModal(true); };
  const openEditModal = (item: ProtocolItem) => { setEditingItem(item); setErrorMsg(null); setShowItemModal(true); };

  const handleSubmitItem = (form: ProtocolItemFormState) => {
    const item = {
      name: form.name.trim(),
      category: form.category,
      dosage: form.dosage.trim() || null,
      unit: form.unit.trim() || null,
      form: form.form.trim() || null,
      route: form.route.trim() || null,
      frequency: form.frequency.trim() || null,
      timeOfDay: form.timeOfDay.trim() || null,
      rationale: form.rationale.trim() || null,
      coachNotes: form.coachNotes.trim() || null,
    };
    if (!item.name) return;
    if (editingItem) {
      updateItemMutation.mutate({ itemId: editingItem.id, updates: item });
    } else if (protocol) {
      addItemMutation.mutate({ protocolId: protocol.id, item });
    } else {
      // No active protocol yet — create one (activated immediately) with this first item.
      createMutation.mutate({ clientId, items: [item], activateImmediately: true });
    }
  };

  const items = (protocol?.items ?? []) as ProtocolItem[];
  const sortedItems = [...items].sort((a, b) => {
    const catDiff =
      PROTOCOL_CATEGORY_ORDER.indexOf(a.category as ProtocolCategory) -
      PROTOCOL_CATEGORY_ORDER.indexOf(b.category as ProtocolCategory);
    return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
  });

  return (
    <div className="kairos-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <Pill size={16} /> Protocol
          {protocol && (
            <>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${PROTOCOL_STATUS_BADGES[protocol.status] ?? PROTOCOL_STATUS_BADGES.archived}`}>
                {protocol.status}
              </span>
              <span className="text-[10px] text-gray-500 font-normal">v{protocol.version}</span>
            </>
          )}
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            {protocol && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
              >
                <Plus size={12} /> Add Item
              </button>
            )}
            {protocol?.status === "active" && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200 hover:border-gray-600 transition-colors"
                title="Archive this protocol"
              >
                <Archive size={12} /> Archive
              </button>
            )}
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
          <Lock size={10} /> Read-only — you don&apos;t have Diet edit access for this client.
        </p>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <p className="text-xs text-red-400">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-400/60 hover:text-red-400 shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Body */}
      {protocolQuery.isLoading ? (
        <p className="text-xs text-gray-500 text-center py-8">Loading protocol...</p>
      ) : protocolQuery.isError ? (
        <p className="text-xs text-red-400 text-center py-8">{protocolQuery.error.message}</p>
      ) : !protocol ? (
        <div className="text-center py-10">
          <Syringe size={24} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-500 mb-1">No active protocol for this client</p>
          <p className="text-xs text-gray-600 mb-4">Create one to manage supplements, medications, peptides, and injections.</p>
          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
            >
              <Plus size={14} /> Create Protocol
            </button>
          )}
        </div>
      ) : sortedItems.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No items in this protocol yet. Add the first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Item", "Dosage", "Frequency", "Time of Day", ""].map((h, i) => (
                  <th key={i} className="text-left py-2 px-3 text-[10px] text-gray-500 uppercase font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const cat = (item.category as ProtocolCategory) in PROTOCOL_CATEGORY_LABELS
                  ? (item.category as ProtocolCategory)
                  : "supplement";
                const dosage = [item.dosage, item.unit].filter(Boolean).join(" ");
                const subParts = [item.form, item.route].filter(Boolean).join(" · ");
                return (
                  <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">{item.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${PROTOCOL_CATEGORY_BADGES[cat]}`}>
                          {PROTOCOL_CATEGORY_LABELS[cat]}
                        </span>
                      </div>
                      {subParts && <p className="text-[10px] text-gray-500 mt-0.5">{subParts}</p>}
                      {item.rationale && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1" title={item.rationale}>Why: {item.rationale}</p>}
                    </td>
                    <td className="py-2 px-3 text-gray-300">{dosage || "—"}</td>
                    <td className="py-2 px-3 text-gray-300">{item.frequency ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-300">{item.timeOfDay ?? "—"}</td>
                    <td className="py-2 px-3">
                      {canEdit && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-kairos-gold hover:bg-kairos-gold/10 transition-colors"
                            title="Edit item"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => { setErrorMsg(null); setRemovingItem(item); }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit item modal */}
      {showItemModal && (
        <ProtocolItemModal
          key={editingItem?.id ?? "new"}
          title={editingItem ? "Edit Protocol Item" : protocol ? "Add Protocol Item" : "Create Protocol"}
          initial={editingItem}
          saving={savingItem}
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSubmit={handleSubmitItem}
        />
      )}

      {/* Remove item confirmation */}
      {removingItem && (
        <Modal title="Remove Item" onClose={() => setRemovingItem(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Remove <span className="text-white font-semibold">{removingItem.name}</span> from this protocol?
            </p>
            <p className="text-xs text-gray-500">This also deletes the item&apos;s adherence history.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRemovingItem(null)} className="kairos-btn-outline flex-1">Cancel</button>
              <button
                onClick={() => removeItemMutation.mutate({ itemId: removingItem.id })}
                disabled={removeItemMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {removeItemMutation.isPending ? "Removing..." : "Remove Item"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Archive protocol confirmation */}
      {showArchiveConfirm && protocol && (
        <Modal title="Archive Protocol" onClose={() => setShowArchiveConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Archive protocol <span className="text-white font-semibold">v{protocol.version}</span>?
              The client will no longer see it as their active protocol.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowArchiveConfirm(false)} className="kairos-btn-outline flex-1">Cancel</button>
              <button
                onClick={() => updateStatusMutation.mutate({ protocolId: protocol.id, status: "archived" })}
                disabled={updateStatusMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
              >
                {updateStatusMutation.isPending ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProtocolItemModal({
  title,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: ProtocolItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: ProtocolItemFormState) => void;
}) {
  const [form, setForm] = useState<ProtocolItemFormState>({
    category: (initial && (initial.category as ProtocolCategory) in PROTOCOL_CATEGORY_LABELS
      ? (initial.category as ProtocolCategory)
      : "supplement"),
    name: initial?.name ?? "",
    dosage: initial?.dosage ?? "",
    unit: initial?.unit ?? "",
    form: initial?.form ?? "",
    route: initial?.route ?? "",
    frequency: initial?.frequency ?? "",
    timeOfDay: initial?.timeOfDay ?? "",
    rationale: initial?.rationale ?? "",
    coachNotes: initial?.coachNotes ?? "",
  });

  const set = (key: keyof ProtocolItemFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const showRoute = form.category === "peptide" || form.category === "injection";

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Category</label>
            <select value={form.category} onChange={set("category")} className="kairos-input w-full">
              {PROTOCOL_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>{PROTOCOL_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Name *</label>
            <input type="text" value={form.name} onChange={set("name")} placeholder="e.g. Magnesium Glycinate" className="kairos-input w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Dosage</label>
            <input type="text" value={form.dosage} onChange={set("dosage")} placeholder="e.g. 400" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Unit</label>
            <input type="text" value={form.unit} onChange={set("unit")} placeholder="e.g. mg" className="kairos-input w-full" />
          </div>
        </div>
        <div className={`grid gap-3 ${showRoute ? "grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Form</label>
            <input type="text" value={form.form} onChange={set("form")} placeholder="e.g. capsule, vial" className="kairos-input w-full" />
          </div>
          {showRoute && (
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Route</label>
              <input type="text" value={form.route} onChange={set("route")} placeholder="e.g. subcutaneous" className="kairos-input w-full" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Frequency</label>
            <input type="text" value={form.frequency} onChange={set("frequency")} placeholder="e.g. daily" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Time of Day</label>
            <input type="text" value={form.timeOfDay} onChange={set("timeOfDay")} placeholder="e.g. morning, with food" className="kairos-input w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Rationale (visible to client)</label>
          <textarea value={form.rationale} onChange={set("rationale")} placeholder="Why this item is part of the protocol..." className="kairos-input w-full h-16 resize-none" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Coach Notes (private)</label>
          <textarea value={form.coachNotes} onChange={set("coachNotes")} placeholder="Internal notes, titration plan..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.name.trim() || saving}
          className="kairos-btn-gold flex-1 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Item"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Tab Content Types ─────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type ClientDetail = {
  id: string; name: string; initials: string; email: string; tier: string;
  healthScore: number | null; scoreTrend: string; activeAlerts: number; adherence: number;
  lastActive: string; status: string; nextSession: string | null; memberSince: string;
  metrics: {
    avgGlucose: number | null; glucoseTrend: string; glucoseData: number[];
    sleepScore: number | null; sleepTrend: string; sleepData: number[];
    hrv: number | null; hrvTrend: string; weight: number | null; weightData: number[];
    bodyFat: number | null; adherence: number; checkInStreak: number;
  };
  protocol: {
    id: string; name: string; startDate: string; goals: string[]; status: string;
  };
  alerts: Array<{
    id: string; clientId: string; priority: string; category: string;
    message: string; timestamp: string; resolved: boolean; resolvedAt: string | null;
  }>;
  recentActivity: Array<{ id: string; clientId: string; type: string; label: string; timestamp: string }>;
};

type HealthData = {
  glucose: Array<{ date: string; value: number; source: string | null }>;
  sleep: Array<{ date: string; totalMinutes: number | null; score: number | null; deepMinutes: number | null; remMinutes: number | null; lightMinutes: number | null; awakeMinutes: number | null }>;
  hrv: Array<{ date: string; rmssd: number; source: string | null }>;
  bloodPressure: Array<{ date: string; systolic: number | null; diastolic: number | null; pulse: number | null; notes: string | null }>;
  bodyMeasurements: Array<{ date: string; weightLbs: number | null; bodyFatPct: number | null; waistInches: number | null }>;
  workouts: Array<{ id: string; date: string; exercises: any; notes: string | null }>;
  activity: Array<{ date: string; exerciseMinutes: number | null; caloriesActive: number | null; steps: number | null }>;
  goals: Array<{
    id: string; title: string; category: string | null; status: string;
    targetValue: number; targetUnit: string | null; targetDirection: string | null;
    currentValue: number; startValue: number; startDate: string | null; targetDate: string | null;
    milestones: Array<{ label: string; targetValue: number | null; reached: boolean }>;
    checkpoints: Array<{ date: string; value: number | null; note: string | null }>;
  }>;
  labs: Array<{
    id: string; receivedAt: string; status: string | null;
    biomarkers: Array<{ code: string; value: string | null; unit: string | null; refLow: string | null; refHigh: string | null; status: string | null }>;
  }>;
  fasting: Array<{ date: string; startedAt: string | null; endedAt: string | null; completed: boolean | null }>;
  nutrition: { recentMeals: Array<{ date: string; mealType: string | null; calories: number | null; protein: number | null; carbs: number | null; fat: number | null }> };
  supplements: Array<{ name: string; dosage: string | null; frequency: string | null; timeOfDay: string | null; notes: string | null }>;
  checkins: Array<{ date: string; mood: number | null; energy: number | null; stress: number | null; sleepQuality: number | null; trainingType: string | null }>;
  upcomingAppointments: Array<{ id: string; date: string; startTime: string | null; endTime: string | null; sessionType: string | null; meetingType: string | null; status: string | null; meetingLink?: string | null }>;
  conversationId: string | null;
  genetics?: {
    profile: { id: string; status: string; uploadType: string | null; createdAt: string } | null;
    markers: Array<{ gene: string; rsId: string | null; mutation: string | null; pathway: string | null; function: string | null; clinicalPriority: string | null; symptoms: string | null; supplementProtocol: string | null; dietStrategy: string | null; lifestyleStrategy: string | null }>;
    pathways: Array<{ pathway: string; genesAffected: number; genesInPathway: number; homozygousCount: number; heterozygousCount: number; priorityLevel: string | null }>;
  };
  clinicalDocs?: Array<{ id: string; docType: string; title: string; providerName: string | null; reportDate: Date | null; status: string; parsedData: Record<string, unknown> | null; hasFile?: boolean; sourceFileName?: string | null; createdAt: string }>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Overview biometric helpers ─────────────────────────────────

/** Maps an up/down/flat trend to the same arrow + color scheme used in the header. */
function overviewTrend(trend: string | undefined): { icon: string; color: string } | null {
  if (trend === "up") return { icon: "↑", color: "text-green-400" };
  if (trend === "down") return { icon: "↓", color: "text-red-400" };
  if (trend === "flat") return { icon: "→", color: "text-gray-400" };
  return null;
}

/** Derives an up/down/flat trend from a chronological (oldest→newest) numeric series. */
function deriveArrayTrend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const recent = values.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const change = ((last - first) / Math.max(1, Math.abs(first))) * 100;
  if (Math.abs(change) < 2) return "flat";
  return change > 0 ? "up" : "down";
}

/** Blood-pressure category — mirrors the client dashboard's getBPLabel thresholds. */
function getBPLabel(sys: number, dia: number): { label: string; color: string } {
  if (sys > 180 || dia > 120) return { label: "Crisis", color: "text-red-400" };
  if (sys >= 140 || dia >= 90) return { label: "High", color: "text-red-400" };
  if (sys >= 130 || dia >= 80) return { label: "Elevated", color: "text-amber-400" };
  if (sys >= 120) return { label: "Elevated", color: "text-yellow-400" };
  return { label: "Normal", color: "text-green-400" };
}

/** A single biometric stat card: value + unit, trend arrow, optional sparkline + sub-label. */
function BioCard({
  icon, iconColor, label, value, unit, trend, sub, subColor, sparkData, sparkMax, sparkColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  sub?: string;
  subColor?: string;
  sparkData?: number[];
  sparkMax?: number;
  sparkColor?: string;
}) {
  const t = overviewTrend(trend);
  const hasSpark = !!sparkData && sparkData.length >= 2;
  return (
    <div className="kairos-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={iconColor}>{icon}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</span>
        </div>
        {t && <span className={`text-xs font-bold shrink-0 ${t.color}`}>{t.icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-heading font-bold text-white">{value}</span>
        {unit && <span className="text-[10px] text-gray-500">{unit}</span>}
      </div>
      {sub && <p className={`text-[10px] mt-0.5 ${subColor ?? "text-gray-500"}`}>{sub}</p>}
      {hasSpark && (
        <div className="mt-1.5">
          <SparkLine
            data={sparkData!}
            maxVal={sparkMax ?? Math.max(...sparkData!, 1) * 1.1}
            color={sparkColor ?? "#D4AF37"}
          />
        </div>
      )}
    </div>
  );
}

// ─── Tab Content ────────────────────────────────────────────────

function TabContent({
  tab,
  client,
  health,
  tc,
}: {
  tab: DataTab;
  client: ClientDetail;
  health: HealthData | undefined;
  tc: ReturnType<typeof useThemeColors>;
}) {
  if (!health) return <div className="kairos-card p-6 text-center text-gray-500 text-sm">No data available</div>;

  switch (tab) {
    case "overview": {
      const m = client.metrics;

      // Sleep — latest duration (hrs) from the chronological sleepData series.
      const sleepHoursLatest = m.sleepData.length > 0 ? m.sleepData[m.sleepData.length - 1] : null;

      // Weight — trend derived from the weight series (no *Trend field exists for it).
      const weightTrend = deriveArrayTrend(m.weightData);

      // HRV sparkline — health.hrv is newest→oldest, reverse to chronological.
      const hrvSpark = [...health.hrv].reverse().map((h) => h.rmssd);

      // Steps — health.activity is newest→oldest; first entry with steps is latest.
      const stepsEntries = health.activity.filter((a) => a.steps != null);
      const latestSteps = stepsEntries.length > 0 ? Number(stepsEntries[0].steps) : null;
      const stepsSpark = [...stepsEntries].reverse().map((a) => Number(a.steps));
      const stepsTrend = deriveArrayTrend(stepsSpark);

      // Body fat — sparkline + trend from body measurements when present.
      const bodyFatEntries = health.bodyMeasurements.filter((b) => b.bodyFatPct != null);
      const bodyFatSpark = [...bodyFatEntries].reverse().map((b) => Number(b.bodyFatPct));
      const bodyFatTrend = deriveArrayTrend(bodyFatSpark);

      // Blood pressure — latest reading (newest→oldest order) + systolic sparkline.
      const latestBp = health.bloodPressure.find((bp) => bp.systolic != null && bp.diastolic != null) ?? null;
      const bpSpark = [...health.bloodPressure].filter((bp) => bp.systolic != null).reverse().map((bp) => Number(bp.systolic));
      const bpCat = latestBp && latestBp.systolic != null && latestBp.diastolic != null
        ? getBPLabel(latestBp.systolic, latestBp.diastolic)
        : null;

      return (
        <div className="space-y-6">
          {/* Protocol */}
          <div className="kairos-card">
            <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> Current Protocol
            </h2>
            <h3 className="font-heading font-semibold text-white mb-2">{client.protocol.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Start</p>
                <p className="text-gray-300">{client.protocol.startDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Status</p>
                <p className="text-gray-300 capitalize">{client.protocol.status}</p>
              </div>
            </div>
          </div>

          {/* Biometrics — mirrors the client's own dashboard headline metrics */}
          <div>
            <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <Activity size={16} /> Biometrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Health Score */}
              <BioCard
                icon={<Heart size={13} />}
                iconColor="text-kairos-gold"
                label="Health Score"
                value={round(client.healthScore, 0)}
                trend={client.healthScore == null ? undefined : client.scoreTrend}
                sub={client.healthScore == null ? "Insufficient data" : "/100"}
              />

              {/* Weight */}
              <BioCard
                icon={<Scale size={13} />}
                iconColor="text-kairos-gold"
                label="Weight"
                value={round(m.weight, 1)}
                unit="lbs"
                trend={m.weightData.length >= 2 ? weightTrend : undefined}
                sparkData={m.weightData}
                sparkColor={tc.accent}
              />

              {/* Body Fat */}
              <BioCard
                icon={<Scale size={13} />}
                iconColor="text-kairos-gold"
                label="Body Fat"
                value={round(m.bodyFat, 1)}
                unit="%"
                trend={bodyFatSpark.length >= 2 ? bodyFatTrend : undefined}
                sparkData={bodyFatSpark}
                sparkColor={tc.accent}
              />

              {/* Sleep */}
              <BioCard
                icon={<Moon size={13} />}
                iconColor="text-blue-400"
                label="Sleep"
                value={sleepHoursLatest != null ? sleepHoursLatest.toFixed(1) : "—"}
                unit="hrs"
                trend={m.sleepData.length >= 2 ? m.sleepTrend : undefined}
                sub={`Quality ${round(m.sleepScore, 0)}/100`}
                sparkData={m.sleepData}
                sparkMax={10}
                sparkColor="#60a5fa"
              />

              {/* Glucose */}
              <BioCard
                icon={<Droplets size={13} />}
                iconColor="text-amber-400"
                label="Glucose"
                value={round(m.avgGlucose, 0)}
                unit="mg/dL"
                trend={m.glucoseData.length >= 2 ? m.glucoseTrend : undefined}
                sub="Avg"
                sparkData={m.glucoseData}
                sparkMax={140}
                sparkColor="#f59e0b"
              />

              {/* HRV */}
              <BioCard
                icon={<Zap size={13} />}
                iconColor="text-purple-400"
                label="HRV"
                value={round(m.hrv, 0)}
                unit="ms"
                trend={hrvSpark.length >= 2 ? m.hrvTrend : undefined}
                sparkData={hrvSpark}
                sparkColor="#a78bfa"
              />

              {/* Blood Pressure */}
              <BioCard
                icon={<Heart size={13} />}
                iconColor="text-red-400"
                label="Blood Pressure"
                value={latestBp && latestBp.systolic != null && latestBp.diastolic != null ? `${round(latestBp.systolic, 0)}/${round(latestBp.diastolic, 0)}` : "—"}
                unit={latestBp ? "mmHg" : undefined}
                sub={bpCat?.label}
                subColor={bpCat?.color}
                sparkData={bpSpark}
                sparkColor="#f87171"
              />

              {/* Steps / Activity */}
              <BioCard
                icon={<Footprints size={13} />}
                iconColor="text-green-400"
                label="Steps"
                value={latestSteps != null ? latestSteps.toLocaleString() : "—"}
                trend={stepsSpark.length >= 2 ? stepsTrend : undefined}
                sub="Latest"
                sparkData={stepsSpark}
                sparkColor="#4ade80"
              />
            </div>
          </div>

          {/* Supplements */}
          {health.supplements.length > 0 && (
            <div className="kairos-card">
              <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                <Pill size={16} /> Supplement Protocol
              </h2>
              <div className="space-y-2">
                {health.supplements.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{s.name}</p>
                      <p className="text-[10px] text-gray-500">{s.dosage} &bull; {s.frequency} &bull; {s.timeOfDay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals Summary */}
          {health.goals.length > 0 && (
            <div className="kairos-card">
              <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                <Target size={16} /> Goals ({health.goals.filter((g) => g.status === "active").length} active)
              </h2>
              <div className="space-y-2">
                {health.goals.filter((g) => g.status === "active").slice(0, 5).map((g) => {
                  const range = Math.abs(g.targetValue - g.startValue);
                  const progress = range > 0 ? Math.min(100, Math.round(Math.abs(g.currentValue - g.startValue) / range * 100)) : 0;
                  return (
                    <div key={g.id} className="p-2 rounded-lg bg-gray-800/30 border border-gray-800">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-white font-medium">{g.title}</p>
                        <span className="text-[10px] text-kairos-gold">{progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-kairos-gold rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{round(g.currentValue, 1)} / {round(g.targetValue, 1)} {g.targetUnit}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    case "glucose":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Droplets size={16} /> Glucose Readings ({health.glucose.length})
          </h2>
          <DataTable
            headers={["Date", "Time", "Value (mg/dL)", "Source"]}
            rows={health.glucose.slice(0, 50).map((g) => {
              const d = new Date(g.date);
              return [d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), round(g.value, 0), g.source];
            })}
          />
        </div>
      );

    case "sleep":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Moon size={16} /> Sleep Sessions ({health.sleep.length})
          </h2>
          <DataTable
            headers={["Date", "Total", "Score", "Deep", "REM", "Light", "Awake"]}
            rows={health.sleep.map((s) => [
              s.date,
              s.totalMinutes ? `${(s.totalMinutes / 60).toFixed(1)}h` : "—",
              round(s.score, 0),
              s.deepMinutes ? `${(s.deepMinutes / 60).toFixed(1)}h` : "—",
              s.remMinutes ? `${(s.remMinutes / 60).toFixed(1)}h` : "—",
              s.lightMinutes ? `${(s.lightMinutes / 60).toFixed(1)}h` : "—",
              s.awakeMinutes ? `${round(s.awakeMinutes, 0)}m` : "—",
            ])}
          />
        </div>
      );

    case "hrv":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Heart size={16} /> HRV Readings ({health.hrv.length})
          </h2>
          <DataTable
            headers={["Date", "RMSSD (ms)", "Source"]}
            rows={health.hrv.map((h) => {
              const d = new Date(h.date);
              return [d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), round(h.rmssd, 0), h.source];
            })}
          />
        </div>
      );

    case "bp":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Zap size={16} /> Blood Pressure ({health.bloodPressure.length})
          </h2>
          <DataTable
            headers={["Date", "Systolic", "Diastolic", "Pulse", "Notes"]}
            rows={health.bloodPressure.map((bp) => [bp.date, round(bp.systolic, 0), round(bp.diastolic, 0), round(bp.pulse, 0), bp.notes])}
          />
        </div>
      );

    case "body":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Scale size={16} /> Body Measurements ({health.bodyMeasurements.length})
          </h2>
          <DataTable
            headers={["Date", "Weight (lbs)", "Body Fat %", "Waist (in)"]}
            rows={health.bodyMeasurements.map((m) => [m.date, round(m.weightLbs, 1), round(m.bodyFatPct, 1), round(m.waistInches, 1)])}
          />
        </div>
      );

    case "workouts":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Dumbbell size={16} /> Workouts ({health.workouts.length})
          </h2>
          {health.workouts.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No workouts for this period</p>
          ) : (
            <div className="space-y-2">
              {health.workouts.map((w) => {
                const exercises = (w.exercises ?? []) as Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
                let meta: { type?: string; durationMinutes?: number } | null = null;
                try { if (w.notes) meta = JSON.parse(w.notes); } catch { /* not JSON */ }
                return (
                  <div key={w.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-white font-medium">{w.date}</p>
                      {meta?.type && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300">{meta.type}</span>}
                    </div>
                    {meta?.durationMinutes && <p className="text-[10px] text-gray-500">{meta.durationMinutes} min</p>}
                    {exercises.length > 0 && !exercises[0]?.exerciseId?.startsWith("quick_log:") && (
                      <p className="text-xs text-gray-400 mt-1">{exercises.length} exercises, {exercises.reduce((s, e) => s + (e.sets?.length ?? 0), 0)} total sets</p>
                    )}
                    {w.notes && !meta && <p className="text-[10px] text-gray-500 mt-1">{w.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );

    case "activity":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Footprints size={16} /> Activity ({health.activity.length} days)
          </h2>
          {health.activity.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No activity data for this period</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Steps</p>
                  <p className="text-lg font-bold text-white">
                    {health.activity.filter((a) => a.steps != null).length > 0
                      ? Math.round(health.activity.reduce((sum, a) => sum + (a.steps ?? 0), 0) / health.activity.filter((a) => a.steps != null).length).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Calories</p>
                  <p className="text-lg font-bold text-white">
                    {health.activity.filter((a) => a.caloriesActive != null).length > 0
                      ? Math.round(health.activity.reduce((sum, a) => sum + (a.caloriesActive ?? 0), 0) / health.activity.filter((a) => a.caloriesActive != null).length)
                      : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Active Min</p>
                  <p className="text-lg font-bold text-white">
                    {health.activity.filter((a) => a.exerciseMinutes != null).length > 0
                      ? Math.round(health.activity.reduce((sum, a) => sum + (a.exerciseMinutes ?? 0), 0) / health.activity.filter((a) => a.exerciseMinutes != null).length)
                      : "—"}
                  </p>
                </div>
              </div>
              <DataTable
                headers={["Date", "Steps", "Calories Burned", "Active Minutes"]}
                rows={health.activity.map((a) => [
                  a.date,
                  a.steps != null ? a.steps.toLocaleString() : null,
                  round(a.caloriesActive, 0),
                  a.exerciseMinutes != null ? `${round(a.exerciseMinutes, 0)} min` : null,
                ])}
              />
            </>
          )}
        </div>
      );

    case "goals":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Target size={16} /> Health Goals ({health.goals.length})
          </h2>
          {health.goals.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No goals set</p>
          ) : (
            <div className="space-y-3">
              {health.goals.map((g) => {
                const range = Math.abs(g.targetValue - g.startValue);
                const progress = range > 0 ? Math.min(100, Math.round(Math.abs(g.currentValue - g.startValue) / range * 100)) : 0;
                return (
                  <div key={g.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-white font-medium">{g.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        g.status === "active" ? "bg-green-500/10 text-green-400" :
                        g.status === "completed" ? "bg-blue-500/10 text-blue-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{g.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">{g.category || "General"} &bull; {g.targetDirection || "reach"} to {round(g.targetValue, 1)} {g.targetUnit}</p>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-kairos-gold rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500">{round(g.currentValue, 1)} / {round(g.targetValue, 1)} {g.targetUnit} ({progress}%)</p>
                    {g.milestones.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {g.milestones.map((m, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${m.reached ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"}`}>
                            {m.label}: {round(m.targetValue, 1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );

    case "labs":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <FlaskConical size={16} /> Lab Results ({health.labs.length})
          </h2>
          {health.labs.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No lab results</p>
          ) : (
            <div className="space-y-4">
              {health.labs.map((lab) => (
                <div key={lab.id} className="border border-gray-800 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-800/30 flex justify-between items-center">
                    <p className="text-sm text-white font-medium">Lab — {new Date(lab.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <span className="text-[10px] text-gray-500">{lab.biomarkers.length} markers</span>
                  </div>
                  {lab.biomarkers.length > 0 && (
                    <DataTable
                      headers={["Biomarker", "Value", "Unit", "Ref Low", "Ref High", "Status"]}
                      rows={lab.biomarkers.map((b) => [b.code, round(b.value, 2), b.unit, round(b.refLow, 2), round(b.refHigh, 2), b.status])}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "nutrition":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Apple size={16} /> Nutrition ({health.nutrition.recentMeals.length} meals)
          </h2>
          <DataTable
            headers={["Date", "Meal", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"]}
            rows={health.nutrition.recentMeals.map((m) => [m.date, m.mealType, m.calories, m.protein, m.carbs, m.fat])}
          />
        </div>
      );

    case "fasting":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Timer size={16} /> Fasting Log ({health.fasting.length} sessions)
          </h2>
          {health.fasting.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No fasting data for this period</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Total Fasts</p>
                  <p className="text-lg font-bold text-white">{health.fasting.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Completed</p>
                  <p className="text-lg font-bold text-green-400">{health.fasting.filter((f) => f.completed).length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Duration</p>
                  <p className="text-lg font-bold text-white">
                    {(() => {
                      const durations = health.fasting
                        .filter((f) => f.startedAt && f.endedAt)
                        .map((f) => (new Date(f.endedAt!).getTime() - new Date(f.startedAt!).getTime()) / 3600000);
                      return durations.length > 0 ? `${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}h` : "—";
                    })()}
                  </p>
                </div>
              </div>
              <DataTable
                headers={["Date", "Started", "Ended", "Duration", "Completed"]}
                rows={health.fasting.map((f) => {
                  const started = f.startedAt ? new Date(f.startedAt) : null;
                  const ended = f.endedAt ? new Date(f.endedAt) : null;
                  const durationHrs = started && ended ? ((ended.getTime() - started.getTime()) / 3600000).toFixed(1) + "h" : "—";
                  return [
                    f.date ?? (started ? started.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
                    started ? started.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—",
                    ended ? ended.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "In progress",
                    durationHrs,
                    f.completed ? "Yes" : "No",
                  ];
                })}
              />
            </>
          )}
        </div>
      );

    // "supplements" (Protocol) is rendered by <ProtocolEditor /> directly, not here.

    case "checkins":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <ClipboardList size={16} /> Daily Check-ins ({health.checkins.length})
          </h2>
          <DataTable
            headers={["Date", "Mood", "Energy", "Stress", "Sleep Quality", "Training"]}
            rows={health.checkins.map((c) => [c.date, c.mood, c.energy, c.stress, c.sleepQuality, c.trainingType])}
          />
        </div>
      );

    case "genetics":
      return (
        <div className="space-y-6">
          {/* Genetic Profile Status */}
          <div className="kairos-card">
            <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <Dna size={16} /> Genetic Profile
            </h2>
            {health.genetics?.profile ? (
              <div className="space-y-1 mb-4">
                <p className="text-sm text-gray-300">
                  Status: <span className={health.genetics.profile.status === "complete" ? "text-green-400" : "text-yellow-400"}>{health.genetics.profile.status}</span>
                </p>
                {health.genetics.profile.uploadType && <p className="text-sm text-gray-400">Source: {health.genetics.profile.uploadType}</p>}
                <p className="text-[10px] text-gray-500">Uploaded: {new Date(health.genetics.profile.createdAt).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No genetic profile uploaded</p>
            )}
          </div>

          {/* Pathway Risk Summary */}
          {health.genetics?.pathways && health.genetics.pathways.length > 0 && (
            <div className="kairos-card">
              <h2 className="text-base font-heading font-bold text-kairos-gold mb-3">Pathway Risk Summary</h2>
              <div className="space-y-2">
                {health.genetics.pathways.sort((a, b) => (b.homozygousCount ?? 0) - (a.homozygousCount ?? 0)).map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-white font-medium">{p.pathway}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        p.priorityLevel === "critical" ? "bg-red-500/10 text-red-400" :
                        p.priorityLevel === "high" ? "bg-orange-500/10 text-orange-400" :
                        p.priorityLevel === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{p.priorityLevel ?? "low"}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {p.genesAffected ?? 0}/{p.genesInPathway ?? 0} genes affected &bull;{" "}
                      {p.homozygousCount ?? 0} homozygous, {p.heterozygousCount ?? 0} heterozygous
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-Priority Markers */}
          {health.genetics?.markers && health.genetics.markers.length > 0 && (
            <div className="kairos-card">
              <h2 className="text-base font-heading font-bold text-kairos-gold mb-3">
                Genetic Markers ({health.genetics.markers.length})
              </h2>
              <div className="space-y-2">
                {health.genetics.markers
                  .sort((a, b) => {
                    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (order[a.clinicalPriority ?? "low"] ?? 3) - (order[b.clinicalPriority ?? "low"] ?? 3);
                  })
                  .map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-white font-medium">{m.gene}{m.rsId ? ` (${m.rsId})` : ""}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          m.clinicalPriority === "critical" ? "bg-red-500/10 text-red-400" :
                          m.clinicalPriority === "high" ? "bg-orange-500/10 text-orange-400" :
                          m.clinicalPriority === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-gray-700 text-gray-400"
                        }`}>{m.clinicalPriority ?? "low"}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {m.mutation ?? "variant"} &bull; {m.pathway ?? ""}{m.function ? ` &bull; ${m.function}` : ""}
                      </p>
                      {m.symptoms && <p className="text-[10px] text-gray-500 mt-1">Symptoms: {m.symptoms}</p>}
                      {m.supplementProtocol && <p className="text-[10px] text-green-400/70 mt-0.5">Supplements: {m.supplementProtocol}</p>}
                      {m.dietStrategy && <p className="text-[10px] text-blue-400/70 mt-0.5">Diet: {m.dietStrategy}</p>}
                      {m.lifestyleStrategy && <p className="text-[10px] text-purple-400/70 mt-0.5">Lifestyle: {m.lifestyleStrategy}</p>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Uploaded Genetic Reports (stored as clinical docs tagged kind=genetics) */}
          {(() => {
            const geneticsDocs = (health.clinicalDocs ?? []).filter(
              (d) => (d.parsedData as Record<string, unknown> | null)?.kind === "genetics",
            );
            if (geneticsDocs.length === 0) return null;
            return (
              <div className="kairos-card">
                <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                  <FileText size={16} /> Uploaded Genetic Reports ({geneticsDocs.length})
                </h2>
                <div className="space-y-3">
                  {geneticsDocs.map((doc) => {
                    return (
                      <div key={doc.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-white font-medium">{doc.title ?? "Genetic Report"}</p>
                          <span className="text-[10px] text-gray-500">{doc.reportDate ? new Date(doc.reportDate).toLocaleDateString() : "Unknown date"}</span>
                        </div>
                        {doc.providerName && <p className="text-[10px] text-gray-400 mb-1">Provider: {doc.providerName}</p>}
                        <DocFileLink docId={doc.id} hasFile={doc.hasFile} sourceFileName={doc.sourceFileName} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {!health.genetics?.profile
            && !health.genetics?.markers?.length
            && !(health.clinicalDocs ?? []).some((d) => (d.parsedData as Record<string, unknown> | null)?.kind === "genetics") && (
            <div className="kairos-card p-6 text-center">
              <p className="text-sm text-gray-500">No genetic data available for this client</p>
            </div>
          )}
        </div>
      );

    case "clinical":
      return (
        <div className="space-y-6">
          {!health.clinicalDocs || health.clinicalDocs.length === 0 ? (
            <div className="kairos-card p-6 text-center">
              <p className="text-sm text-gray-500">No clinical documents uploaded</p>
            </div>
          ) : (
            <>
              {/* DEXA Scans */}
              {(() => {
                const dexaDocs = health.clinicalDocs.filter((d) => d.docType === "dexa_scan");
                if (dexaDocs.length === 0) return null;
                return (
                  <div className="kairos-card">
                    <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                      <Scale size={16} /> DEXA Scans ({dexaDocs.length})
                    </h2>
                    <div className="space-y-3">
                      {dexaDocs.map((doc) => {
                        const pd = doc.parsedData as Record<string, unknown> | null;
                        return (
                          <div key={doc.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm text-white font-medium">{doc.title ?? "DEXA Scan"}</p>
                              <span className="text-[10px] text-gray-500">{doc.reportDate ? new Date(doc.reportDate).toLocaleDateString() : "Unknown date"}</span>
                            </div>
                            {pd && Object.keys(pd).length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(pd)
                                  .filter(([k, v]) => v != null && typeof v !== "object" && k !== "fileUrl" && k !== "url")
                                  .slice(0, 12)
                                  .map(([k, v]) => (
                                    <div key={k} className="text-center p-1.5 rounded bg-gray-800/50">
                                      <p className="text-[10px] text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</p>
                                      <p className="text-xs text-white font-medium">{String(v)}</p>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-500">Status: {doc.status ?? "pending"}</p>
                            )}
                            {doc.providerName && <p className="text-[10px] text-gray-500 mt-2">Provider: {doc.providerName}</p>}
                            <DocFileLink docId={doc.id} hasFile={doc.hasFile} sourceFileName={doc.sourceFileName} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Gut Biome Reports */}
              {(() => {
                const gutDocs = health.clinicalDocs.filter((d) => d.docType === "gut_biome");
                if (gutDocs.length === 0) return null;
                return (
                  <div className="kairos-card">
                    <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                      <FlaskConical size={16} /> Gut Biome Reports ({gutDocs.length})
                    </h2>
                    <div className="space-y-3">
                      {gutDocs.map((doc) => {
                        const pd = doc.parsedData as Record<string, unknown> | null;
                        return (
                          <div key={doc.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm text-white font-medium">{doc.title ?? "Gut Biome Report"}</p>
                              <span className="text-[10px] text-gray-500">{doc.reportDate ? new Date(doc.reportDate).toLocaleDateString() : "Unknown date"}</span>
                            </div>
                            {pd && Object.keys(pd).length > 0 ? (
                              <div className="space-y-1">
                                {(pd.diversityScore != null) && (
                                  <p className="text-xs text-gray-300">Diversity Score: <span className="text-white font-medium">{String(pd.diversityScore)}/100</span> ({String(pd.diversityRating ?? "?")})</p>
                                )}
                                {(() => {
                                  const scores = pd.healthScores as Array<{ name: string; status: string }> | undefined;
                                  if (!scores?.length) return null;
                                  const attention = scores.filter(s => s.status?.toLowerCase() === "attention");
                                  const improve = scores.filter(s => s.status?.toLowerCase() === "improve");
                                  return (
                                    <>
                                      {attention.length > 0 && <p className="text-[10px] text-red-400">Attention: {attention.map(s => s.name).join(", ")}</p>}
                                      {improve.length > 0 && <p className="text-[10px] text-yellow-400">Improve: {improve.map(s => s.name).join(", ")}</p>}
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-500">Status: {doc.status ?? "pending"}</p>
                            )}
                            <DocFileLink docId={doc.id} hasFile={doc.hasFile} sourceFileName={doc.sourceFileName} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Medical Records */}
              {(() => {
                const medDocs = health.clinicalDocs.filter(
                  (d) => d.docType === "medical_record" && (d.parsedData as Record<string, unknown> | null)?.kind !== "genetics",
                );
                if (medDocs.length === 0) return null;
                return (
                  <div className="kairos-card">
                    <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
                      <FileText size={16} /> Medical Records ({medDocs.length})
                    </h2>
                    <div className="space-y-3">
                      {medDocs.map((doc) => {
                        const pd = doc.parsedData as Record<string, unknown> | null;
                        return (
                          <div key={doc.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm text-white font-medium">{doc.title ?? "Medical Record"}</p>
                              <span className="text-[10px] text-gray-500">{doc.reportDate ? new Date(doc.reportDate).toLocaleDateString() : "Unknown date"}</span>
                            </div>
                            {doc.providerName && <p className="text-[10px] text-gray-400 mb-1">Provider: {doc.providerName}</p>}
                            {pd && Object.keys(pd).length > 0 ? (
                              <div className="space-y-1">
                                {pd.documentType ? <p className="text-xs text-gray-300">Type: {String(pd.documentType)}</p> : null}
                                {(pd.diagnoses as string[] | undefined)?.length ? (
                                  <p className="text-xs text-gray-300">Diagnoses: {(pd.diagnoses as string[]).join(", ")}</p>
                                ) : null}
                                {(pd.medications as Array<{ name: string }> | undefined)?.length ? (
                                  <p className="text-xs text-gray-300">Medications: {(pd.medications as Array<{ name: string }>).map(m => m.name).join(", ")}</p>
                                ) : null}
                                {(pd.findings as string[] | undefined)?.length ? (
                                  <p className="text-xs text-gray-400">Findings: {(pd.findings as string[]).join("; ")}</p>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-500">Status: {doc.status ?? "pending"}</p>
                            )}
                            <DocFileLink docId={doc.id} hasFile={doc.hasFile} sourceFileName={doc.sourceFileName} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ─── Coach write panels (Add / Upload / Create) ─────────────────

/** Upload a file via the shared /api/upload endpoint and return its URL + name. */
async function uploadCoachFile(
  file: File,
  category: "clinical" | "lab" | "document",
): Promise<{ url: string; fileName: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const result = await res.json();
  if (!res.ok || !result.url) {
    throw new Error(result.error || "Upload failed");
  }
  return { url: result.url as string, fileName: (result.fileName as string) ?? file.name };
}

const ASSIGNMENT_STATUS_BADGES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  cancelled: "bg-gray-700/50 text-gray-400 border-gray-600",
};

/**
 * Renders an "Open file" link for an uploaded clinical/lab/genetics document.
 * The raw storage URL is never sent to the browser — access is routed through
 * the authorized /api/phi-file proxy using the document id.
 */
function DocFileLink({
  docId,
  hasFile,
  sourceFileName,
}: {
  docId: string;
  hasFile?: boolean;
  sourceFileName?: string | null;
}) {
  if (!hasFile) return null;
  const label = sourceFileName || "Uploaded file";
  return (
    <a
      href={`/api/phi-file?type=clinical&id=${docId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-kairos-gold hover:underline"
    >
      <FileText size={11} /> Open {label}
    </a>
  );
}

/** Small error banner reused across the coach write panels. */
function PanelError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
      <p className="text-xs text-red-400">{message}</p>
      <button onClick={onClose} className="text-red-400/60 hover:text-red-400 shrink-0"><X size={12} /></button>
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Training Programs (coach.plans) ────────────────────────────

type ExerciseDraft = { name: string; muscleGroup: string; sets: string; reps: string; restSeconds: string; notes: string; videoUrl: string };
type SessionDraft = { name: string; exercises: ExerciseDraft[] };

function TrainingProgramManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listQuery = trpc.coach.plans.listTrainingPrograms.useQuery(
    { clientId },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  const invalidate = () => utils.coach.plans.listTrainingPrograms.invalidate({ clientId });

  const createMutation = trpc.coach.plans.createTrainingProgram.useMutation({
    onSuccess: () => { invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });
  const statusMutation = trpc.coach.plans.updateAssignmentStatus.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => setErrorMsg(e.message),
  });

  const programs = listQuery.data ?? [];

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <Dumbbell size={16} /> Training Programs
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setErrorMsg(null); setShowTemplateModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
            >
              <ClipboardList size={12} /> Apply Template
            </button>
            <button
              onClick={() => { setErrorMsg(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
            >
              <Plus size={12} /> Create / Assign Program
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
          <Lock size={10} /> Read-only — you don&apos;t have Exercise edit access for this client.
        </p>
      )}

      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {listQuery.isLoading ? (
        <p className="text-xs text-gray-500 text-center py-6">Loading programs...</p>
      ) : programs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No training programs assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => (
            <div key={p.assignmentId} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-white font-medium">{p.name ?? "Program"}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${ASSIGNMENT_STATUS_BADGES[p.status ?? "cancelled"] ?? ASSIGNMENT_STATUS_BADGES.cancelled}`}>
                      {p.status ?? "unknown"}
                    </span>
                    {p.isAiGenerated && <span className="text-[9px] px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 font-semibold uppercase">AI</span>}
                  </div>
                  {p.description && <p className="text-[11px] text-gray-500 mt-0.5">{p.description}</p>}
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Start {p.startDate}
                    {p.durationWeeks ? ` · ${p.durationWeeks} weeks` : ""}
                    {` · ${p.sessions.length} session${p.sessions.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status !== "active" && (
                      <button onClick={() => statusMutation.mutate({ assignmentId: p.assignmentId, clientId, status: "active" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors disabled:opacity-50">Activate</button>
                    )}
                    {p.status === "active" && (
                      <button onClick={() => statusMutation.mutate({ assignmentId: p.assignmentId, clientId, status: "paused" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors disabled:opacity-50">Pause</button>
                    )}
                    {p.status !== "completed" && (
                      <button onClick={() => statusMutation.mutate({ assignmentId: p.assignmentId, clientId, status: "completed" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-50">Complete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TrainingProgramModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}

      {showTemplateModal && (
        <ApplyProgramTemplateModal
          clientId={clientId}
          type="workouts"
          onClose={() => setShowTemplateModal(false)}
          onApplied={invalidate}
        />
      )}
    </div>
  );
}

function TrainingProgramModal({
  saving,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    durationWeeks?: number;
    startDate: string;
    sessions?: Array<{ dayNumber: number; name?: string; exercises: Array<{ name: string; muscleGroup?: string; sets: number; reps: string; restSeconds?: number; notes?: string; videoUrl?: string }> }>;
    activate?: boolean;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { name: "", exercises: [{ name: "", muscleGroup: "", sets: "3", reps: "10", restSeconds: "", notes: "", videoUrl: "" }] },
  ]);

  const addSession = () => setSessions((s) => [...s, { name: "", exercises: [{ name: "", muscleGroup: "", sets: "3", reps: "10", restSeconds: "", notes: "", videoUrl: "" }] }]);
  const removeSession = (i: number) => setSessions((s) => s.filter((_, idx) => idx !== i));
  const updateSession = (i: number, key: keyof SessionDraft, value: string) =>
    setSessions((s) => s.map((sess, idx) => (idx === i ? { ...sess, [key]: value } : sess)));
  const addExercise = (si: number) =>
    setSessions((s) => s.map((sess, idx) => (idx === si ? { ...sess, exercises: [...sess.exercises, { name: "", muscleGroup: "", sets: "3", reps: "10", restSeconds: "", notes: "", videoUrl: "" }] } : sess)));
  const removeExercise = (si: number, ei: number) =>
    setSessions((s) => s.map((sess, idx) => (idx === si ? { ...sess, exercises: sess.exercises.filter((_, x) => x !== ei) } : sess)));
  const updateExercise = (si: number, ei: number, key: keyof ExerciseDraft, value: string) =>
    setSessions((s) => s.map((sess, idx) => (idx === si ? { ...sess, exercises: sess.exercises.map((ex, x) => (x === ei ? { ...ex, [key]: value } : ex)) } : sess)));

  const handleSubmit = () => {
    if (!name.trim() || !startDate) return;
    const builtSessions = sessions
      .map((sess, idx) => ({
        dayNumber: idx + 1,
        name: sess.name.trim() || undefined,
        exercises: sess.exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            name: ex.name.trim(),
            muscleGroup: ex.muscleGroup || undefined,
            sets: Number(ex.sets) || 0,
            reps: ex.reps.trim() || "0",
            restSeconds: ex.restSeconds.trim() ? Number(ex.restSeconds) : undefined,
            notes: ex.notes.trim() || undefined,
            videoUrl: ex.videoUrl.trim() || undefined,
          })),
      }))
      .filter((sess) => sess.exercises.length > 0);

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      durationWeeks: durationWeeks.trim() ? Number(durationWeeks) : undefined,
      startDate,
      sessions: builtSessions.length > 0 ? builtSessions : undefined,
      activate: true,
    });
  };

  return (
    <Modal title="Create / Assign Training Program" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Program Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 12-Week Strength Base" className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Focus, goals, notes..." className="kairos-input w-full h-16 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Duration (weeks)</label>
            <input type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} placeholder="e.g. 12" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Start Date *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="kairos-input w-full" />
          </div>
        </div>

        {/* Sessions builder */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 uppercase">Sessions</label>
            <button onClick={addSession} className="flex items-center gap-1 text-[10px] text-kairos-gold hover:underline"><Plus size={10} /> Add Day</button>
          </div>
          <div className="space-y-3">
            {sessions.map((sess, si) => (
              <div key={si} className="p-2.5 rounded-lg border border-gray-800 bg-gray-800/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-500 shrink-0">Day {si + 1}</span>
                  <input type="text" value={sess.name} onChange={(e) => updateSession(si, "name", e.target.value)} placeholder="Session name (e.g. Upper Body)" className="kairos-input flex-1 py-1 text-xs" />
                  {sessions.length > 1 && (
                    <button onClick={() => removeSession(si)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {sess.exercises.map((ex, ei) => (
                    <div key={ei} className="space-y-1 pb-1.5 border-b border-gray-800/40 last:border-0">
                      <div className="flex items-center gap-1.5">
                        <ExercisePicker value={ex.name} onChange={(name, group) => { updateExercise(si, ei, "name", name); updateExercise(si, ei, "muscleGroup", group ?? ""); }} className="flex-1" placeholder="Exercise" />
                        <input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(si, ei, "sets", e.target.value)} placeholder="Sets" title="Sets" className="kairos-input w-14 py-1 text-xs" />
                        <input type="text" value={ex.reps} onChange={(e) => updateExercise(si, ei, "reps", e.target.value)} placeholder="Reps" title="Reps" className="kairos-input w-16 py-1 text-xs" />
                        {sess.exercises.length > 1 && (
                          <button onClick={() => removeExercise(si, ei)} className="p-1 text-gray-500 hover:text-red-400"><X size={12} /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 pl-0.5">
                        <input type="url" value={ex.videoUrl} onChange={(e) => updateExercise(si, ei, "videoUrl", e.target.value)} placeholder="Video link (YouTube/AI demo)" title="Exercise demo video URL" className="kairos-input flex-1 py-1 text-[11px]" />
                        <input type="text" value={ex.notes} onChange={(e) => updateExercise(si, ei, "notes", e.target.value)} placeholder="Notes (tempo, cues...)" title="Coaching notes" className="kairos-input flex-1 py-1 text-[11px]" />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addExercise(si)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-kairos-gold"><Plus size={10} /> Add Exercise</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || !startDate || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Create & Assign"}
        </button>
      </div>
    </Modal>
  );
}

/** Apply one of the coach's saved workout templates to this client. */
/**
 * Apply a saved PROGRAM TEMPLATE (from the Programs page — coach.programTemplates)
 * to THIS one client, OVERWRITING their live workout or diet. Same template
 * library the Programs page builds, so the two places stay in sync. Two steps:
 * pick a template → confirm the overwrite (it's destructive + notifies the client).
 */
function ApplyProgramTemplateModal({
  clientId,
  type,
  onClose,
  onApplied,
}: {
  clientId: string;
  type: "workouts" | "diet";
  onClose: () => void;
  onApplied: () => void;
}) {
  const templatesQuery = trpc.coach.programTemplates.list.useQuery(
    { type },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  const templates = templatesQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{
    applied: number;
    skipped: Array<{ clientId: string; reason: string }>;
  } | null>(null);

  const applyMutation = trpc.coach.programTemplates.applyToClients.useMutation({
    onSuccess: (res) => {
      setResult(res);
      onApplied();
    },
  });

  const isDiet = type === "diet";
  const title = isDiet ? "Apply Diet Template" : "Apply Exercise Template";
  const overwrites = isDiet ? "current diet" : "current workout";
  const selectedName = templates.find((t) => t.id === selectedId)?.name;

  // Result view.
  if (result) {
    const skippedReason = result.skipped[0]?.reason;
    return (
      <Modal title={title} onClose={onClose}>
        {result.applied > 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
            <p className="text-sm text-white font-medium mb-1">Template applied</p>
            <p className="text-xs text-gray-500">
              This client&apos;s {overwrites} was replaced and they were notified.
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <AlertCircle size={32} className="mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-white font-medium mb-1">Not applied</p>
            <p className="text-xs text-gray-500">
              {skippedReason === "no_access"
                ? "You don't have edit access for this client."
                : "Something went wrong applying the template."}
            </p>
          </div>
        )}
        <button onClick={onClose} className="kairos-btn-gold w-full mt-2">Done</button>
      </Modal>
    );
  }

  // Confirm overwrite.
  if (confirming) {
    return (
      <Modal title={title} onClose={onClose}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">
            Applying &ldquo;{selectedName}&rdquo; will replace this client&apos;s {overwrites} with the template. Their
            previous plan will be overwritten and they&apos;ll be notified. This can&apos;t be undone.
          </p>
        </div>
        {applyMutation.isError && (
          <div className="px-3 py-2 mb-3 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertCircle size={13} /> {applyMutation.error.message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setConfirming(false)}
            disabled={applyMutation.isPending}
            className="kairos-btn-outline flex-1 disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={() => applyMutation.mutate({ id: selectedId!, clientIds: [clientId] })}
            disabled={applyMutation.isPending}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-medium bg-amber-500/90 hover:bg-amber-500 text-white transition-colors disabled:opacity-50"
          >
            {applyMutation.isPending ? "Overwriting..." : "Overwrite & notify"}
          </button>
        </div>
      </Modal>
    );
  }

  // Template selection.
  return (
    <Modal title={title} onClose={onClose}>
      <div className="mb-4">
        <label className="text-[10px] text-gray-500 uppercase mb-1 block">
          {isDiet ? "Diet template" : "Exercise template"}
        </label>
        {templatesQuery.isLoading ? (
          <p className="text-xs text-gray-500 text-center py-6">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">
            No saved {isDiet ? "diet" : "exercise"} templates yet — create one on the Programs page.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {templates.map((t) => {
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-kairos-gold/50 bg-kairos-gold/10"
                      : "border-gray-800 bg-gray-800/20 hover:bg-gray-800/40"
                  }`}
                >
                  <p className="text-sm text-white font-medium">{t.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {t.rowCount} {isDiet ? "meal" : "exercise"}{t.rowCount === 1 ? "" : "s"}
                    {type === "workouts" && t.dayCount != null ? ` · ${t.dayCount} day${t.dayCount === 1 ? "" : "s"}` : ""}
                    {isDiet && t.planType ? ` · ${t.planType}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 mb-3">
        <AlertTriangle size={12} className="shrink-0" /> Applying replaces this client&apos;s {overwrites}.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button
          onClick={() => selectedId && setConfirming(true)}
          disabled={!selectedId}
          className="kairos-btn-gold flex-1 disabled:opacity-50"
        >
          Apply Template
        </button>
      </div>
    </Modal>
  );
}

// ─── Meal Plans (coach.plans) ───────────────────────────────────

function MealPlanManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listQuery = trpc.coach.plans.listMealPlans.useQuery(
    { clientId },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  // Same source the Bulk Edit "Diet" tab reads, so the meals shown here match it.
  const dietGrid = trpc.coach.protocolBulk.getGrid.useQuery(
    { clientId, type: "diet" },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dietRows = ((dietGrid.data as any)?.rows ?? []) as Array<Record<string, unknown>>;
  // Applying a diet template overwrites the meals grid AND may create/replace the
  // active meal plan, so refresh both views.
  const invalidate = () => {
    utils.coach.plans.listMealPlans.invalidate({ clientId });
    utils.coach.protocolBulk.getGrid.invalidate({ clientId, type: "diet" });
  };

  const createMutation = trpc.coach.plans.createMealPlan.useMutation({
    onSuccess: () => { invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });
  const statusMutation = trpc.coach.plans.updateMealPlanStatus.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => setErrorMsg(e.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans = (listQuery.data ?? []) as any[];

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <Apple size={16} /> Meal Plans
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setErrorMsg(null); setShowTemplateModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
            >
              <ClipboardList size={12} /> Apply Template
            </button>
            <button
              onClick={() => { setErrorMsg(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
            >
              <Plus size={12} /> Create / Assign Meal Plan
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
          <Lock size={10} /> Read-only — you don&apos;t have Diet edit access for this client.
        </p>
      )}

      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {/* Current meals — the same data as the Bulk Edit "Diet" tab. */}
      {dietRows.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Meal</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium text-right">kcal</th>
              </tr>
            </thead>
            <tbody>
              {dietRows.map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{String(r.day ?? "")}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{String(r.mealType ?? "")}</td>
                  <td className="px-3 py-2 text-white whitespace-nowrap">{String(r.meal ?? "")}</td>
                  <td className="px-3 py-2 text-gray-400">{String(r.items ?? "")}</td>
                  <td className="px-3 py-2 text-kairos-gold text-right whitespace-nowrap">{r.calories != null ? String(r.calories) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {listQuery.isLoading ? (
        <p className="text-xs text-gray-500 text-center py-6">Loading meal plans...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No meal plans assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => {
            const mt = p.macroTargets as { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number } | null;
            const notes = (p.meals && typeof p.meals === "object" && "notes" in p.meals) ? String(p.meals.notes ?? "") : "";
            return (
              <div key={p.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white font-medium">{p.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${ASSIGNMENT_STATUS_BADGES[p.status] ?? ASSIGNMENT_STATUS_BADGES.cancelled}`}>
                        {p.status}
                      </span>
                      {p.isAiGenerated && <span className="text-[9px] px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 font-semibold uppercase">AI</span>}
                    </div>
                    {mt && (mt.calories != null) && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {mt.calories} kcal · P {mt.protein ?? 0}g · C {mt.carbs ?? 0}g · F {mt.fat ?? 0}g{mt.fiber != null ? ` · Fiber ${mt.fiber}g` : ""}
                      </p>
                    )}
                    {notes && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notes}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      {p.status !== "active" && (
                        <button onClick={() => statusMutation.mutate({ mealPlanId: p.id, clientId, status: "active" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors disabled:opacity-50">Activate</button>
                      )}
                      {p.status === "active" && (
                        <button onClick={() => statusMutation.mutate({ mealPlanId: p.id, clientId, status: "paused" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors disabled:opacity-50">Pause</button>
                      )}
                      {p.status !== "completed" && (
                        <button onClick={() => statusMutation.mutate({ mealPlanId: p.id, clientId, status: "completed" })} disabled={statusMutation.isPending} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-50">Complete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <MealPlanModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}

      {showTemplateModal && (
        <ApplyProgramTemplateModal
          clientId={clientId}
          type="diet"
          onClose={() => setShowTemplateModal(false)}
          onApplied={invalidate}
        />
      )}
    </div>
  );
}

function MealPlanModal({
  saving,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    meals?: { notes: string };
    macroTargets?: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  }) => void;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [mealsText, setMealsText] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const anyMacro = [calories, protein, carbs, fat, fiber].some((v) => v.trim() !== "");
    onSubmit({
      name: name.trim(),
      meals: mealsText.trim() ? { notes: mealsText.trim() } : undefined,
      macroTargets: anyMacro
        ? {
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
            fiber: Number(fiber) || 0,
          }
        : undefined,
    });
  };

  return (
    <Modal title="Create / Assign Meal Plan" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Plan Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-Protein Cut" className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Macro Targets (optional)</label>
          <div className="grid grid-cols-5 gap-2">
            <input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="kcal" title="Calories" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="P (g)" title="Protein" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="C (g)" title="Carbs" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={fat} onChange={(e) => setFat(e.target.value)} placeholder="F (g)" title="Fat" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="Fiber" title="Fiber" className="kairos-input w-full py-1 text-xs" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Meals / Notes</label>
          <textarea value={mealsText} onChange={(e) => setMealsText(e.target.value)} placeholder="Describe the plan's meals, timing, and guidance..." className="kairos-input w-full h-32 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Create & Assign"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Sleep manual entry (coach.plans) ───────────────────────────

function SleepEntryManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.plans.createSleepEntry.useMutation({
    onSuccess: () => { utils.coach.clients.getClientHealthData.invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <Moon size={16} /> Add Sleep Entry
        </h2>
        {canEdit && (
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Add Sleep Entry
          </button>
        )}
      </div>
      {canEdit ? (
        <p className="text-[11px] text-gray-500">Manually log a sleep session for this client.</p>
      ) : (
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock size={10} /> Read-only — you don&apos;t have Health Data edit access.</p>
      )}
      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {showModal && (
        <SleepEntryModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </div>
  );
}

function SleepEntryModal({
  saving,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    date: string; bedtime?: string; wakeTime?: string;
    totalMinutes?: number; deepMinutes?: number; remMinutes?: number; lightMinutes?: number; awakeMinutes?: number;
    score?: number; notes?: string;
  }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [deepHours, setDeepHours] = useState("");
  const [remHours, setRemHours] = useState("");
  const [lightHours, setLightHours] = useState("");
  const [awakeMin, setAwakeMin] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const hoursToMin = (v: string): number | undefined => (v.trim() ? Math.round(Number(v) * 60) : undefined);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      bedtime: bedtime.trim() || undefined,
      wakeTime: wakeTime.trim() || undefined,
      totalMinutes: hoursToMin(totalHours),
      deepMinutes: hoursToMin(deepHours),
      remMinutes: hoursToMin(remHours),
      lightMinutes: hoursToMin(lightHours),
      awakeMinutes: awakeMin.trim() ? Number(awakeMin) : undefined,
      score: score.trim() ? Number(score) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title="Add Sleep Entry" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Sleep Score</label>
            <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="0-100" className="kairos-input w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Bedtime</label>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Wake Time</label>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="kairos-input w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Total Sleep (hours)</label>
          <input type="number" min={0} step="0.1" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} placeholder="e.g. 7.5" className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Stages (optional)</label>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" min={0} step="0.1" value={deepHours} onChange={(e) => setDeepHours(e.target.value)} placeholder="Deep h" title="Deep (hours)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} step="0.1" value={remHours} onChange={(e) => setRemHours(e.target.value)} placeholder="REM h" title="REM (hours)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} step="0.1" value={lightHours} onChange={(e) => setLightHours(e.target.value)} placeholder="Light h" title="Light (hours)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={awakeMin} onChange={(e) => setAwakeMin(e.target.value)} placeholder="Awake m" title="Awake (minutes)" className="kairos-input w-full py-1 text-xs" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context, quality, disturbances..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!date || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Lab Results (coach.data) ───────────────────────────────────

type BiomarkerDraft = { code: string; value: string; unit: string; refLow: string; refHigh: string; status: string };

function LabResultManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.data.createLabResult.useMutation({
    onSuccess: () => { utils.coach.clients.getClientHealthData.invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <FlaskConical size={16} /> Add Lab Result
        </h2>
        {canEdit && (
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Add Lab Result
          </button>
        )}
      </div>
      {canEdit ? (
        <p className="text-[11px] text-gray-500">Manually enter a lab panel and its biomarker values.</p>
      ) : (
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock size={10} /> Read-only — you don&apos;t have Labs edit access.</p>
      )}
      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {showModal && (
        <LabResultModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </div>
  );
}

function LabResultModal({
  saving,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    receivedAt: string;
    biomarkers: Array<{ code: string; value: number; unit?: string | null; refLow?: number | null; refHigh?: number | null; status?: string | null }>;
  }) => void;
}) {
  const [receivedAt, setReceivedAt] = useState(todayISO());
  const [markers, setMarkers] = useState<BiomarkerDraft[]>([
    { code: "", value: "", unit: "", refLow: "", refHigh: "", status: "" },
  ]);

  const addMarker = () => setMarkers((m) => [...m, { code: "", value: "", unit: "", refLow: "", refHigh: "", status: "" }]);
  const removeMarker = (i: number) => setMarkers((m) => m.filter((_, idx) => idx !== i));
  const updateMarker = (i: number, key: keyof BiomarkerDraft, value: string) =>
    setMarkers((m) => m.map((mk, idx) => (idx === i ? { ...mk, [key]: value } : mk)));

  const validMarkers = markers.filter((m) => m.code.trim() && m.value.trim() !== "");
  const canSave = !!receivedAt && validMarkers.length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({
      receivedAt,
      biomarkers: validMarkers.map((m) => ({
        code: m.code.trim(),
        value: Number(m.value),
        unit: m.unit.trim() || null,
        refLow: m.refLow.trim() ? Number(m.refLow) : null,
        refHigh: m.refHigh.trim() ? Number(m.refHigh) : null,
        status: m.status.trim() || null,
      })),
    });
  };

  return (
    <Modal title="Add Lab Result" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Received Date *</label>
          <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="kairos-input w-full" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 uppercase">Biomarkers *</label>
            <button onClick={addMarker} className="flex items-center gap-1 text-[10px] text-kairos-gold hover:underline"><Plus size={10} /> Add Marker</button>
          </div>
          <div className="space-y-1.5">
            {markers.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input type="text" value={m.code} onChange={(e) => updateMarker(i, "code", e.target.value)} placeholder="Code (e.g. LDL)" className="kairos-input flex-1 py-1 text-xs" />
                <input type="number" step="any" value={m.value} onChange={(e) => updateMarker(i, "value", e.target.value)} placeholder="Value" title="Value" className="kairos-input w-16 py-1 text-xs" />
                <input type="text" value={m.unit} onChange={(e) => updateMarker(i, "unit", e.target.value)} placeholder="Unit" title="Unit" className="kairos-input w-16 py-1 text-xs" />
                <input type="number" step="any" value={m.refLow} onChange={(e) => updateMarker(i, "refLow", e.target.value)} placeholder="Low" title="Ref Low" className="kairos-input w-14 py-1 text-xs" />
                <input type="number" step="any" value={m.refHigh} onChange={(e) => updateMarker(i, "refHigh", e.target.value)} placeholder="High" title="Ref High" className="kairos-input w-14 py-1 text-xs" />
                {markers.length > 1 && (
                  <button onClick={() => removeMarker(i)} className="p-1 text-gray-500 hover:text-red-400"><X size={12} /></button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">Provide at least one marker with a code and value.</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!canSave || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Lab Result"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Clinical Docs & Genetics (coach.data.createClinicalDoc) ────

type ClinicalDocType = "dexa_scan" | "gut_biome" | "medical_record";

function ClinicalDocManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = trpc.coach.data.createClinicalDoc.useMutation({
    onSuccess: () => { utils.coach.clients.getClientHealthData.invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <FileText size={16} /> Add / Upload Health Record
        </h2>
        {canEdit && (
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Add / Upload
          </button>
        )}
      </div>
      {canEdit ? (
        <p className="text-[11px] text-gray-500">Upload a DEXA scan, gut biome, or medical record (PDF, image, or document).</p>
      ) : (
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock size={10} /> Read-only — you don&apos;t have Labs edit access.</p>
      )}
      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {showModal && (
        <ClinicalDocModal
          title="Add / Upload Health Record"
          uploadCategory="clinical"
          onClose={() => setShowModal(false)}
          saving={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </div>
  );
}

function GeneticsManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = trpc.coach.data.createClinicalDoc.useMutation({
    onSuccess: () => { utils.coach.clients.getClientHealthData.invalidate(); setShowModal(false); setErrorMsg(null); },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          <Dna size={16} /> Add / Upload Genetic Report
        </h2>
        {canEdit && (
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Add / Upload
          </button>
        )}
      </div>
      {canEdit ? (
        <p className="text-[11px] text-gray-500">Upload a genetic report (e.g. 23andMe, DNA panel). Stored with the client&apos;s clinical records.</p>
      ) : (
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock size={10} /> Read-only — you don&apos;t have Labs edit access.</p>
      )}
      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

      {showModal && (
        <ClinicalDocModal
          title="Add / Upload Genetic Report"
          uploadCategory="document"
          lockedDocType="medical_record"
          defaultTitle="Genetic Report"
          docKind="genetics"
          onClose={() => setShowModal(false)}
          saving={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </div>
  );
}

function ClinicalDocModal({
  title,
  uploadCategory,
  lockedDocType,
  defaultTitle,
  docKind,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  uploadCategory: "clinical" | "document";
  lockedDocType?: ClinicalDocType;
  defaultTitle?: string;
  docKind?: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    docType: ClinicalDocType;
    title: string;
    sourceFileName?: string | null;
    notes?: string | null;
    reportDate?: string | null;
    providerName?: string | null;
    parsedData?: Record<string, unknown> | null;
  }) => void;
}) {
  const [docType, setDocType] = useState<ClinicalDocType>(lockedDocType ?? "medical_record");
  const [docTitle, setDocTitle] = useState(defaultTitle ?? "");
  const [providerName, setProviderName] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = saving || uploading;

  const handleSubmit = async () => {
    if (!docTitle.trim()) return;
    setLocalError(null);
    let sourceFileName: string | null = null;
    // Tag the document with its kind (e.g. "genetics") so it can be surfaced
    // in the right tab even though it's stored in clinical_documents.
    let parsedData: Record<string, unknown> | null = docKind ? { kind: docKind } : null;
    if (file) {
      try {
        setUploading(true);
        const { url, fileName } = await uploadCoachFile(file, uploadCategory);
        sourceFileName = fileName;
        parsedData = { ...(parsedData ?? {}), fileUrl: url };
      } catch (e) {
        setUploading(false);
        setLocalError(e instanceof Error ? e.message : "Upload failed");
        return;
      }
      setUploading(false);
    }
    onSubmit({
      docType,
      title: docTitle.trim(),
      sourceFileName,
      notes: notes.trim() || null,
      reportDate: reportDate.trim() || null,
      providerName: providerName.trim() || null,
      parsedData,
    });
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 mb-4">
        {!lockedDocType && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Document Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value as ClinicalDocType)} className="kairos-input w-full">
              <option value="medical_record">Medical Record</option>
              <option value="dexa_scan">DEXA Scan</option>
              <option value="gut_biome">Gut Biome</option>
            </select>
          </div>
        )}
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Title *</label>
          <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Annual Physical Results" className="kairos-input w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Provider</label>
            <input type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g. Quest" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Report Date</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="kairos-input w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">File (PDF, image, or document)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-kairos-gold/30 file:bg-kairos-gold/10 file:text-kairos-gold file:text-xs file:font-medium hover:file:bg-kairos-gold/20"
          />
          {file && <p className="text-[10px] text-gray-500 mt-1">Selected: {file.name}</p>}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context or summary..." className="kairos-input w-full h-16 resize-none" />
        </div>
        {localError && <p className="text-xs text-red-400">{localError}</p>}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!docTitle.trim() || busy} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {uploading ? "Uploading..." : saving ? "Saving..." : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Health metric entry (coach.metrics) ────────────────────────

/** datetime-local default of "now" in the browser's local zone (YYYY-MM-DDTHH:mm). */
function nowLocalDatetime(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Shared header + read-only note used by the coach metric managers. */
function MetricPanel({
  icon,
  title,
  addLabel,
  description,
  canEdit,
  errorMsg,
  setErrorMsg,
  onAdd,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  addLabel: string;
  description: string;
  canEdit: boolean;
  errorMsg: string | null;
  setErrorMsg: (v: string | null) => void;
  onAdd: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="kairos-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2">
          {icon} {title}
        </h2>
        {canEdit && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> {addLabel}
          </button>
        )}
      </div>
      {canEdit ? (
        <p className="text-[11px] text-gray-500">{description}</p>
      ) : (
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock size={10} /> Read-only — you don&apos;t have Health Data edit access.</p>
      )}
      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />
      {children}
    </div>
  );
}

// ─── Glucose (coach.metrics.createGlucose) ──────────────────────

function GlucoseManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createGlucose.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Droplets size={16} />}
      title="Add Glucose Reading"
      addLabel="Add Reading"
      description="Manually log a glucose reading for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <GlucoseModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function GlucoseModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { timestamp: string; valueMgdl: number; notes?: string }) => void;
}) {
  const [when, setWhen] = useState(nowLocalDatetime());
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const canSave = !!when && value.trim() !== "";
  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({
      timestamp: new Date(when).toISOString(),
      valueMgdl: parseFloat(value),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title="Add Glucose Reading" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date &amp; Time *</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Glucose (mg/dL) *</label>
          <input type="number" step="any" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 95" className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fasting, post-meal, context..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!canSave || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </Modal>
  );
}

// ─── HRV (coach.metrics.createHrv) ──────────────────────────────

function HrvManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createHrv.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Heart size={16} />}
      title="Add HRV Reading"
      addLabel="Add Reading"
      description="Manually log an HRV (RMSSD) reading for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <HrvModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function HrvModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { timestamp: string; rmssd: number }) => void;
}) {
  const [when, setWhen] = useState(nowLocalDatetime());
  const [rmssd, setRmssd] = useState("");

  const canSave = !!when && rmssd.trim() !== "";
  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({ timestamp: new Date(when).toISOString(), rmssd: parseFloat(rmssd) });
  };

  return (
    <Modal title="Add HRV Reading" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date &amp; Time *</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">RMSSD (ms) *</label>
          <input type="number" step="any" min={0} value={rmssd} onChange={(e) => setRmssd(e.target.value)} placeholder="e.g. 45" className="kairos-input w-full" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!canSave || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Blood Pressure (coach.metrics.createBloodPressure) ─────────

function BloodPressureManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createBloodPressure.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Zap size={16} />}
      title="Add Blood Pressure"
      addLabel="Add Reading"
      description="Manually log a blood pressure reading for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <BloodPressureModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function BloodPressureModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    date: string; systolic: number; diastolic: number;
    pulse?: number; position?: string; arm?: string; notes?: string;
  }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [position, setPosition] = useState("");
  const [arm, setArm] = useState("");
  const [notes, setNotes] = useState("");

  const canSave = !!date && systolic.trim() !== "" && diastolic.trim() !== "";
  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({
      date,
      systolic: parseInt(systolic, 10),
      diastolic: parseInt(diastolic, 10),
      pulse: pulse.trim() ? parseInt(pulse, 10) : undefined,
      position: position.trim() || undefined,
      arm: arm.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title="Add Blood Pressure" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Systolic *</label>
            <input type="number" min={0} value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Diastolic *</label>
            <input type="number" min={0} value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Pulse</label>
            <input type="number" min={0} value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="bpm" className="kairos-input w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="kairos-input w-full">
              <option value="">—</option>
              <option value="sitting">Sitting</option>
              <option value="standing">Standing</option>
              <option value="lying">Lying</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Arm</label>
            <select value={arm} onChange={(e) => setArm(e.target.value)} className="kairos-input w-full">
              <option value="">—</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!canSave || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Body Measurement (coach.metrics.createBodyMeasurement) ─────

function BodyMeasurementManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createBodyMeasurement.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Scale size={16} />}
      title="Add Body Measurement"
      addLabel="Add Measurement"
      description="Manually log body measurements for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <BodyMeasurementModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function BodyMeasurementModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    date: string; weightLbs?: number; bodyFatPct?: number; waistInches?: number;
    chestInches?: number; hipsInches?: number; rightBicepInches?: number; leftBicepInches?: number;
    rightThighInches?: number; leftThighInches?: number; rightCalfInches?: number; leftCalfInches?: number;
    neckInches?: number; shouldersInches?: number; notes?: string;
  }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hips, setHips] = useState("");
  const [rightBicep, setRightBicep] = useState("");
  const [leftBicep, setLeftBicep] = useState("");
  const [rightThigh, setRightThigh] = useState("");
  const [leftThigh, setLeftThigh] = useState("");
  const [rightCalf, setRightCalf] = useState("");
  const [leftCalf, setLeftCalf] = useState("");
  const [neck, setNeck] = useState("");
  const [shoulders, setShoulders] = useState("");
  const [notes, setNotes] = useState("");

  const num = (v: string): number | undefined => (v.trim() ? parseFloat(v) : undefined);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      weightLbs: num(weight),
      bodyFatPct: num(bodyFat),
      waistInches: num(waist),
      chestInches: num(chest),
      hipsInches: num(hips),
      rightBicepInches: num(rightBicep),
      leftBicepInches: num(leftBicep),
      rightThighInches: num(rightThigh),
      leftThighInches: num(leftThigh),
      rightCalfInches: num(rightCalf),
      leftCalfInches: num(leftCalf),
      neckInches: num(neck),
      shouldersInches: num(shoulders),
      notes: notes.trim() || undefined,
    });
  };

  const circ: Array<[string, string, (v: string) => void]> = [
    ["Waist", waist, setWaist],
    ["Chest", chest, setChest],
    ["Hips", hips, setHips],
    ["Neck", neck, setNeck],
    ["Shoulders", shoulders, setShoulders],
    ["R Bicep", rightBicep, setRightBicep],
    ["L Bicep", leftBicep, setLeftBicep],
    ["R Thigh", rightThigh, setRightThigh],
    ["L Thigh", leftThigh, setLeftThigh],
    ["R Calf", rightCalf, setRightCalf],
    ["L Calf", leftCalf, setLeftCalf],
  ];

  return (
    <Modal title="Add Body Measurement" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Weight (lbs)</label>
            <input type="number" step="any" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 180" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Body Fat %</label>
            <input type="number" step="any" min={0} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="e.g. 18" className="kairos-input w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Circumferences (inches, optional)</label>
          <div className="grid grid-cols-3 gap-2">
            {circ.map(([label, value, setter]) => (
              <input
                key={label}
                type="number"
                step="any"
                min={0}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={label}
                title={label}
                className="kairos-input w-full py-1 text-xs"
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!date || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Measurement"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Activity (coach.metrics.createActivity) ────────────────────

function ActivityManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createActivity.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Footprints size={16} />}
      title="Add Activity Summary"
      addLabel="Add Activity"
      description="Manually log a daily activity summary for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <ActivityModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function ActivityModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { date: string; steps?: number; caloriesActive?: number; exerciseMinutes?: number; standHours?: number }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [steps, setSteps] = useState("");
  const [caloriesActive, setCaloriesActive] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");
  const [standHours, setStandHours] = useState("");

  const intOrUndef = (v: string): number | undefined => (v.trim() ? parseInt(v, 10) : undefined);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      steps: intOrUndef(steps),
      caloriesActive: intOrUndef(caloriesActive),
      exerciseMinutes: intOrUndef(exerciseMinutes),
      standHours: intOrUndef(standHours),
    });
  };

  return (
    <Modal title="Add Activity Summary" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Steps</label>
            <input type="number" min={0} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="e.g. 8000" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Active Calories</label>
            <input type="number" min={0} value={caloriesActive} onChange={(e) => setCaloriesActive(e.target.value)} placeholder="kcal" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Exercise Minutes</label>
            <input type="number" min={0} value={exerciseMinutes} onChange={(e) => setExerciseMinutes(e.target.value)} placeholder="min" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Stand Hours</label>
            <input type="number" min={0} value={standHours} onChange={(e) => setStandHours(e.target.value)} placeholder="hrs" className="kairos-input w-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!date || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Activity"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Health Goal (coach.metrics.createGoal) ─────────────────────

type GoalCategory = "glucose" | "sleep" | "weight" | "body_fat" | "activity" | "nutrition" | "supplements" | "fasting" | "labs" | "custom";
type GoalDirection = "increase" | "decrease" | "maintain" | "reach";
type GoalTimeframe = "weekly" | "monthly" | "quarterly" | "yearly" | "open_ended";

function GoalManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createGoal.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Target size={16} />}
      title="Add Goal"
      addLabel="Add Goal"
      description="Set a health goal for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <GoalModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function GoalModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    category: GoalCategory; title: string; description?: string;
    targetValue: number; targetUnit: string; targetDirection: GoalDirection;
    startValue: number; currentValue: number; timeframe: GoalTimeframe;
    startDate: string; targetDate?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("custom");
  const [targetDirection, setTargetDirection] = useState<GoalDirection>("decrease");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>("monthly");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [startValue, setStartValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const canSave =
    !!title.trim() && !!targetUnit.trim() && !!startDate &&
    targetValue.trim() !== "" && startValue.trim() !== "" && currentValue.trim() !== "";

  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: parseFloat(targetValue),
      targetUnit: targetUnit.trim(),
      targetDirection,
      startValue: parseFloat(startValue),
      currentValue: parseFloat(currentValue),
      timeframe,
      startDate,
      targetDate: targetDate.trim() || undefined,
    });
  };

  return (
    <Modal title="Add Goal" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lower fasting glucose" className="kairos-input w-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)} className="kairos-input w-full">
              <option value="glucose">Glucose</option>
              <option value="sleep">Sleep</option>
              <option value="weight">Weight</option>
              <option value="body_fat">Body Fat</option>
              <option value="activity">Activity</option>
              <option value="nutrition">Nutrition</option>
              <option value="supplements">Supplements</option>
              <option value="fasting">Fasting</option>
              <option value="labs">Labs</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Direction</label>
            <select value={targetDirection} onChange={(e) => setTargetDirection(e.target.value as GoalDirection)} className="kairos-input w-full">
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
              <option value="maintain">Maintain</option>
              <option value="reach">Reach</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as GoalTimeframe)} className="kairos-input w-full">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="open_ended">Open-ended</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Target Value *</label>
            <input type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 90" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Target Unit *</label>
            <input type="text" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} placeholder="e.g. mg/dL" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Start Value *</label>
            <input type="number" step="any" value={startValue} onChange={(e) => setStartValue(e.target.value)} placeholder="e.g. 110" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Current Value *</label>
            <input type="number" step="any" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="e.g. 105" className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Start Date *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Target Date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="kairos-input w-full" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context, plan, rationale..." className="kairos-input w-full h-16 resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!canSave || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Goal"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Fasting (coach.metrics.createFasting) ──────────────────────

function FastingManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createFasting.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<Timer size={16} />}
      title="Add Fasting Log"
      addLabel="Add Fast"
      description="Manually log a fasting window for this client."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <FastingModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function FastingModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { date: string; startedAt?: string; endedAt?: string; completed?: boolean }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [completed, setCompleted] = useState(false);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      startedAt: startedAt.trim() ? new Date(startedAt).toISOString() : undefined,
      endedAt: endedAt.trim() ? new Date(endedAt).toISOString() : undefined,
      completed,
    });
  };

  return (
    <Modal title="Add Fasting Log" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Started At</label>
            <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="kairos-input w-full" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Ended At</label>
            <input type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} className="kairos-input w-full" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} className="accent-kairos-gold" />
          Completed
        </label>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!date || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Fast"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Daily Check-in (coach.metrics.createCheckin — upsert) ──────

function CheckinManager({ clientId, canEdit, openSignal }: { clientId: string; canEdit: boolean; openSignal?: number }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (openSignal) { setShowModal(true); setErrorMsg(null); } }, [openSignal]);

  const createMutation = trpc.coach.metrics.createCheckin.useMutation({
    onSuccess: () => {
      utils.coach.clients.getClientHealthData.invalidate();
      utils.coach.clients.getDetail.invalidate();
      setShowModal(false); setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(e.message),
  });

  return (
    <MetricPanel
      icon={<ClipboardList size={16} />}
      title="Add Check-in"
      addLabel="Add Check-in"
      description="Log a daily check-in for this client. Existing entries for the same date are updated."
      canEdit={canEdit}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      onAdd={() => { setErrorMsg(null); setShowModal(true); }}
    >
      {showModal && (
        <CheckinModal
          saving={createMutation.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={(payload) => createMutation.mutate({ clientId, ...payload })}
        />
      )}
    </MetricPanel>
  );
}

function CheckinModal({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    date: string; weight?: number; sleepHours?: number; sleepQuality?: number; hrvScore?: number;
    readinessScore?: number; steps?: number; proteinG?: number; carbsG?: number; fatG?: number;
    fiberG?: number; totalCalories?: number; waterOz?: number; cardioMinutes?: number;
  }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [hrvScore, setHrvScore] = useState("");
  const [readinessScore, setReadinessScore] = useState("");
  const [steps, setSteps] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [totalCalories, setTotalCalories] = useState("");
  const [waterOz, setWaterOz] = useState("");

  const num = (v: string): number | undefined => (v.trim() ? parseFloat(v) : undefined);
  const int = (v: string): number | undefined => (v.trim() ? parseInt(v, 10) : undefined);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      weight: num(weight),
      sleepHours: num(sleepHours),
      sleepQuality: int(sleepQuality),
      hrvScore: num(hrvScore),
      readinessScore: int(readinessScore),
      steps: int(steps),
      cardioMinutes: int(cardioMinutes),
      proteinG: num(proteinG),
      carbsG: num(carbsG),
      fatG: num(fatG),
      fiberG: num(fiberG),
      totalCalories: num(totalCalories),
      waterOz: num(waterOz),
    });
  };

  return (
    <Modal title="Add Check-in" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="kairos-input w-full" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Vitals (optional)</label>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="any" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight" title="Weight (lbs)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="Sleep h" title="Sleep hours" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)} placeholder="Sleep Q" title="Sleep quality" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={hrvScore} onChange={(e) => setHrvScore(e.target.value)} placeholder="HRV" title="HRV score" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={readinessScore} onChange={(e) => setReadinessScore(e.target.value)} placeholder="Readiness" title="Readiness score" className="kairos-input w-full py-1 text-xs" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nutrition (optional)</label>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="any" min={0} value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="Protein g" title="Protein (g)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="Carbs g" title="Carbs (g)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="Fat g" title="Fat (g)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={fiberG} onChange={(e) => setFiberG(e.target.value)} placeholder="Fiber g" title="Fiber (g)" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={totalCalories} onChange={(e) => setTotalCalories(e.target.value)} placeholder="kcal" title="Total calories" className="kairos-input w-full py-1 text-xs" />
            <input type="number" step="any" min={0} value={waterOz} onChange={(e) => setWaterOz(e.target.value)} placeholder="Water oz" title="Water (oz)" className="kairos-input w-full py-1 text-xs" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">Activity (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Steps" title="Steps" className="kairos-input w-full py-1 text-xs" />
            <input type="number" min={0} value={cardioMinutes} onChange={(e) => setCardioMinutes(e.target.value)} placeholder="Cardio min" title="Cardio minutes" className="kairos-input w-full py-1 text-xs" />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="kairos-btn-outline flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={!date || saving} className="kairos-btn-gold flex-1 disabled:opacity-50">
          {saving ? "Saving..." : "Save Check-in"}
        </button>
      </div>
    </Modal>
  );
}
