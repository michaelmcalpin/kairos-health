"use client";

import { useState } from "react";
import type { Appointment, SessionNote } from "@/lib/scheduling/types";
import {
  getSessionTypeInfo,
  formatTimeDisplay,
  formatDateDisplay,
  MEETING_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/scheduling/types";

interface AppointmentDetailProps {
  appointment: Appointment;
  sessionNotes: SessionNote | null;
  role: "client" | "coach";
  onUpdateStatus?: (status: "completed" | "cancelled" | "no_show", reason?: string) => void;
  onSaveNotes?: (notes: {
    summary: string;
    keyFindings: string[];
    actionItems: string[];
    nextSessionFocus: string;
    privateNotes: string;
  }) => void;
  onClose: () => void;
}

export function AppointmentDetail({
  appointment,
  sessionNotes,
  role,
  onUpdateStatus,
  onSaveNotes,
  onClose,
}: AppointmentDetailProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [summary, setSummary] = useState(sessionNotes?.summary ?? "");
  const [keyFindings, setKeyFindings] = useState(sessionNotes?.keyFindings.join("\n") ?? "");
  const [actionItems, setActionItems] = useState(sessionNotes?.actionItems.join("\n") ?? "");
  const [nextFocus, setNextFocus] = useState(sessionNotes?.nextSessionFocus ?? "");
  const [privateNotes, setPrivateNotes] = useState(sessionNotes?.privateNotes ?? "");

  const info = getSessionTypeInfo(appointment.sessionType);
  const isUpcoming = appointment.status === "confirmed" || appointment.status === "pending";
  const canWriteNotes = role === "coach" && (appointment.status === "in_progress" || appointment.status === "completed");

  const handleSaveNotes = () => {
    if (!onSaveNotes) return;
    onSaveNotes({
      summary,
      keyFindings: keyFindings.split("\n").filter(Boolean),
      actionItems: actionItems.split("\n").filter(Boolean),
      nextSessionFocus: nextFocus,
      privateNotes,
    });
    setShowNotes(false);
  };

  return (
    <div className="kairos-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: info.color }}
          />
          <div>
            <h3 className="text-lg font-heading font-semibold text-white">{info.label}</h3>
            <p className="text-sm text-gray-400">
              {role === "client" ? `with ${appointment.coachName}` : `with ${appointment.clientName}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[appointment.status]}20`,
            color: STATUS_COLORS[appointment.status],
          }}
        >
          {STATUS_LABELS[appointment.status]}
        </span>
      </div>

      {/* Details grid */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Date</span>
          <span className="text-sm text-white">{formatDateDisplay(appointment.date)}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Time</span>
          <span className="text-sm text-white">
            {formatTimeDisplay(appointment.startTime)} — {formatTimeDisplay(appointment.endTime)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Duration</span>
          <span className="text-sm text-white">{info.durationMinutes} minutes</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Meeting Type</span>
          <span className="text-sm text-white">{MEETING_TYPE_LABELS[appointment.meetingType]}</span>
        </div>
        {appointment.meetingUrl && (
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Meeting Link</span>
            <span className="text-sm text-[#D4AF37] truncate max-w-[200px]">
              {appointment.meetingUrl}
            </span>
          </div>
        )}
        {appointment.notes && (
          <div className="py-2">
            <span className="text-sm text-gray-400">Notes</span>
            <p className="text-sm text-gray-300 mt-1">{appointment.notes}</p>
          </div>
        )}
        {appointment.cancellationReason && (
          <div className="py-2">
            <span className="text-sm text-red-400">Cancellation Reason</span>
            <p className="text-sm text-gray-300 mt-1">{appointment.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Session Notes (Coach only) */}
      {canWriteNotes && !showNotes && !sessionNotes && (
        <button
          onClick={() => setShowNotes(true)}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors mb-4"
        >
          + Add Session Notes
        </button>
      )}

      {sessionNotes && !showNotes && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">Session Notes</h4>
          <p className="text-sm text-gray-300 mb-2">{sessionNotes.summary}</p>
          {sessionNotes.keyFindings.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-400">Key Findings:</span>
              <ul className="mt-1 space-y-1">
                {sessionNotes.keyFindings.map((f, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                    <span className="text-[#D4AF37] mt-0.5">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sessionNotes.actionItems.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-400">Action Items:</span>
              <ul className="mt-1 space-y-1">
                {sessionNotes.actionItems.map((a, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">✓</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sessionNotes.nextSessionFocus && (
            <div>
              <span className="text-xs text-gray-400">Next Session Focus:</span>
              <p className="text-xs text-gray-300 mt-0.5">{sessionNotes.nextSessionFocus}</p>
            </div>
          )}
        </div>
      )}

      {showNotes && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">Session Notes</h4>
          <div>
            <label className="text-xs text-gray-400">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#D4AF37]/50"
              placeholder="Brief session summary..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Key Findings (one per line)</label>
            <textarea
              value={keyFindings}
              onChange={(e) => setKeyFindings(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#D4AF37]/50"
              placeholder="Notable observations..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Action Items (one per line)</label>
            <textarea
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#D4AF37]/50"
              placeholder="Follow-up actions..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Next Session Focus</label>
            <input
              value={nextFocus}
              onChange={(e) => setNextFocus(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
              placeholder="What to focus on next..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Private Notes (coach only)</label>
            <textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#D4AF37]/50"
              placeholder="Private observations..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNotes(false)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNotes}
              className="flex-1 kairos-btn-gold py-1.5 rounded-lg text-sm font-medium"
            >
              Save Notes
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {isUpcoming && onUpdateStatus && (
        <div className="flex gap-2">
          {role === "coach" && (
            <button
              onClick={() => onUpdateStatus("completed")}
              className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={() => onUpdateStatus("cancelled", "Cancelled by " + role)}
            className="flex-1 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            Cancel Appointment
          </button>
        </div>
      )}
    </div>
  );
}
