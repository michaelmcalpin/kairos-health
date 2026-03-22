'use client';

import { useState, useCallback } from 'react';
import { Calendar, Clock, Plus, Users } from 'lucide-react';
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import type { Appointment } from "@/lib/scheduling/types";
import {
  SESSION_TYPES,
} from "@/lib/scheduling/types";
import {
  createAppointment,
  getCalendarWeek,
  getSchedulingStats,
  updateAppointmentStatus,
  saveSessionNotes,
  getSessionNotes,
} from "@/lib/scheduling/engine";
import { WeeklyCalendar } from "@/components/scheduling/WeeklyCalendar";
import { AppointmentDetail } from "@/components/scheduling/AppointmentDetail";

const COACH_ID = "demo-coach";

function seedCoachAppointments() {
  const today = new Date();
  const clients = [
    { id: "client-1", name: "Alex Thompson" },
    { id: "client-2", name: "Jordan Chen" },
    { id: "client-3", name: "Maria Santos" },
    { id: "client-4", name: "Emily Brooks" },
  ];

  const seeds = [
    { clientIdx: 0, dayOffset: 0, time: "09:00", type: "follow_up" as const, meeting: "video" as const },
    { clientIdx: 1, dayOffset: 0, time: "10:30", type: "weekly_review" as const, meeting: "phone" as const },
    { clientIdx: 2, dayOffset: 1, time: "14:00", type: "lab_review" as const, meeting: "video" as const },
    { clientIdx: 3, dayOffset: 2, time: "09:00", type: "initial_consult" as const, meeting: "video" as const },
    { clientIdx: 0, dayOffset: 2, time: "11:00", type: "protocol_adjustment" as const, meeting: "in_person" as const },
    { clientIdx: 1, dayOffset: 3, time: "13:00", type: "follow_up" as const, meeting: "phone" as const },
    { clientIdx: 2, dayOffset: 4, time: "10:00", type: "onboarding" as const, meeting: "video" as const },
  ];

  for (const seed of seeds) {
    const date = new Date(today);
    date.setDate(today.getDate() + seed.dayOffset);
    try {
      createAppointment({
        coachId: COACH_ID,
        clientId: clients[seed.clientIdx].id,
        clientName: clients[seed.clientIdx].name,
        coachName: "Trainer",
        sessionType: seed.type,
        meetingType: seed.meeting,
        date: date.toISOString().split("T")[0],
        startTime: seed.time,
        notes: "",
      });
    } catch {
      // Ignore duplicates
    }
  }
}

export default function CoachSchedulePage() {
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);

  if (!seeded) {
    seedCoachAppointments();
    setSeeded(true);
  }

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Get current Monday for week view
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const calendarDays = getCalendarWeek(COACH_ID, weekStart);
  const stats = getSchedulingStats(COACH_ID);

  return (
    <div className="animate-fade-in" key={refreshKey}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-kairos-gold" />
            <div>
              <h1 className="font-heading font-bold text-3xl text-white">Schedule</h1>
              <p className="text-kairos-silver-dark text-sm">Manage your client appointments</p>
            </div>
          </div>
          <button className="kairos-btn-gold gap-2 flex items-center justify-center">
            <Plus className="w-5 h-5" />
            <span>New Appointment</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">This Week</p>
              <Calendar className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{stats.upcomingAppointments}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">Upcoming sessions</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Today</p>
              <Clock className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{stats.todayAppointments}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">Sessions today</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Hours Booked</p>
              <Clock className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{stats.hoursBookedThisWeek}h</p>
            <p className="text-xs text-kairos-silver-dark mt-1">This week</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Completed</p>
              <Users className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{stats.completedThisWeek}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">This week</p>
          </div>
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Appointment Detail */}
      {selectedAppointment && (
        <div className="mb-6">
          <AppointmentDetail
            appointment={selectedAppointment}
            sessionNotes={getSessionNotes(selectedAppointment.id)}
            role="coach"
            onUpdateStatus={(status, reason) => {
              updateAppointmentStatus(selectedAppointment.id, status, reason);
              setSelectedAppointment(null);
              refresh();
            }}
            onSaveNotes={(notes) => {
              saveSessionNotes(selectedAppointment.id, COACH_ID, notes);
              setSelectedAppointment(null);
              refresh();
            }}
            onClose={() => setSelectedAppointment(null)}
          />
        </div>
      )}

      {/* Calendar */}
      <WeeklyCalendar
        days={calendarDays}
        onAppointmentClick={setSelectedAppointment}
      />

      {/* Session Legend */}
      <div className="mt-8 kairos-card p-6">
        <h3 className="font-heading font-bold text-lg text-white mb-4">Session Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SESSION_TYPES.slice(0, 4).map((st) => (
            <div key={st.id} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: `${st.color}30`, border: `1px solid ${st.color}50` }}
              />
              <span className="text-sm text-kairos-silver-dark">{st.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
