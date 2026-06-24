/**
 * Centralized sample data for the Everist.ai mobile app.
 *
 * All demo / fallback data lives here so screens and hooks can reference
 * a single source of truth.  When the tRPC backend is unreachable the
 * custom hooks fall back to these values, keeping the app fully
 * functional in offline / demo mode.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_HEALTH_SCORE = 82;

export const SAMPLE_KPI_DATA = {
  sleep: {
    hours: 7.4,
    quality: 88,
    sparkData: [6.8, 7.1, 7.5, 6.9, 7.2, 7.8, 7.4],
  },
  heartRate: {
    bpm: 62,
    resting: 58,
    sparkData: [64, 61, 63, 60, 62, 59, 62],
  },
  steps: {
    count: 8742,
    goal: 10000,
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
  },
  weight: {
    lbs: 178.4,
    trend: "down" as const,
    trendValue: "-1.2 lbs",
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
  },
};

export const SAMPLE_SCHEDULE_DATA = [
  {
    id: "1",
    time: "9:00 AM",
    title: "Blood Panel Review",
    type: "lab_review" as const,
    trainerName: "Dr. Chen",
    duration: "30 min",
  },
  {
    id: "2",
    time: "11:30 AM",
    title: "Strength Training",
    type: "workout" as const,
    trainerName: "Coach Marcus",
    duration: "60 min",
  },
  {
    id: "3",
    time: "2:00 PM",
    title: "Nutrition Consultation",
    type: "nutrition" as const,
    trainerName: "Sarah Miller, RD",
    duration: "45 min",
  },
  {
    id: "4",
    time: "5:30 PM",
    title: "Weekly Check-in",
    type: "check_in" as const,
    trainerName: "Dr. Chen",
    duration: "15 min",
  },
];

export const SAMPLE_BIOMETRICS_DATA = {
  bloodPressure: {
    value: "118/76",
    unit: "mmHg",
    status: "normal" as const,
    sparkData: [122, 120, 119, 121, 118, 117, 118],
    sparkColor: "#C65D5D",
    iconBg: "rgba(198, 93, 93, 0.12)",
  },
  glucose: {
    value: 92,
    unit: "mg/dL",
    status: "optimal" as const,
    sparkData: [98, 95, 91, 94, 89, 93, 92],
    sparkColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.12)",
  },
  sleepScore: {
    value: 88,
    unit: "/100",
    status: "optimal" as const,
    sparkData: [82, 85, 79, 88, 84, 91, 88],
    sparkColor: "#60A5FA",
    iconBg: "rgba(96, 165, 250, 0.12)",
  },
  hrv: {
    value: 48,
    unit: "ms",
    status: "normal" as const,
    sparkData: [42, 45, 44, 47, 43, 49, 48],
    sparkColor: "#A78BFA",
    iconBg: "rgba(167, 139, 250, 0.12)",
  },
  bodyWeight: {
    value: 178.4,
    unit: "lbs",
    status: "normal" as const,
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
    sparkColor: "#4A90D9",
    iconBg: "rgba(74, 144, 217, 0.12)",
  },
  dailySteps: {
    value: "8,742",
    unit: "steps",
    status: "normal" as const,
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
    sparkColor: "#4A9D5B",
    iconBg: "rgba(74, 157, 91, 0.12)",
  },
};

export const SAMPLE_DASHBOARD_PROTOCOLS = [
  {
    id: "p1",
    title: "Vitamin D3 + K2",
    dosage: "5,000 IU + 200 mcg",
    time: "Morning",
    category: "supplement" as const,
    completed: true,
  },
  {
    id: "p2",
    title: "Omega-3 Fish Oil",
    dosage: "2,000 mg EPA/DHA",
    time: "Morning",
    category: "supplement" as const,
    completed: true,
  },
  {
    id: "p3",
    title: "Magnesium Glycinate",
    dosage: "400 mg",
    time: "Evening",
    category: "supplement" as const,
    completed: false,
  },
  {
    id: "p4",
    title: "Metformin ER",
    dosage: "500 mg",
    time: "With dinner",
    category: "medication" as const,
    completed: false,
  },
  {
    id: "p5",
    title: "Zone 2 Cardio",
    dosage: "45 min, HR 120-135",
    time: "Afternoon",
    category: "exercise" as const,
    completed: false,
  },
  {
    id: "p6",
    title: "BPC-157",
    dosage: "250 mcg subQ",
    time: "Morning",
    category: "peptide" as const,
    completed: true,
  },
];

export const SAMPLE_ALERTS = [
  {
    id: "a1",
    title: "Glucose spike detected",
    message:
      "Post-meal glucose reached 162 mg/dL at 1:23 PM yesterday. Consider adjusting carb intake.",
    timestamp: "2h ago",
    priority: "action" as const,
    type: "glucose" as const,
  },
  {
    id: "a2",
    title: "New lab results available",
    message:
      "Your comprehensive metabolic panel results are ready for review.",
    timestamp: "5h ago",
    priority: "info" as const,
    type: "labs" as const,
  },
  {
    id: "a3",
    title: "Sleep quality declining",
    message:
      "Average sleep score dropped 12% over the past week. Review your sleep hygiene routine.",
    timestamp: "1d ago",
    priority: "action" as const,
    type: "sleep" as const,
  },
  {
    id: "a4",
    title: "Coach message",
    message:
      "Great progress on your weight goal this month! Let's discuss next steps.",
    timestamp: "1d ago",
    priority: "info" as const,
    type: "coach" as const,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Health screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_HEALTH_SCORE_DETAIL = {
  overall: 82,
  trend: "up" as const,
  trendDelta: 3,
  trendLabel: "Up 3 points from last week",
  subScores: [
    { label: "Cardio", value: 85 },
    { label: "Metabolic", value: 78 },
    { label: "Recovery", value: 84 },
  ],
};

/** Biometric categories for the Health screen grid (no JSX icons here). */
export const SAMPLE_BIOMETRIC_CATEGORIES = [
  {
    id: "sleep",
    label: "Sleep",
    value: "7.4",
    unit: "hrs",
    status: "optimal" as const,
    lastUpdated: "2h ago",
    sparkData: [6.8, 7.1, 7.5, 6.9, 7.2, 7.8, 7.4],
    sparkColor: "#60A5FA",
    iconBgColor: "rgba(96, 165, 250, 0.12)",
  },
  {
    id: "heartRate",
    label: "Heart Rate",
    value: "62",
    unit: "bpm",
    status: "optimal" as const,
    lastUpdated: "5m ago",
    sparkData: [64, 61, 63, 60, 62, 59, 62],
    sparkColor: "#C65D5D",
    iconBgColor: "rgba(198, 93, 93, 0.12)",
  },
  {
    id: "bloodPressure",
    label: "Blood Pressure",
    value: "118/76",
    unit: "mmHg",
    status: "normal" as const,
    lastUpdated: "1h ago",
    sparkData: [122, 120, 119, 121, 118, 117, 118],
    sparkColor: "#C65D5D",
    iconBgColor: "rgba(198, 93, 93, 0.12)",
  },
  {
    id: "glucose",
    label: "Blood Glucose",
    value: "92",
    unit: "mg/dL",
    status: "normal" as const,
    lastUpdated: "3h ago",
    sparkData: [98, 95, 91, 94, 89, 93, 92],
    sparkColor: "#F59E0B",
    iconBgColor: "rgba(245, 158, 11, 0.12)",
  },
  {
    id: "hrv",
    label: "HRV",
    value: "48",
    unit: "ms",
    status: "normal" as const,
    lastUpdated: "5m ago",
    sparkData: [42, 45, 44, 47, 43, 49, 48],
    sparkColor: "#A78BFA",
    iconBgColor: "rgba(167, 139, 250, 0.12)",
  },
  {
    id: "weight",
    label: "Body Weight",
    value: "178.4",
    unit: "lbs",
    status: "normal" as const,
    lastUpdated: "6h ago",
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
    sparkColor: "#4A90D9",
    iconBgColor: "rgba(74, 144, 217, 0.12)",
  },
  {
    id: "steps",
    label: "Steps",
    value: "8,742",
    unit: "steps",
    status: "normal" as const,
    lastUpdated: "Live",
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
    sparkColor: "#4A9D5B",
    iconBgColor: "rgba(74, 157, 91, 0.12)",
  },
  {
    id: "temperature",
    label: "Body Temp",
    value: "98.2",
    unit: "°F",
    status: "normal" as const,
    lastUpdated: "4h ago",
    sparkData: [98.4, 98.1, 98.3, 98.0, 98.2, 98.1, 98.2],
    sparkColor: "#FB923C",
    iconBgColor: "rgba(251, 146, 60, 0.12)",
  },
];

