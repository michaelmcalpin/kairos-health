"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Settings,
  Calendar,
  Activity,
  TrendingUp,
  AlertCircle,
  Clock,
  Pin,
  Trash2,
  CheckCircle,
  Send,
  X,
} from "lucide-react";
import { useThemeColors } from "@/lib/theme";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  STATUS_LABELS,
  STATUS_DOT_COLORS,
  STATUS_COLORS,
  ALERT_PRIORITY_COLORS,
  formatRelativeTime,
} from "@/lib/coach-clients/types";
import { trpc } from "@/lib/trpc";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const tc = useThemeColors();
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [noteText, setNoteText] = useState("");
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [protocolNotes, setProtocolNotes] = useState("");
  const [protocolPriority, setProtocolPriority] = useState("Normal");
  const [protocolSaved, setProtocolSaved] = useState(false);

  // ── tRPC queries — real DB data ──────────────────────────────
  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId: params.id },
    { staleTime: 15_000, refetchOnWindowFocus: false }
  );
  const client = detailQuery.data;
  const isLoading = detailQuery.isLoading;

  const notesQuery = trpc.coach.clients.getNotes.useQuery(
    { clientId: params.id },
    { staleTime: 10_000, refetchOnWindowFocus: false }
  );
  const notes = notesQuery.data ?? [];

  // ── tRPC mutations ───────────────────────────────────────────
  const resolveAlertMutation = trpc.coach.clients.resolveAlert.useMutation({
    onSuccess: () => {
      detailQuery.refetch();
    },
  });

  const addNoteMutation = trpc.coach.clients.addNote.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setNoteText("");
    },
  });

  const pinNoteMutation = trpc.coach.clients.pinNote.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
    },
  });

  const deleteNoteMutation = trpc.coach.clients.deleteNote.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
    },
  });

  const updateProtocolMutation = trpc.coach.clients.updateProtocol.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setProtocolSaved(true);
      setTimeout(() => {
        setShowProtocolModal(false);
        setProtocolNotes("");
        setProtocolPriority("Normal");
        setProtocolSaved(false);
      }, 1500);
    },
  });

  // Loading skeleton
  if (isLoading) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="kairos-card h-48 animate-pulse bg-gray-800/50" />
            <div className="kairos-card h-32 animate-pulse bg-gray-800/50" />
          </div>
          <div className="space-y-6">
            <div className="kairos-card h-40 animate-pulse bg-gray-800/50" />
            <div className="kairos-card h-40 animate-pulse bg-gray-800/50" />
          </div>
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

  function handleResolveAlert(alertId: string) {
    resolveAlertMutation.mutate({ clientId: params.id, alertId });
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    addNoteMutation.mutate({ clientId: params.id, content: noteText.trim() });
  }

  function handlePinNote(noteId: string) {
    pinNoteMutation.mutate({ clientId: params.id, noteId });
  }

  function handleDeleteNote(noteId: string) {
    deleteNoteMutation.mutate({ clientId: params.id, noteId });
  }

  // SVG chart helper
  function renderSparkLine(data: number[], maxVal: number, color: string) {
    if (data.length < 2) return null;
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${60 - (val / maxVal) * 50}`).join(" ");
    return (
      <svg viewBox="0 0 100 60" className="w-full h-24">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="0" cy={60 - (data[0] / maxVal) * 50} r="1.5" fill={color} />
        <circle cx="100" cy={60 - (data[data.length - 1] / maxVal) * 50} r="1.5" fill={color} />
      </svg>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/trainer/clients" className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      {/* Client Header */}
      <div className="kairos-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-kairos-gold/20 flex items-center justify-center text-kairos-gold font-heading font-bold text-xl">
              {client.initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-heading font-bold text-white">{client.name}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${TIER_BADGE_COLORS[client.tier]}`}>
                  {TIER_LABELS[client.tier]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[client.status]}`} />
                  <span className={STATUS_COLORS[client.status]}>{STATUS_LABELS[client.status]}</span>
                </div>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">{client.email}</span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-500">Member since {client.memberSince}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-heading font-bold text-kairos-gold">{client.healthScore}</p>
            <p className={`text-sm font-medium ${trendColor}`}>{trendIcon} Health Score</p>
            <p className="text-xs text-gray-500 mt-1">Last active: {client.lastActive}</p>
          </div>
        </div>
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Adherence</p>
          <p className="text-xl font-heading font-bold text-kairos-gold">{client.metrics.adherence}%</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Glucose</p>
          <p className="text-xl font-heading font-bold text-white">
            {client.metrics.avgGlucose ?? "—"}<span className="text-xs text-gray-500 ml-1">mg/dL</span>
          </p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Sleep Score</p>
          <p className="text-xl font-heading font-bold text-white">{client.metrics.sleepScore ?? "—"}</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">HRV</p>
          <p className="text-xl font-heading font-bold text-white">
            {client.metrics.hrv ?? "—"}<span className="text-xs text-gray-500 ml-1">ms</span>
          </p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Check-in Streak</p>
          <p className="text-xl font-heading font-bold text-white">
            {client.metrics.checkInStreak}<span className="text-xs text-gray-500 ml-1">days</span>
          </p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Active Alerts</p>
          <p className={`text-xl font-heading font-bold ${unresolvedAlerts.length > 0 ? "text-orange-400" : "text-green-400"}`}>
            {unresolvedAlerts.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Protocol & Biometrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Protocol */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-4 flex items-center gap-2">
              <TrendingUp size={18} /> Current Protocol
            </h2>
            <h3 className="font-heading font-semibold text-white mb-2">{client.protocol.name}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Start Date</p>
                <p className="text-gray-300">{client.protocol.startDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Duration</p>
                <p className="text-gray-300">{client.protocol.duration}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Status</p>
                <p className="text-gray-300 capitalize">{client.protocol.status}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-sm font-heading font-bold text-kairos-gold">{client.protocol.progress}%</span>
              </div>
              <div
                className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={client.protocol.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Protocol progress: ${client.protocol.progress}% complete`}
              >
                <div className="h-full rounded-full transition-all" style={{ backgroundColor: tc.accent, width: `${client.protocol.progress}%` }} />
              </div>
            </div>

            {/* Goals */}
            {client.protocol.goals.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase mb-2">Goals</p>
                <ul className="space-y-1.5">
                  {client.protocol.goals.map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-kairos-gold mt-0.5">&bull;</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Biometric Charts */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-4 flex items-center gap-2">
              <Activity size={18} /> Recent Biometrics
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {/* Glucose */}
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-2">Glucose (7d)</p>
                {renderSparkLine(client.metrics.glucoseData, 140, tc.accent)}
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Avg: {client.metrics.avgGlucose ?? "—"} mg/dL
                </p>
              </div>
              {/* Sleep */}
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-2">Sleep (7d)</p>
                {renderSparkLine(client.metrics.sleepData, 10, "rgb(96, 165, 250)")}
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Avg: {client.metrics.sleepData.length > 0
                    ? (client.metrics.sleepData.reduce((a, b) => a + b, 0) / client.metrics.sleepData.length).toFixed(1)
                    : "—"} hrs
                </p>
              </div>
              {/* Weight */}
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-2">Weight (4w)</p>
                {renderSparkLine(client.metrics.weightData, Math.max(...(client.metrics.weightData.length > 0 ? client.metrics.weightData : [0])) + 10, "rgb(167, 139, 250)")}
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Current: {client.metrics.weight ?? "—"} lbs
                </p>
              </div>
            </div>
          </div>

          {/* Trainer Notes */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-4">Trainer Notes</h2>

            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add a note about this client..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 text-kairos-gold border border-kairos-gold/30 bg-kairos-gold/10 hover:bg-kairos-gold/20"
                aria-label="Send note"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notes yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className={`p-3 rounded-xl border ${note.pinned ? "border-gray-700" : "border-gray-700 bg-gray-800/50"}`} style={note.pinned ? { borderColor: tc.accent + "30", backgroundColor: tc.accent + "05" } : {}}>
                    <p className="text-sm text-gray-300">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-500">{formatRelativeTime(note.createdAt)}</p>
                      <div className="flex gap-1">
                        <button onClick={() => handlePinNote(note.id)} className="p-1 text-gray-500 hover:text-kairos-gold transition-colors" aria-label={note.pinned ? "Unpin note" : "Pin note"}>
                          <Pin size={12} className={note.pinned ? "text-kairos-gold" : ""} />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors" aria-label="Delete note">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Alerts & Activity */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-4 flex items-center gap-2">
              <AlertCircle size={18} /> Alerts ({unresolvedAlerts.length})
            </h2>
            {unresolvedAlerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {unresolvedAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-xl border-l-4 ${ALERT_PRIORITY_COLORS[alert.priority]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-gray-500 uppercase">{alert.category}</span>
                          <span className="text-[10px] text-gray-600">&bull;</span>
                          <span className="text-[10px] text-gray-500">{alert.priority}</span>
                        </div>
                        <p className="text-sm text-gray-300">{alert.message}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{formatRelativeTime(alert.timestamp)}</p>
                      </div>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        disabled={resolveAlertMutation.isPending}
                        className="p-1.5 text-gray-500 hover:text-green-400 transition-colors shrink-0"
                        title="Resolve"
                        aria-label="Resolve alert"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-4 flex items-center gap-2">
              <Clock size={18} /> Recent Activity
            </h2>
            {client.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {client.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3 pb-2 border-b border-gray-800 last:border-b-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-kairos-gold text-[10px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: tc.accent + "10" }}>
                      {activity.type === "check-in" ? "✓" :
                       activity.type === "alert" ? "⚠" : "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300">{activity.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatRelativeTime(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client Info */}
          <div className="kairos-card">
            <h2 className="text-lg font-heading font-bold text-kairos-gold mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Body Fat</span>
                <span className="text-gray-300">{client.metrics.bodyFat ?? "—"}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">HRV Trend</span>
                <span className="text-gray-300">{client.metrics.hrvTrend === "up" ? "↑ Improving" : client.metrics.hrvTrend === "down" ? "↓ Declining" : "→ Stable"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Glucose Trend</span>
                <span className="text-gray-300">{client.metrics.glucoseTrend === "up" ? "↑ Improving" : client.metrics.glucoseTrend === "down" ? "↓ Declining" : "→ Stable"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sleep Trend</span>
                <span className="text-gray-300">{client.metrics.sleepTrend === "up" ? "↑ Improving" : client.metrics.sleepTrend === "down" ? "↓ Declining" : "→ Stable"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => router.push("/trainer/messages")} className="kairos-card hover:border-kairos-gold/30 transition-all flex items-center justify-center gap-2 py-3">
          <MessageSquare size={16} className="text-kairos-gold" />
          <span className="text-sm font-medium text-white">Send Message</span>
        </button>
        <button onClick={() => setShowProtocolModal(true)} className="kairos-card hover:border-kairos-gold/30 transition-all flex items-center justify-center gap-2 py-3">
          <Settings size={16} className="text-kairos-gold" />
          <span className="text-sm font-medium text-white">Adjust Protocol</span>
        </button>
        <button onClick={() => router.push("/trainer/schedule")} className="kairos-card hover:border-kairos-gold/30 transition-all flex items-center justify-center gap-2 py-3">
          <Calendar size={16} className="text-kairos-gold" />
          <span className="text-sm font-medium text-white">Schedule Session</span>
        </button>
        <button onClick={() => setShowHistory(!showHistory)} className="kairos-card hover:border-kairos-gold/30 transition-all flex items-center justify-center gap-2 py-3">
          <Activity size={16} className="text-kairos-gold" />
          <span className="text-sm font-medium text-white">{showHistory ? "Hide History" : "View Full History"}</span>
        </button>
      </div>

      {/* Protocol Adjustment Modal */}
      {showProtocolModal && (
        <ProtocolModal
          clientName={client?.name || "Client"}
          protocolNotes={protocolNotes}
          setProtocolNotes={setProtocolNotes}
          protocolPriority={protocolPriority}
          setProtocolPriority={setProtocolPriority}
          protocolSaved={protocolSaved}
          onClose={() => setShowProtocolModal(false)}
          onSave={() => {
            updateProtocolMutation.mutate({
              clientId: params.id,
              notes: protocolNotes.trim(),
              priority: protocolPriority as "Normal" | "High — Review within 24h" | "Urgent — Immediate attention",
            });
          }}
          isSaving={updateProtocolMutation.isPending}
        />
      )}

      {/* Full History Panel */}
      {showHistory && (
        <div className="kairos-card mt-4">
          <h3 className="font-heading font-bold text-white mb-4">Activity History</h3>
          {client.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {client.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b border-kairos-border/50 last:border-0">
                  <span className="text-xs text-kairos-silver-dark font-heading w-14 flex-shrink-0">
                    {new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div>
                    <p className="text-sm text-white font-medium">{item.label}</p>
                    <p className="text-xs text-kairos-silver-dark">{item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No activity history available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProtocolModal({
  clientName,
  protocolNotes,
  setProtocolNotes,
  protocolPriority,
  setProtocolPriority,
  protocolSaved,
  onClose,
  onSave,
  isSaving,
}: {
  clientName: string;
  protocolNotes: string;
  setProtocolNotes: (value: string) => void;
  protocolPriority: string;
  setProtocolPriority: (value: string) => void;
  protocolSaved: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between p-6 border-b border-kairos-border">
          <h2 className="font-heading font-bold text-lg text-white">Adjust Protocol</h2>
          <button onClick={onClose} className="text-kairos-silver-dark hover:text-white" aria-label="Close modal"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-kairos-silver-dark">Adjust the training and supplement protocol for <span className="text-white font-semibold">{clientName}</span>.</p>
          {protocolSaved && (
            <div className="p-3 rounded-kairos-sm bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 font-medium">Protocol changes saved successfully.</p>
            </div>
          )}
          <div>
            <label className="kairos-label mb-1 block">Protocol Notes</label>
            <textarea value={protocolNotes} onChange={(e) => setProtocolNotes(e.target.value)} placeholder="Describe the protocol changes..." className="kairos-input w-full h-28 resize-none" />
          </div>
          <div>
            <label className="kairos-label mb-1 block">Priority</label>
            <select value={protocolPriority} onChange={(e) => setProtocolPriority(e.target.value)} className="kairos-input w-full">
              <option>Normal</option>
              <option>High — Review within 24h</option>
              <option>Urgent — Immediate attention</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-kairos-border">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="kairos-btn-outline flex-1 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!protocolNotes.trim() || isSaving}
            className="kairos-btn-gold flex-1 disabled:opacity-50 relative"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
