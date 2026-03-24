"use client";

import { useState, useCallback } from "react";
import type { Appointment } from "@/lib/scheduling/types";
import {
  getSessionTypeInfo,
  formatTimeDisplay,
  formatDateDisplay,
  STATUS_LABELS,
  STATUS_COLORS,
  MEETING_TYPE_LABELS,
} from "@/lib/scheduling/types";
import {
  createAppointment,
  getClientAppointments,
  updateAppointmentStatus,
  getSessionNotes,
} from "@/lib/scheduling/engine";
import { BookingForm } from "@/components/scheduling/BookingForm";
import { AppointmentDetail } from "@/components/scheduling/AppointmentDetail";

// Seed demo data
function seedClientAppointments(clientId: string) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);

  try {
    createAppointment({
      coachId: "coach-1",
      clientId,
      clientName: "You",
      coachName: "Dr. Sarah Mitchell",
      sessionType: "follow_up",
      meetingType: "video",
      date: tomorrow.toISOString().split("T")[0],
      startTime: "10:00",
      notes: "Discuss glucose trends from the past week.",
    });

    createAppointment({
      coachId: "coach-1",
      clientId,
      clientName: "You",
      coachName: "Dr. Sarah Mitchell",
      sessionType: "lab_review",
      meetingType: "video",
      date: nextWeek.toISOString().split("T")[0],
      startTime: "14:00",
      notes: "Review latest blood panel results.",
    });
  } catch {
    // Ignore duplicate seeds
  }
}

export default function AppointmentsPage() {
  const clientId = "demo-client";
  const [view, setView] = useState<"list" | "book" | "detail">("list");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);

  if (!seeded) {
    seedClientAppointments(clientId);
    setSeeded(true);
  }

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const appointments = getClientAppointments(clientId, filter);

  const handleBook = (booking: {
    sessionType: string;
    meetingType: "video" | "phone" | "in_person";
    date: string;
    startTime: string;
    notes: string;
  }) => {
    createAppointment({
      coachId: "coach-1",
      clientId,
      clientName: "You",
      coachName: "Dr. Sarah Mitchell",
      sessionType: booking.sessionType as "follow_up",
      meetingType: booking.meetingType,
      date: booking.date,
      startTime: booking.startTime,
      notes: booking.notes,
    });
    setView("list");
    refresh();
  };

  return (
    <div className="max-w-4xl mx-auto" key={refreshKey}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Appointments</h1>
          <p className="text-gray-400 mt-1">
            Schedule and manage sessions with your health trainer.
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("book")}
            className="kairos-btn-gold px-4 py-2 rounded-lg text-sm font-medium"
          >
            Book Session
          </button>
        )}
      </div>

      {view === "book" && (
        <BookingForm
          coachId="coach-1"
          coachName="Dr. Sarah Mitchell"
          onBook={handleBook}
          onCancel={() => setView("list")}
        />
      )}

      {view === "detail" && selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          sessionNotes={getSessionNotes(selectedAppointment.id)}
          role="client"
          onUpdateStatus={(status, reason) => {
            updateAppointmentStatus(selectedAppointment.id, status, reason);
            setView("list");
            refresh();
          }}
          onClose={() => {
            setView("list");
            setSelectedAppointment(null);
          }}
        />
      )}

      {view === "list" && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  filter === f
                    ? "bg-kairos-gold/20 text-kairos-gold"
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Appointment list */}
          {appointments.length === 0 ? (
            <div className="kairos-card p-8 text-center">
              <p className="text-gray-500 mb-4">
                {filter === "upcoming"
                  ? "No upcoming appointments."
                  : "No appointments found."}
              </p>
              <button
                onClick={() => setView("book")}
                className="kairos-btn-gold px-6 py-2 rounded-lg text-sm font-medium"
              >
                Book Your First Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const info = getSessionTypeInfo(appt.sessionType);
                return (
                  <button
                    key={appt.id}
                    onClick={() => {
                      setSelectedAppointment(appt);
                      setView("detail");
                    }}
                    className="w-full kairos-card p-4 text-left hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{info.label}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px]"
                            style={{
                              backgroundColor: `${STATUS_COLORS[appt.status]}20`,
                              color: STATUS_COLORS[appt.status],
                            }}
                          >
                            {STATUS_LABELS[appt.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          with {appt.coachName} — {MEETING_TYPE_LABELS[appt.meetingType]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{formatDateDisplay(appt.date)}</p>
                        <p className="text-xs text-gray-400">
                          {formatTimeDisplay(appt.startTime)} — {formatTimeDisplay(appt.endTime)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
