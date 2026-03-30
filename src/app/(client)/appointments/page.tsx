"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { BookingForm } from "@/components/scheduling/BookingForm";
import { AppointmentDetail } from "@/components/scheduling/AppointmentDetail";

const SESSION_TYPE_INFO: Record<string, { label: string; color: string }> = {
  initial_consultation: { label: "Initial Consultation", color: "#D4AF37" },
  follow_up: { label: "Follow-Up", color: "#60A5FA" },
  protocol_review: { label: "Protocol Review", color: "#A78BFA" },
  lab_review: { label: "Lab Review", color: "#34D399" },
  goal_setting: { label: "Goal Setting", color: "#F472B6" },
  ad_hoc: { label: "Ad Hoc", color: "#94A3B8" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#FBBF24",
  confirmed: "#34D399",
  in_progress: "#60A5FA",
  completed: "#6B7280",
  cancelled: "#EF4444",
  no_show: "#F97316",
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  video: "Video Call",
  phone: "Phone Call",
  in_person: "In Person",
};

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

export default function AppointmentsPage() {
  const [view, setView] = useState<"list" | "book" | "detail">("list");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const utils = trpc.useUtils();

  const { data: appointmentsList = [] } = trpc.clientPortal.scheduling.listAppointments.useQuery(
    { filter },
    { staleTime: 15_000 }
  );

  const { data: selectedAppointment } = trpc.clientPortal.scheduling.getAppointment.useQuery(
    { appointmentId: selectedAppointmentId ?? "" },
    { enabled: !!selectedAppointmentId && view === "detail" }
  );

  const { data: sessionNotesData } = trpc.clientPortal.scheduling.getSessionNotes.useQuery(
    { appointmentId: selectedAppointmentId ?? "" },
    { enabled: !!selectedAppointmentId && view === "detail" }
  );

  const bookMutation = trpc.clientPortal.scheduling.bookAppointment.useMutation({
    onSuccess: () => {
      utils.clientPortal.scheduling.listAppointments.invalidate();
      setView("list");
    },
  });

  const cancelMutation = trpc.clientPortal.scheduling.cancelAppointment.useMutation({
    onSuccess: () => {
      utils.clientPortal.scheduling.listAppointments.invalidate();
      setView("list");
      setSelectedAppointmentId(null);
    },
  });

  const handleBook = (booking: {
    sessionType: string;
    meetingType: "video" | "phone" | "in_person";
    date: string;
    startTime: string;
    notes: string;
  }) => {
    bookMutation.mutate({
      coachId: "coach-1",
      coachName: "Dr. Sarah Mitchell",
      sessionType: booking.sessionType,
      meetingType: booking.meetingType,
      date: booking.date,
      startTime: booking.startTime,
      notes: booking.notes,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
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
          appointment={{
            ...selectedAppointment,
            date: typeof selectedAppointment.date === "string" ? selectedAppointment.date : new Date(selectedAppointment.date).toISOString().split("T")[0],
            endTime: selectedAppointment.endTime ?? "",
          }}
          sessionNotes={sessionNotesData ? {
            summary: sessionNotesData.summary ?? "",
            keyFindings: (sessionNotesData.keyFindings as string[]) ?? [],
            actionItems: (sessionNotesData.actionItems as string[]) ?? [],
            nextSessionFocus: sessionNotesData.nextSessionFocus ?? "",
            privateNotes: sessionNotesData.privateNotes ?? "",
          } : null}
          role="client"
          onUpdateStatus={(status, reason) => {
            if (status === "cancelled" && selectedAppointmentId) {
              cancelMutation.mutate({ appointmentId: selectedAppointmentId, reason });
            }
          }}
          onClose={() => {
            setView("list");
            setSelectedAppointmentId(null);
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
          {appointmentsList.length === 0 ? (
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
              {appointmentsList.map((appt) => {
                const info = SESSION_TYPE_INFO[appt.sessionType] ?? { label: appt.sessionType, color: "#94A3B8" };
                const dateStr = typeof appt.date === "string" ? appt.date : new Date(appt.date).toISOString().split("T")[0];
                return (
                  <button
                    key={appt.id}
                    onClick={() => {
                      setSelectedAppointmentId(appt.id);
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
                              backgroundColor: `${STATUS_COLORS[appt.status] ?? "#6B7280"}20`,
                              color: STATUS_COLORS[appt.status] ?? "#6B7280",
                            }}
                          >
                            {STATUS_LABELS[appt.status] ?? appt.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          with {appt.coachName ?? "Coach"} — {MEETING_TYPE_LABELS[appt.meetingType] ?? appt.meetingType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{formatDateDisplay(dateStr)}</p>
                        <p className="text-xs text-gray-400">
                          {formatTimeDisplay(appt.startTime)} — {appt.endTime ? formatTimeDisplay(appt.endTime) : ""}
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
