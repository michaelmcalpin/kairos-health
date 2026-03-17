// ─── Appointment Scheduling Types ─────────────────────────────────────
// Coach-client session booking, availability, and session notes.

// ─── Core Enums ──────────────────────────────────────────────────────

export type SessionType =
  | "initial_consult"
  | "follow_up"
  | "lab_review"
  | "protocol_adjustment"
  | "weekly_review"
  | "onboarding"
  | "emergency";

export type MeetingType = "video" | "phone" | "in_person";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 ... Sat=6

// ─── Session Type Metadata ──────────────────────────────────────────

export interface SessionTypeInfo {
  id: SessionType;
  label: string;
  durationMinutes: number;
  color: string;
  description: string;
  tier: "all" | "tier1" | "tier1_tier2";
}

export const SESSION_TYPES: SessionTypeInfo[] = [
  {
    id: "initial_consult",
    label: "Initial Consultation",
    durationMinutes: 60,
    color: "rgb(59, 130, 246)",
    description: "Comprehensive health assessment and goal-setting session.",
    tier: "all",
  },
  {
    id: "follow_up",
    label: "Follow-Up",
    durationMinutes: 30,
    color: "rgb(139, 92, 246)",
    description: "Progress check and protocol adjustment.",
    tier: "all",
  },
  {
    id: "lab_review",
    label: "Lab Review",
    durationMinutes: 45,
    color: "rgb(245, 158, 11)",
    description: "Detailed review of lab results and biomarker trends.",
    tier: "tier1_tier2",
  },
  {
    id: "protocol_adjustment",
    label: "Protocol Adjustment",
    durationMinutes: 30,
    color: "rgb(20, 184, 166)",
    description: "Fine-tune supplements, nutrition, or exercise protocols.",
    tier: "tier1_tier2",
  },
  {
    id: "weekly_review",
    label: "Weekly Review",
    durationMinutes: 20,
    color: "rgb(99, 102, 241)",
    description: "Quick weekly check-in on metrics and adherence.",
    tier: "tier1",
  },
  {
    id: "onboarding",
    label: "Onboarding Session",
    durationMinutes: 45,
    color: "rgb(var(--k-accent))",
    description: "Device setup, platform walkthrough, and initial planning.",
    tier: "all",
  },
  {
    id: "emergency",
    label: "Urgent Consultation",
    durationMinutes: 15,
    color: "rgb(239, 68, 68)",
    description: "Urgent health concern requiring immediate coach attention.",
    tier: "tier1",
  },
];

export function getSessionTypeInfo(type: SessionType): SessionTypeInfo {
  return SESSION_TYPES.find((s) => s.id === type) ?? SESSION_TYPES[1];
}

// ─── Time Slot ──────────────────────────────────────────────────────

export interface TimeSlot {
  startTime: string; // "HH:MM" 24h format
  endTime: string;
  available: boolean;
}

// ─── Availability ───────────────────────────────────────────────────

export interface DayAvailability {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  slots: { start: string; end: string }[]; // e.g., [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }]
}

export interface CoachAvailability {
  coachId: string;
  timezone: string;
  bufferMinutes: number; // buffer between appointments
  weeklySchedule: DayAvailability[];
  blockedDates: string[]; // ISO date strings for days off
}

export const DEFAULT_AVAILABILITY: Omit<CoachAvailability, "coachId"> = {
  timezone: "America/New_York",
  bufferMinutes: 10,
  weeklySchedule: [
    { dayOfWeek: 0, enabled: false, slots: [] },
    { dayOfWeek: 1, enabled: true, slots: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
    { dayOfWeek: 2, enabled: true, slots: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
    { dayOfWeek: 3, enabled: true, slots: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
    { dayOfWeek: 4, enabled: true, slots: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
    { dayOfWeek: 5, enabled: true, slots: [{ start: "09:00", end: "11:00" }] },
    { dayOfWeek: 6, enabled: false, slots: [] },
  ],
  blockedDates: [],
};

// ─── Appointment ────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  coachId: string;
  clientId: string;
  coachName: string;
  clientName: string;
  sessionType: SessionType;
  meetingType: MeetingType;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  status: AppointmentStatus;
  notes: string;
  sessionNotes: string; // Coach's private session notes (post-session)
  meetingUrl: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Session Notes ──────────────────────────────────────────────────

export interface SessionNote {
  appointmentId: string;
  coachId: string;
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  nextSessionFocus: string;
  privateNotes: string;
  createdAt: string;
}

// ─── Booking Request ────────────────────────────────────────────────

export interface BookingRequest {
  coachId: string;
  clientId: string;
  clientName: string;
  coachName: string;
  sessionType: SessionType;
  meetingType: MeetingType;
  date: string;
  startTime: string;
  notes: string;
}

// ─── Calendar View ──────────────────────────────────────────────────

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: DayOfWeek;
  isToday: boolean;
  appointments: Appointment[];
}

// ─── Helpers ────────────────────────────────────────────────────────

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function formatTimeDisplay(time: string): string {
  const { hours, minutes } = parseTime(time);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getWeekDates(startDate: string): string[] {
  const start = new Date(startDate + "T00:00:00");
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  video: "Video Call",
  phone: "Phone Call",
  in_person: "In-Person",
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: "rgb(245, 158, 11)",
  confirmed: "rgb(34, 197, 94)",
  in_progress: "rgb(59, 130, 246)",
  completed: "rgb(107, 114, 128)",
  cancelled: "rgb(239, 68, 68)",
  no_show: "rgb(220, 38, 38)",
};