/** Recent readings (raw data without JSX). */
export const SAMPLE_RECENT_READINGS = [
  {
    date: "Today",
    readings: [
      {
        id: "r1",
        time: "8:42 AM",
        type: "Heart Rate",
        value: "62 bpm (resting)",
        source: "Apple Watch Ultra",
        iconType: "heartRate" as const,
      },
      {
        id: "r2",
        time: "7:15 AM",
        type: "Blood Pressure",
        value: "118/76 mmHg",
        source: "Withings BPM Connect",
        iconType: "bloodPressure" as const,
      },
      {
        id: "r3",
        time: "6:50 AM",
        type: "Sleep",
        value: "7.4 hrs -- 88% quality",
        source: "Oura Ring Gen 3",
        iconType: "sleep" as const,
      },
      {
        id: "r4",
        time: "6:50 AM",
        type: "HRV",
        value: "48 ms",
        source: "Oura Ring Gen 3",
        iconType: "hrv" as const,
      },
    ],
  },
  {
    date: "Yesterday",
    readings: [
      {
        id: "r5",
        time: "9:30 PM",
        type: "Blood Glucose",
        value: "105 mg/dL (post-meal)",
        source: "Dexcom G7",
        iconType: "glucose" as const,
      },
      {
        id: "r6",
        time: "6:00 PM",
        type: "Body Weight",
        value: "178.8 lbs",
        source: "Withings Body+",
        iconType: "weight" as const,
      },
      {
        id: "r7",
        time: "11:59 PM",
        type: "Steps",
        value: "11,302 steps",
        source: "Apple Watch Ultra",
        iconType: "steps" as const,
      },
    ],
  },
];

