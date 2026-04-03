'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, Plus, Users, X } from 'lucide-react';
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { WeeklyCalendar } from "@/components/scheduling/WeeklyCalendar";
import { AppointmentDetail } from "@/components/scheduling/AppointmentDetail";

// Local session types constant (previously from @/lib/scheduling/types)
const SESSION_TYPES = [
  { id: "initial_consultation", label: "Initial Consultation", durationMinutes: 60, color: "rgb(59, 130, 246)", description: "Comprehensive health assessment." },
  { id: "follow_up", label: "Follow-Up", durationMinutes: 30, color: "rgb(139, 92, 246)", description: "Progress check and protocol adjustment." },
  { id: "lab_review", label: "Lab Review", durationMinutes: 45, color: "rgb(245, 158, 11)", description: "Review lab results and biomarker trends." },
  { id: "protocol_review", label: "Protocol Review", durationMinutes: 45, color: "rgb(20, 184, 166)", description: "Review and adjust protocols." },
  { id: "goal_setting", label: "Goal Setting", durationMinutes: 60, color: "rgb(99, 102, 241)", description: "Set or revise health goals." },
  { id: "ad_hoc", label: "Ad Hoc", durationMinutes: 30, color: "rgb(148, 163, 184)", description: "Quick session for specific concerns." },
];

interface AppointmentLike {
  id: string;
  coachId: string;
  clientId: string;
  coachName: string | null;
  clientName: string | null;
  sessionType: string;
  meetingType: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  status: string;
  notes: string | null;
  cancellationReason: string | null;
}

