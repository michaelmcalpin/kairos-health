"use client";

// ─── Local types (previously from @/lib/scheduling/types) ───────────

interface AppointmentLike {
  id: string;
  clientName: string | null;
  sessionType: string;
  startTime: string;
  [key: string]: unknown;
}

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isToday: boolean;
  appointments: AppointmentLike[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SESSION_TYPE_COLORS: Record<string, string> = {
  initial_consultation: "rgb(59, 130, 246)",
  initial_consult: "rgb(59, 130, 246)",
  follow_up: "rgb(139, 92, 246)",
  lab_review: "rgb(245, 158, 11)",
  protocol_review: "rgb(20, 184, 166)",
  protocol_adjustment: "rgb(20, 184, 166)",
  goal_setting: "rgb(99, 102, 241)",
  weekly_review: "rgb(99, 102, 241)",
  ad_hoc: "rgb(148, 163, 184)",
  onboarding: "rgb(212, 175, 55)",
  emergency: "rgb(239, 68, 68)",
};

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${period}`;
}

// ─── Component ──────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  days: CalendarDay[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAppointmentClick: (appointment: any) => void;
  onSlotClick?: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

export function WeeklyCalendar({
  days,
  onAppointmentClick,
}: WeeklyCalendarProps) {
  return (
    <div className="kairos-card overflow-hidden">
      {/* Header row with day names */}
      <div className="grid grid-cols-8 border-b border-gray-800">
        <div className="p-2 text-xs text-gray-500 text-center border-r border-gray-800">
          Time
        </div>
        {days.map((day) => (
          <div
            key={day.date}
            className={`p-2 text-center border-r border-gray-800 last:border-r-0 ${
              day.isToday ? "bg-kairos-gold/10" : ""
            }`}
          >
            <div className="text-xs text-gray-400">{DAY_NAMES[day.dayOfWeek]}</div>
            <div
              className={`text-sm font-semibold mt-0.5 ${
                day.isToday ? "text-kairos-gold" : "text-white"
              }`}
            >
              {new Date(day.date + "T00:00:00").getDate()}
            </div>
            {day.appointments.length > 0 && (
              <div className="flex justify-center mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-kairos-gold" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-800/50 min-h-[60px]">
            {/* Time label */}
            <div className="p-2 text-xs text-gray-500 text-right pr-3 border-r border-gray-800">
              {hour === 0 ? "12 AM" : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dayAppts = day.appointments.filter((a) => {
                const apptHour = parseInt(a.startTime.split(":")[0], 10);
                return apptHour === hour;
              });

              return (
                <div
                  key={`${day.date}-${hour}`}
                  className={`relative p-1 border-r border-gray-800/30 last:border-r-0 ${
                    day.isToday ? "bg-kairos-gold/5" : ""
                  }`}
                >
                  {dayAppts.map((appt) => {
                    const color = SESSION_TYPE_COLORS[appt.sessionType] ?? "rgb(148, 163, 184)";
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onAppointmentClick(appt)}
                        className="w-full rounded-md px-1.5 py-1 text-left mb-1 transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: `${color}20`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="text-[10px] font-medium text-white truncate">
                          {appt.clientName}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {formatTimeDisplay(appt.startTime)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