export const SAMPLE_AI_INSIGHT =
  "Your sleep quality has improved 12% this week. HRV readings suggest good recovery. Consider maintaining your current sleep schedule and evening magnesium supplementation for continued improvement.";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Protocols screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SampleProtocolItem {
  id: string;
  title: string;
  dosage: string;
  form?: string;
  category: "supplement" | "medication" | "peptide" | "exercise";
  timeSlot: "morning" | "afternoon" | "evening" | "bedtime";
  hasNotes?: boolean;
}

export const SAMPLE_PROTOCOL_ITEMS: SampleProtocolItem[] = [
  // Morning
  { id: "m1", title: "Vitamin D3", dosage: "5,000 IU", category: "supplement", timeSlot: "morning" },
  { id: "m2", title: "Omega-3 Fish Oil", dosage: "2g", category: "supplement", timeSlot: "morning" },
  { id: "m3", title: "Metformin", dosage: "500mg", category: "medication", timeSlot: "morning", hasNotes: true },
  { id: "m4", title: "BPC-157", dosage: "250mcg", form: "sublingual", category: "peptide", timeSlot: "morning" },
  { id: "m5", title: "Morning Walk", dosage: "30 min", category: "exercise", timeSlot: "morning" },
  // Afternoon
  { id: "a1", title: "NMN", dosage: "500mg", category: "supplement", timeSlot: "afternoon" },
  { id: "a2", title: "Magnesium Glycinate", dosage: "400mg", category: "supplement", timeSlot: "afternoon" },
  { id: "a3", title: "Post-Lunch Walk", dosage: "15 min", category: "exercise", timeSlot: "afternoon" },
  // Evening
  { id: "e1", title: "Strength Training", dosage: "45 min", category: "exercise", timeSlot: "evening" },
  { id: "e2", title: "Creatine", dosage: "5g", category: "supplement", timeSlot: "evening" },
  { id: "e3", title: "Zinc", dosage: "30mg", category: "supplement", timeSlot: "evening" },
  // Bedtime
  { id: "b1", title: "Melatonin", dosage: "0.5mg", category: "supplement", timeSlot: "bedtime" },
  { id: "b2", title: "Glycine", dosage: "3g", category: "supplement", timeSlot: "bedtime" },
  { id: "b3", title: "Ashwagandha", dosage: "600mg", category: "supplement", timeSlot: "bedtime" },
];

