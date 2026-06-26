"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MessageSquare, Settings, Calendar, Activity, TrendingUp,
  AlertCircle, Clock, Pin, Trash2, CheckCircle, Send, X, Video,
  Droplets, Moon, Heart, Scale, Dumbbell, Target, FlaskConical,
  Apple, Pill, Zap, ClipboardList, ChevronRight, Timer, Footprints,
  Dna, FileText,
} from "lucide-react";
import { useThemeColors } from "@/lib/theme";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  TIER_LABELS, TIER_BADGE_COLORS, STATUS_LABELS, STATUS_DOT_COLORS,
  STATUS_COLORS, ALERT_PRIORITY_COLORS, formatRelativeTime,
} from "@/lib/coach-clients/types";
import { trpc } from "@/lib/trpc";

// ─── Types ──────────────────────────────────────────────────────

type DataTab = "overview" | "glucose" | "sleep" | "hrv" | "bp" | "body" | "workouts" | "activity" | "fasting" | "goals" | "labs" | "nutrition" | "supplements" | "checkins" | "genetics" | "clinical";

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
  { id: "fasting", label: "Fasting", icon: Timer },
  { id: "supplements", label: "Supplements", icon: Pill },
  { id: "checkins", label: "Check-ins", icon: ClipboardList },
];

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

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const tc = useThemeColors();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const [activeTab, setActiveTab] = useState<DataTab>("overview");
  const [noteText, setNoteText] = useState("");
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [protocolNotes, setProtocolNotes] = useState("");
  const [protocolPriority, setProtocolPriority] = useState("Normal");
  const [protocolSaved, setProtocolSaved] = useState(false);

  // ── Schedule modal state ──────────────────────────────────────
  const [schedSessionType, setSchedSessionType] = useState<"initial_consultation" | "follow_up" | "protocol_review" | "lab_review" | "goal_setting" | "ad_hoc">("follow_up");
  const [schedMeetingType, setSchedMeetingType] = useState<"video" | "phone" | "in_person">("video");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedNotes, setSchedNotes] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

  // Close tier dropdown on outside click
  useEffect(() => {
    if (!showTierDropdown) return;
    const handler = () => setShowTierDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showTierDropdown]);

  // ── tRPC queries ──────────────────────────────────────────────
  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId: params.id },
    { staleTime: 15_000, refetchOnWindowFocus: false }
  );
  const client = detailQuery.data;

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
  const updateProtocolMutation = trpc.coach.clients.updateProtocol.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setProtocolSaved(true);
      setTimeout(() => { setShowProtocolModal(false); setProtocolNotes(""); setProtocolPriority("Normal"); setProtocolSaved(false); }, 1500);
    },
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
        <ArrowLeft size={14} /> Back to clients
      </Link>

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
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[client.status]}`} />
                  <span className={STATUS_COLORS[client.status]}>{STATUS_LABELS[client.status]}</span>
                </div>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">{client.email}</span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">Since {client.memberSince}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-heading font-bold text-kairos-gold">{client.healthScore}</p>
            <p className={`text-sm font-medium ${trendColor}`}>{trendIcon} Health Score</p>
          </div>
        </div>

        {/* Action buttons inline in header */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800 flex-wrap">
          <button onClick={handleMessageClient} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors">
            <MessageSquare size={14} /> Message
          </button>
          <button onClick={handleScheduleSession} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
            <Video size={14} /> Schedule Session
          </button>
          <button onClick={() => setShowProtocolModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors">
            <Settings size={14} /> Adjust Protocol
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowRemoveConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/5 text-red-400/70 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
            <X size={14} /> Remove
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Adherence", value: `${client.metrics.adherence}%`, color: "text-kairos-gold" },
          { label: "Avg Glucose", value: client.metrics.avgGlucose ? `${client.metrics.avgGlucose}` : "—", unit: "mg/dL" },
          { label: "Sleep Score", value: client.metrics.sleepScore?.toString() ?? "—" },
          { label: "HRV", value: client.metrics.hrv?.toString() ?? "—", unit: "ms" },
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
          {healthQuery.isLoading ? (
            <div className="kairos-card h-64 animate-pulse bg-gray-800/50 flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading health data...</p>
            </div>
          ) : (
            <TabContent tab={activeTab} client={client as unknown as ClientDetail} health={health as unknown as HealthData | undefined} tc={tc} />
          )}
        </div>

        {/* Right Sidebar: Alerts, Notes, Upcoming */}
        <div className="space-y-6">
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

      {/* Protocol Adjustment Modal */}
      {showProtocolModal && (
        <Modal title="Adjust Protocol" onClose={() => setShowProtocolModal(false)}>
          <p className="text-sm text-gray-400 mb-4">Protocol changes for <span className="text-white font-semibold">{client.name}</span></p>
          {protocolSaved && <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3"><p className="text-sm text-green-400">Saved!</p></div>}
          <textarea value={protocolNotes} onChange={(e) => setProtocolNotes(e.target.value)} placeholder="Describe changes..." className="kairos-input w-full h-28 resize-none mb-3" />
          <select value={protocolPriority} onChange={(e) => setProtocolPriority(e.target.value)} className="kairos-input w-full mb-4">
            <option>Normal</option>
            <option>High — Review within 24h</option>
            <option>Urgent — Immediate attention</option>
          </select>
          <div className="flex gap-3">
            <button onClick={() => setShowProtocolModal(false)} className="kairos-btn-outline flex-1">Cancel</button>
            <button
              onClick={() => updateProtocolMutation.mutate({ clientId: params.id, notes: protocolNotes.trim(), priority: protocolPriority as "Normal" | "High — Review within 24h" | "Urgent — Immediate attention" })}
              disabled={!protocolNotes.trim() || updateProtocolMutation.isPending}
              className="kairos-btn-gold flex-1 disabled:opacity-50"
            >
              {updateProtocolMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

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

// ─── Tab Content Types ─────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type ClientDetail = {
  id: string; name: string; initials: string; email: string; tier: string;
  healthScore: number; scoreTrend: string; activeAlerts: number; adherence: number;
  lastActive: string; status: string; nextSession: string | null; memberSince: string;
  metrics: {
    avgGlucose: number | null; glucoseTrend: string; glucoseData: number[];
    sleepScore: number | null; sleepTrend: string; sleepData: number[];
    hrv: number | null; hrvTrend: string; weight: number | null; weightData: number[];
    bodyFat: number | null; adherence: number; checkInStreak: number;
  };
  protocol: {
    id: string; name: string; startDate: string; duration: string;
    progress: number; goals: string[]; status: string;
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
  clinicalDocs?: Array<{ id: string; docType: string; title: string; providerName: string | null; reportDate: Date | null; status: string; parsedData: Record<string, unknown> | null; createdAt: string }>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    case "overview":
      return (
        <div className="space-y-6">
          {/* Protocol */}
          <div className="kairos-card">
            <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> Current Protocol
            </h2>
            <h3 className="font-heading font-semibold text-white mb-2">{client.protocol.name}</h3>
            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Start</p>
                <p className="text-gray-300">{client.protocol.startDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Duration</p>
                <p className="text-gray-300">{client.protocol.duration}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Progress</p>
                <p className="text-kairos-gold font-bold">{client.protocol.progress}%</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: tc.accent, width: `${client.protocol.progress}%` }} />
            </div>
          </div>

          {/* Biometric Sparklines */}
          <div className="kairos-card">
            <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
              <Activity size={16} /> Biometrics
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-1">Glucose</p>
                <SparkLine data={client.metrics.glucoseData} maxVal={140} color={tc.accent} />
                <p className="text-[10px] text-gray-500 text-center">Avg: {client.metrics.avgGlucose ?? "—"} mg/dL</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-1">Sleep</p>
                <SparkLine data={client.metrics.sleepData} maxVal={10} color="rgb(96, 165, 250)" />
                <p className="text-[10px] text-gray-500 text-center">
                  Avg: {client.metrics.sleepData.length > 0 ? (client.metrics.sleepData.reduce((a, b) => a + b, 0) / client.metrics.sleepData.length).toFixed(1) : "—"} hrs
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-1">Weight</p>
                <SparkLine data={client.metrics.weightData} maxVal={Math.max(...(client.metrics.weightData.length > 0 ? client.metrics.weightData : [0])) + 10} color="rgb(167, 139, 250)" />
                <p className="text-[10px] text-gray-500 text-center">Current: {client.metrics.weight ?? "—"} lbs</p>
              </div>
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
                      <p className="text-[10px] text-gray-500 mt-1">{g.currentValue} / {g.targetValue} {g.targetUnit}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );

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
              return [d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), g.value, g.source];
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
              s.score,
              s.deepMinutes ? `${(s.deepMinutes / 60).toFixed(1)}h` : "—",
              s.remMinutes ? `${(s.remMinutes / 60).toFixed(1)}h` : "—",
              s.lightMinutes ? `${(s.lightMinutes / 60).toFixed(1)}h` : "—",
              s.awakeMinutes ? `${s.awakeMinutes}m` : "—",
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
              return [d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), h.rmssd, h.source];
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
            rows={health.bloodPressure.map((bp) => [bp.date, bp.systolic, bp.diastolic, bp.pulse, bp.notes])}
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
            rows={health.bodyMeasurements.map((m) => [m.date, m.weightLbs, m.bodyFatPct, m.waistInches])}
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
                  a.caloriesActive,
                  a.exerciseMinutes != null ? `${a.exerciseMinutes} min` : null,
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
                    <p className="text-[10px] text-gray-500 mb-2">{g.category || "General"} &bull; {g.targetDirection || "reach"} to {g.targetValue} {g.targetUnit}</p>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-kairos-gold rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500">{g.currentValue} / {g.targetValue} {g.targetUnit} ({progress}%)</p>
                    {g.milestones.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {g.milestones.map((m, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${m.reached ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"}`}>
                            {m.label}: {m.targetValue}
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
                      rows={lab.biomarkers.map((b) => [b.code, b.value, b.unit, b.refLow, b.refHigh, b.status])}
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

    case "supplements":
      return (
        <div className="kairos-card">
          <h2 className="text-base font-heading font-bold text-kairos-gold mb-3 flex items-center gap-2">
            <Pill size={16} /> Supplement Protocol ({health.supplements.length} items)
          </h2>
          {health.supplements.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No active protocol</p>
          ) : (
            <DataTable
              headers={["Name", "Dosage", "Frequency", "Time", "Notes"]}
              rows={health.supplements.map((s) => [s.name, s.dosage, s.frequency, s.timeOfDay, s.notes])}
            />
          )}
        </div>
      );

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

          {!health.genetics?.profile && !health.genetics?.markers?.length && (
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
                                  .filter(([, v]) => v != null && typeof v !== "object")
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Medical Records */}
              {(() => {
                const medDocs = health.clinicalDocs.filter((d) => d.docType === "medical_record");
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