export default function CoachSchedulePage() {
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentLike | null>(null);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({ clientId: "", clientName: "", date: "", time: "09:00", type: "follow_up" as const, meeting: "video" as const });

  // Get current Monday for week view
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  // Fetch calendar, stats, and clients data
  const { data: calendarData, isLoading: isCalendarLoading } = trpc.coach.schedule.getCalendarWeek.useQuery({ weekStart });
  const { data: statsData, isLoading: isStatsLoading } = trpc.coach.schedule.getStats.useQuery();
  const { data: clientsList, isLoading: isClientsLoading } = trpc.coach.clients.list.useQuery();

  // Mutations
  const createMutation = trpc.coach.schedule.createAppointment.useMutation();
  const updateStatusMutation = trpc.coach.schedule.updateStatus.useMutation();
  const saveNotesMutation = trpc.coach.schedule.saveSessionNotes.useMutation();

  // Transform tRPC calendar data { weekStart, weekEnd, days: Record<string, appt[]> } into CalendarDay[]
  const calendarDays = useMemo(() => {
    if (!calendarData || !calendarData.days) return [];
    const todayStr = new Date().toISOString().split("T")[0];
    // Generate 7 days starting from weekStart
    const days = [];
    const start = new Date(calendarData.weekStart + "T00:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        dayOfWeek: d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        isToday: dateStr === todayStr,
        appointments: (calendarData.days[dateStr] ?? []).map((a) => ({
          ...a,
          date: typeof a.date === "string" ? a.date : new Date(a.date).toISOString().split("T")[0],
          endTime: a.endTime ?? "",
        })),
      });
    }
    return days;
  }, [calendarData]);

  const stats = statsData || {
    upcomingAppointments: 0,
    todayAppointments: 0,
    hoursBookedThisWeek: 0,
    completedThisWeek: 0,
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-kairos-gold" />
            <div>
              <h1 className="font-heading font-bold text-3xl text-white">Schedule</h1>
              <p className="text-kairos-silver-dark text-sm">Manage your client appointments</p>
            </div>
          </div>
          <button onClick={() => setShowNewAppt(true)} className="kairos-btn-gold gap-2 flex items-center justify-center">
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
            <p className="font-heading font-bold text-2xl text-white">{isStatsLoading ? "-" : stats.upcomingAppointments}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">Upcoming sessions</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Today</p>
              <Clock className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{isStatsLoading ? "-" : stats.todayAppointments}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">Sessions today</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Hours Booked</p>
              <Clock className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{isStatsLoading ? "-" : stats.hoursBookedThisWeek}h</p>
            <p className="text-xs text-kairos-silver-dark mt-1">This week</p>
          </div>

          <div className="kairos-card p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Completed</p>
              <Users className="w-5 h-5 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-2xl text-white">{isStatsLoading ? "-" : stats.completedThisWeek}</p>
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
            sessionNotes={null}
            role="coach"
            onUpdateStatus={(status, reason) => {
              updateStatusMutation.mutate(
                { appointmentId: selectedAppointment.id, status, reason },
                {
                  onSuccess: () => {
                    setSelectedAppointment(null);
                  },
                }
              );
            }}
            onSaveNotes={(notes) => {
              if (selectedAppointment) {
                saveNotesMutation.mutate(
                  {
                    appointmentId: selectedAppointment.id,
                    summary: notes.summary,
                    keyFindings: notes.keyFindings,
                    actionItems: notes.actionItems,
                    nextSessionFocus: notes.nextSessionFocus,
                    privateNotes: notes.privateNotes,
                  },
                  { onSuccess: () => setSelectedAppointment(null) }
                );
              }
            }}
            onClose={() => setSelectedAppointment(null)}
          />
        </div>
      )}

      {/* Calendar */}
      {isCalendarLoading ? (
        <div className="kairos-card p-12 text-center">
          <p className="text-kairos-silver-dark">Loading calendar...</p>
        </div>
      ) : (
        <WeeklyCalendar
          days={calendarDays}
          onAppointmentClick={setSelectedAppointment}
        />
      )}

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

      {/* New Appointment Modal */}
      {showNewAppt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">New Appointment</h2>
              <button onClick={() => setShowNewAppt(false)} className="text-kairos-silver-dark hover:text-white" aria-label="Close modal"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="kairos-label mb-1 block">Select Client</label>
                <select
                  value={newAppt.clientId}
                  onChange={(e) => {
                    const selectedClient = clientsList?.find(c => c.id === e.target.value);
                    setNewAppt({
                      ...newAppt,
                      clientId: e.target.value,
                      clientName: selectedClient?.name ?? ""
                    });
                  }}
                  className="kairos-input w-full"
                >
                  <option value="">-- Select a client --</option>
                  {clientsList?.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="kairos-label mb-1 block">Date</label>
                  <input type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} className="kairos-input w-full" />
                </div>
                <div>
                  <label className="kairos-label mb-1 block">Time</label>
                  <input type="time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} className="kairos-input w-full" />
                </div>
              </div>
              <div>
                <label className="kairos-label mb-1 block">Session Type</label>
                <select value={newAppt.type} onChange={(e) => setNewAppt({ ...newAppt, type: e.target.value as typeof newAppt.type })} className="kairos-input w-full">
                  {SESSION_TYPES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </div>
              <div>
                <label className="kairos-label mb-1 block">Meeting Type</label>
                <select value={newAppt.meeting} onChange={(e) => setNewAppt({ ...newAppt, meeting: e.target.value as typeof newAppt.meeting })} className="kairos-input w-full">
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => setShowNewAppt(false)} className="kairos-btn-outline flex-1">Cancel</button>
              <button
                onClick={() => {
                  if (newAppt.clientId && newAppt.date) {
                    createMutation.mutate(
                      {
                        clientId: newAppt.clientId,
                        clientName: newAppt.clientName,
                        sessionType: newAppt.type,
                        meetingType: newAppt.meeting,
                        date: newAppt.date,
                        startTime: newAppt.time,
                        notes: "",
                      },
                      {
                        onSuccess: () => {
                          setShowNewAppt(false);
                          setNewAppt({ clientId: "", clientName: "", date: "", time: "09:00", type: "follow_up", meeting: "video" });
                        },
                      }
                    );
                  }
                }}
                disabled={!newAppt.clientId || !newAppt.date || createMutation.isPending}
                className="kairos-btn-gold flex-1 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