export const SAMPLE_PROTOCOL_INITIAL_COMPLETED = new Set([
  "m1", "m2", "m4", "m5", "a1", "a2", "a3", "e2", "e3", "e1", "b1", "b2", "b3",
]);

export const SAMPLE_WEEKLY_ADHERENCE = [
  { day: "M", percent: 85, isToday: false },
  { day: "T", percent: 70, isToday: false },
  { day: "W", percent: 93, isToday: false },
  { day: "T", percent: 60, isToday: false },
  { day: "F", percent: 100, isToday: false },
  { day: "S", percent: 78, isToday: false },
  { day: "S", percent: 65, isToday: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SampleChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  isRead?: boolean;
}

export const SAMPLE_AI_MESSAGES: SampleChatMessage[] = [
  {
    id: "ai-1",
    content:
      "Good morning! I've reviewed your latest health data. Your resting heart rate has improved by 4 BPM over the past month, and your HRV is trending upward. Great progress on the cardiovascular front.",
    timestamp: "2026-06-13T08:15:00Z",
    isUser: false,
  },
  {
    id: "ai-2",
    content:
      "That's great to hear! How are my recent lab results looking? Anything I should be concerned about?",
    timestamp: "2026-06-13T08:16:00Z",
    isUser: true,
  },
  {
    id: "ai-3",
    content:
      "Your labs from June 8th look solid overall. A few highlights:\n\n- Vitamin D: 62 ng/mL (optimal range). Your supplementation protocol is working well.\n- hsCRP: 0.4 mg/L (excellent, down from 0.9 in March). Inflammation markers are improving.\n- Fasting glucose: 88 mg/dL (normal).\n- Testosterone: 680 ng/dL (good for your age).\n\nOne thing to watch: your LDL-P is at 1,180 nmol/L, slightly above the optimal threshold of 1,000. I'd recommend discussing apoB testing with your doctor at your next visit.",
    timestamp: "2026-06-13T08:17:00Z",
    isUser: false,
  },
  {
    id: "ai-4",
    content:
      "Good call on the LDL-P. What about my supplement stack -- am I taking anything that could help with that?",
    timestamp: "2026-06-13T08:19:00Z",
    isUser: true,
  },
  {
    id: "ai-5",
    content:
      "Your current supplement protocol includes Omega-3 (2g EPA/DHA) which supports healthy lipid levels. You might also consider adding Berberine (500mg with meals) or Citrus Bergamot, both of which have evidence for supporting LDL particle reduction.\n\nHowever, I'd recommend discussing any additions with your healthcare provider first, especially given your current stack of 8 supplements. Let me know if you'd like a full interaction check on your protocol.",
    timestamp: "2026-06-13T08:20:00Z",
    isUser: false,
  },
];

export const SAMPLE_COACH_MESSAGES: SampleChatMessage[] = [
  {
    id: "coach-1",
    content:
      "Hey! I reviewed your workout logs from this week. Your volume is progressing nicely on the compound lifts. How's the shoulder feeling after we adjusted your pressing angle?",
    timestamp: "2026-06-12T14:30:00Z",
    isUser: false,
    isRead: true,
  },
  {
    id: "coach-2",
    content:
      "Much better actually! No pain during overhead press yesterday. The 15-degree incline adjustment made a big difference.",
    timestamp: "2026-06-12T14:35:00Z",
    isUser: true,
    isRead: true,
  },
  {
    id: "coach-3",
    content:
      "Excellent, that's exactly what I was hoping for. Let's keep that angle for the next 2 weeks and then we can reassess.\n\nAlso, I noticed your sleep score dropped to 68 on Tuesday and Wednesday. Are you staying up late or is something else going on? Recovery is crucial during this hypertrophy phase.",
    timestamp: "2026-06-12T14:38:00Z",
    isUser: false,
    isRead: true,
  },
  {
    id: "coach-4",
    content:
      "Yeah, I had some work deadlines. Back on track now though. Got 8 hours last night and feel recovered.",
    timestamp: "2026-06-12T15:02:00Z",
    isUser: true,
    isRead: true,
  },
  {
    id: "coach-5",
    content:
      "Good to hear. For tomorrow's session, let's do a deload on squats (drop to 80% of your working weight) and focus on tempo work -- 3 seconds eccentric. Your CNS will thank you after this heavy week. I've updated your protocol in the app.",
    timestamp: "2026-06-12T15:10:00Z",
    isUser: false,
    isRead: false,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Profile / Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_USER_PROFILE = {
  initials: "MM",
  name: "Michael McAlpin",
  email: "michael.mcalpin@gmail.com",
  memberSince: "January 2024",
  age: 38,
  height: "5'10\"",
  weight: "185 lbs",
  bloodType: "O+",
  healthScore: 82,
  tier: "Premium",
};

export const SAMPLE_DEVICES = [
  { name: "Apple Watch", connected: true },
  { name: "Oura Ring", connected: true },
  { name: "Dexcom G7", connected: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Appointments
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SampleAppointment {
  id: string;
  title: string;
  type: string;
  provider: string;
  date: string;
  time: string;
  method: "Video Call" | "In-Person";
  status: "confirmed" | "pending" | "completed" | "cancelled";
  badgeVariant: "success" | "warning" | "info" | "default" | "danger";
}

export const SAMPLE_UPCOMING_APPOINTMENTS: SampleAppointment[] = [
  {
    id: "apt-1",
    title: "Nutrition Consultation",
    type: "Nutrition",
    provider: "Dr. Rachel Kim",
    date: "June 15, 2026",
    time: "10:00 AM",
    method: "Video Call",
    status: "confirmed",
    badgeVariant: "warning",
  },
  {
    id: "apt-2",
    title: "Lab Review",
    type: "Lab Review",
    provider: "Dr. Sarah Chen",
    date: "June 18, 2026",
    time: "2:30 PM",
    method: "In-Person",
    status: "confirmed",
    badgeVariant: "success",
  },
  {
    id: "apt-3",
    title: "Workout Assessment",
    type: "Fitness",
    provider: "Coach Walid",
    date: "June 20, 2026",
    time: "9:00 AM",
    method: "Video Call",
    status: "pending",
    badgeVariant: "info",
  },
];

export const SAMPLE_PAST_APPOINTMENTS: SampleAppointment[] = [
  {
    id: "apt-4",
    title: "Annual Physical",
    type: "General",
    provider: "Dr. Sarah Chen",
    date: "May 20, 2026",
    time: "11:00 AM",
    method: "In-Person",
    status: "completed",
    badgeVariant: "default",
  },
  {
    id: "apt-5",
    title: "Sleep Consultation",
    type: "Sleep",
    provider: "Dr. James Park",
    date: "May 12, 2026",
    time: "3:00 PM",
    method: "Video Call",
    status: "completed",
    badgeVariant: "default",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Convenience aggregate — single import for hooks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_DATA = {
  // Dashboard
  healthScore: SAMPLE_HEALTH_SCORE,
  kpiData: SAMPLE_KPI_DATA,
  scheduleData: SAMPLE_SCHEDULE_DATA,
  biometricsData: SAMPLE_BIOMETRICS_DATA,
  dashboardProtocols: SAMPLE_DASHBOARD_PROTOCOLS,
  alerts: SAMPLE_ALERTS,

  // Health
  healthScoreDetail: SAMPLE_HEALTH_SCORE_DETAIL,
  biometricCategories: SAMPLE_BIOMETRIC_CATEGORIES,
  recentReadings: SAMPLE_RECENT_READINGS,
  aiInsight: SAMPLE_AI_INSIGHT,

  // Protocols
  protocolItems: SAMPLE_PROTOCOL_ITEMS,
  protocolInitialCompleted: SAMPLE_PROTOCOL_INITIAL_COMPLETED,
  weeklyAdherence: SAMPLE_WEEKLY_ADHERENCE,

  // Chat
  aiMessages: SAMPLE_AI_MESSAGES,
  coachMessages: SAMPLE_COACH_MESSAGES,

  // Profile
  userProfile: SAMPLE_USER_PROFILE,
  devices: SAMPLE_DEVICES,

  // Appointments
  upcomingAppointments: SAMPLE_UPCOMING_APPOINTMENTS,
  pastAppointments: SAMPLE_PAST_APPOINTMENTS,
} as const;
