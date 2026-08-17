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
  Plus, Pencil, Archive, Syringe,
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
  { id: "fasting", label: "Fasting", icon: Timer },
  { id: "supplements", label: "Protocol", icon: Pill },
  { id: "checkins", label: "Check-ins", icon: ClipboardList },
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
  const [protocolError, setProtocolError] = useState<string | null>(null);

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
  const updateProtocolMutation = trpc.coach.clients.updateProtocol.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setProtocolError(null);
      setProtocolSaved(true);
      setTimeout(() => { setShowProtocolModal(false); setProtocolNotes(""); setProtocolPriority("Normal"); setProtocolSaved(false); }, 1500);
    },
    onError: (err) => {
      setProtocolError(err.message || "Failed to save protocol adjustment note.");
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
          <button onClick={() => { setProtocolError(null); setShowProtocolModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors">
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
            <ProtocolEditor
              clientId={params.id}
              canEdit={!isSharedOnly || myAccess?.diet === "write"}
            />
          ) : healthQuery.isLoading ? (
            <div className="kairos-card h-64 animate-pulse bg-gray-800/50 flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading health data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Coach write panels (Add / Upload / Create) shown above the read-only data. */}
              {activeTab === "workouts" && (
                <TrainingProgramManager clientId={params.id} canEdit={canEditCategory("exercise")} />
              )}
              {activeTab === "nutrition" && (
                <MealPlanManager clientId={params.id} canEdit={canEditCategory("diet")} />
              )}
              {activeTab === "sleep" && (
                <SleepEntryManager clientId={params.id} canEdit={canEditCategory("healthData")} />
              )}
              {activeTab === "labs" && (
                <LabResultManager clientId={params.id} canEdit={canEditCategory("labs")} />
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
          <p className="text-sm text-gray-400 mb-2">
            Send an adjustment <span className="text-white font-semibold">note</span> about{" "}
            <span className="text-white font-semibold">{client.name}</span>&apos;s protocol. This does not change protocol items directly.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            To add, edit, or remove protocol items, use the{" "}
            <button
              onClick={() => { setShowProtocolModal(false); setActiveTab("supplements"); }}
              className="text-kairos-gold hover:underline"
            >
              Protocol tab
            </button>.
          </p>
          {protocolSaved && <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3"><p className="text-sm text-green-400">Saved!</p></div>}
          {protocolError && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3"><p className="text-sm text-red-400">{protocolError}</p></div>}
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
  clinicalDocs?: Array<{ id: string; docType: string; title: string; providerName: string | null; reportDate: Date | null; status: string; parsedData: Record<string, unknown> | null; sourceFileName?: string | null; createdAt: string }>;
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
                            <DocFileLink parsedData={pd} sourceFileName={doc.sourceFileName} />
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
                            <DocFileLink parsedData={pd} sourceFileName={doc.sourceFileName} />
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
                            <DocFileLink parsedData={pd} sourceFileName={doc.sourceFileName} />
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

/** Renders an "Open file" link for an uploaded clinical/lab/genetics document. */
function DocFileLink({
  parsedData,
  sourceFileName,
}: {
  parsedData: Record<string, unknown> | null | undefined;
  sourceFileName?: string | null;
}) {
  const raw = parsedData?.fileUrl ?? parsedData?.url;
  const url = typeof raw === "string" ? raw : null;
  // Only link to real, fetchable URLs (http/https or inline data URLs).
  const openable = !!url && (url.startsWith("http") || url.startsWith("data:"));
  if (!url) return null;
  const label = sourceFileName || "Uploaded file";
  if (!openable) {
    return (
      <p className="text-[10px] text-yellow-500/80 mt-1.5 flex items-center gap-1">
        <FileText size={10} /> {label} — file not available
      </p>
    );
  }
  return (
    <a
      href={url}
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

type ExerciseDraft = { name: string; sets: string; reps: string; restSeconds: string };
type SessionDraft = { name: string; exercises: ExerciseDraft[] };

function TrainingProgramManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
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
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Create / Assign Program
          </button>
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
    sessions?: Array<{ dayNumber: number; name?: string; exercises: Array<{ name: string; sets: number; reps: string; restSeconds?: number }> }>;
    activate?: boolean;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { name: "", exercises: [{ name: "", sets: "3", reps: "10", restSeconds: "" }] },
  ]);

  const addSession = () => setSessions((s) => [...s, { name: "", exercises: [{ name: "", sets: "3", reps: "10", restSeconds: "" }] }]);
  const removeSession = (i: number) => setSessions((s) => s.filter((_, idx) => idx !== i));
  const updateSession = (i: number, key: keyof SessionDraft, value: string) =>
    setSessions((s) => s.map((sess, idx) => (idx === i ? { ...sess, [key]: value } : sess)));
  const addExercise = (si: number) =>
    setSessions((s) => s.map((sess, idx) => (idx === si ? { ...sess, exercises: [...sess.exercises, { name: "", sets: "3", reps: "10", restSeconds: "" }] } : sess)));
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
            sets: Number(ex.sets) || 0,
            reps: ex.reps.trim() || "0",
            restSeconds: ex.restSeconds.trim() ? Number(ex.restSeconds) : undefined,
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
                    <div key={ei} className="flex items-center gap-1.5">
                      <input type="text" value={ex.name} onChange={(e) => updateExercise(si, ei, "name", e.target.value)} placeholder="Exercise" className="kairos-input flex-1 py-1 text-xs" />
                      <input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(si, ei, "sets", e.target.value)} placeholder="Sets" title="Sets" className="kairos-input w-14 py-1 text-xs" />
                      <input type="text" value={ex.reps} onChange={(e) => updateExercise(si, ei, "reps", e.target.value)} placeholder="Reps" title="Reps" className="kairos-input w-16 py-1 text-xs" />
                      {sess.exercises.length > 1 && (
                        <button onClick={() => removeExercise(si, ei)} className="p-1 text-gray-500 hover:text-red-400"><X size={12} /></button>
                      )}
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

// ─── Meal Plans (coach.plans) ───────────────────────────────────

function MealPlanManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listQuery = trpc.coach.plans.listMealPlans.useQuery(
    { clientId },
    { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
  );
  const invalidate = () => utils.coach.plans.listMealPlans.invalidate({ clientId });

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
          <button
            onClick={() => { setErrorMsg(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
          >
            <Plus size={12} /> Create / Assign Meal Plan
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
          <Lock size={10} /> Read-only — you don&apos;t have Diet edit access for this client.
        </p>
      )}

      <PanelError message={errorMsg} onClose={() => setErrorMsg(null)} />

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

function SleepEntryManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

function LabResultManager({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  uploadCategory: "clinical" | "document";
  lockedDocType?: ClinicalDocType;
  defaultTitle?: string;
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
    let parsedData: Record<string, unknown> | null = null;
    if (file) {
      try {
        setUploading(true);
        const { url, fileName } = await uploadCoachFile(file, uploadCategory);
        sourceFileName = fileName;
        parsedData = { fileUrl: url };
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
