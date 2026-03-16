"use client";

import { useState } from "react";
import type { SessionType, MeetingType, TimeSlot } from "@/lib/scheduling/types";
import {
  SESSION_TYPES,
  MEETING_TYPE_LABELS,
  getSessionTypeInfo,
  formatTimeDisplay,
  formatDateDisplay,
} from "@/lib/scheduling/types";
import { getAvailableSlots } from "@/lib/scheduling/engine";

interface BookingFormProps {
  coachId: string;
  coachName: string;
  onBook: (booking: {
    sessionType: SessionType;
    meetingType: MeetingType;
    date: string;
    startTime: string;
    notes: string;
  }) => void;
  onCancel: () => void;
}

type Step = "session_type" | "date_time" | "details" | "confirm";

export function BookingForm({ coachId, coachName, onBook, onCancel }: BookingFormProps) {
  const [step, setStep] = useState<Step>("session_type");
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("video");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const sessionInfo = sessionType ? getSessionTypeInfo(sessionType) : null;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (sessionInfo) {
      const slots = getAvailableSlots(coachId, date, sessionInfo.durationMinutes);
      setAvailableSlots(slots);
    }
  };

  const handleConfirm = () => {
    if (!sessionType || !selectedSlot || !selectedDate) return;
    onBook({
      sessionType,
      meetingType,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      notes,
    });
  };

  // Generate next 14 days for date selection
  const dateDays: string[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dateDays.push(d.toISOString().split("T")[0]);
  }

  return (
    <div className="kairos-card p-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["session_type", "date_time", "details", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-[#D4AF37] text-[#122055]"
                  : i < ["session_type", "date_time", "details", "confirm"].indexOf(step)
                    ? "bg-[#D4AF37]/30 text-[#D4AF37]"
                    : "bg-gray-800 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Session Type */}
      {step === "session_type" && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-white mb-1">
            Choose Session Type
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Select the type of session you&apos;d like to book with {coachName}.
          </p>

          <div className="space-y-2">
            {SESSION_TYPES.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setSessionType(st.id);
                  setStep("date_time");
                }}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  sessionType === st.id
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{st.label}</span>
                      <span className="text-xs text-gray-400">{st.durationMinutes} min</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{st.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === "date_time" && sessionInfo && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-white mb-1">
            Select Date & Time
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {sessionInfo.label} — {sessionInfo.durationMinutes} minutes
          </p>

          {/* Date selector */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Date</label>
            <div className="grid grid-cols-7 gap-1">
              {dateDays.map((d) => {
                const dateObj = new Date(d + "T00:00:00");
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = dateObj.getDate();
                return (
                  <button
                    key={d}
                    onClick={() => handleDateChange(d)}
                    className={`p-2 rounded-lg text-center transition-colors ${
                      selectedDate === d
                        ? "bg-[#D4AF37] text-[#122055]"
                        : "hover:bg-gray-800 text-gray-300"
                    }`}
                  >
                    <div className="text-[10px]">{dayName}</div>
                    <div className="text-sm font-semibold">{dayNum}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Available Times</label>
              {availableSlots.filter((s) => s.available).length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No available slots on this date.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots
                    .filter((s) => s.available)
                    .map((slot) => (
                      <button
                        key={slot.startTime}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setStep("details");
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedSlot?.startTime === slot.startTime
                            ? "bg-[#D4AF37] text-[#122055] font-medium"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {formatTimeDisplay(slot.startTime)}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep("session_type")}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && sessionInfo && selectedSlot && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-white mb-1">
            Session Details
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {sessionInfo.label} on {formatDateDisplay(selectedDate)} at{" "}
            {formatTimeDisplay(selectedSlot.startTime)}
          </p>

          {/* Meeting type */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Meeting Type</label>
            <div className="flex gap-2">
              {(["video", "phone", "in_person"] as MeetingType[]).map((mt) => (
                <button
                  key={mt}
                  onClick={() => setMeetingType(mt)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    meetingType === mt
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]"
                      : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {MEETING_TYPE_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">
              Notes for your coach (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you'd like to discuss..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("date_time")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("confirm")}
              className="flex-1 kairos-btn-gold py-2 rounded-lg text-sm font-medium"
            >
              Review Booking
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === "confirm" && sessionInfo && selectedSlot && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-white mb-4">
            Confirm Your Booking
          </h3>

          <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Coach</span>
              <span className="text-sm text-white font-medium">{coachName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Session</span>
              <span className="text-sm text-white font-medium">{sessionInfo.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Date</span>
              <span className="text-sm text-white font-medium">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Time</span>
              <span className="text-sm text-white font-medium">
                {formatTimeDisplay(selectedSlot.startTime)} —{" "}
                {formatTimeDisplay(selectedSlot.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Duration</span>
              <span className="text-sm text-white font-medium">
                {sessionInfo.durationMinutes} minutes
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Meeting</span>
              <span className="text-sm text-white font-medium">
                {MEETING_TYPE_LABELS[meetingType]}
              </span>
            </div>
            {notes && (
              <div>
                <span className="text-sm text-gray-400">Notes</span>
                <p className="text-sm text-gray-300 mt-1">{notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("details")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 kairos-btn-gold py-2 rounded-lg text-sm font-medium"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
