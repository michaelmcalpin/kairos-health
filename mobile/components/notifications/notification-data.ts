/**
 * Sample notification data and type definitions for the Notification Center.
 */

export type NotificationPriority = "urgent" | "action" | "info" | "resolved";

export type NotificationType =
  | "glucose"
  | "sleep"
  | "labs"
  | "coach"
  | "appointment"
  | "protocol"
  | "heart"
  | "supplement"
  | "exercise"
  | "report"
  | "biome"
  | "scan"
  | "goal"
  | "medication";

export type FilterTab = "all" | "action_required" | "info" | "resolved";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  detail: string;
  timestamp: string;
  timeAgo: string;
  read: boolean;
  /** Optional related data for the detail view */
  relatedData?: {
    label: string;
    value: string;
    unit?: string;
    context?: string;
  };
  /** CTA label for the detail view */
  actionLabel?: string;
}

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "action_required", label: "Action Required" },
  { key: "info", label: "Info" },
  { key: "resolved", label: "Resolved" },
];

export const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "glucose",
    priority: "action",
    title: "Glucose spike: 162 mg/dL post-meal",
    message:
      "Your glucose reached 162 mg/dL approximately 45 minutes after lunch. This exceeds your target range of 70-140 mg/dL.",
    detail:
      "Post-meal glucose spike detected at 1:23 PM. Your reading of 162 mg/dL is 22 mg/dL above your upper target. Consider reviewing your carbohydrate intake and timing. A 15-minute walk after meals can help reduce spikes by up to 30%.",
    timestamp: "2026-06-13T10:00:00Z",
    timeAgo: "2h ago",
    read: false,
    relatedData: {
      label: "Glucose Reading",
      value: "162",
      unit: "mg/dL",
      context: "Target range: 70-140 mg/dL",
    },
    actionLabel: "View Glucose",
  },
  {
    id: "n2",
    type: "labs",
    priority: "info",
    title: "New lab results available",
    message:
      "Your comprehensive metabolic panel results from June 12 are ready for review.",
    detail:
      "Lab results from Quest Diagnostics have been uploaded to your profile. Your comprehensive metabolic panel includes 14 biomarkers. 12 are within optimal range, 1 is borderline (LDL cholesterol at 128 mg/dL), and 1 requires attention (Vitamin D at 22 ng/mL).",
    timestamp: "2026-06-13T07:00:00Z",
    timeAgo: "5h ago",
    read: false,
    relatedData: {
      label: "Biomarkers Reviewed",
      value: "14",
      context: "12 optimal, 1 borderline, 1 low",
    },
    actionLabel: "View Labs",
  },
  {
    id: "n3",
    type: "sleep",
    priority: "action",
    title: "Sleep quality declined 12%",
    message:
      "Your sleep quality score dropped from 82 to 72 over the past week. Deep sleep has decreased by 18 minutes.",
    detail:
      "Weekly sleep trend analysis shows a consistent decline in sleep quality. Deep sleep averaged 48 minutes (down from 66 minutes). REM sleep is stable at 1h 42m. Possible contributors: increased screen time before bed, later bedtime average (11:42 PM vs 10:55 PM prior week).",
    timestamp: "2026-06-12T08:00:00Z",
    timeAgo: "1d ago",
    read: false,
    relatedData: {
      label: "Sleep Score",
      value: "72",
      context: "Down from 82 last week (-12%)",
    },
    actionLabel: "View Sleep",
  },
  {
    id: "n4",
    type: "coach",
    priority: "info",
    title: "Coach message from Dr. Kim",
    message:
      "Dr. Kim reviewed your latest labs and has recommendations for optimizing your Vitamin D levels.",
    detail:
      "Dr. Kim has sent you a message regarding your latest lab results. She recommends increasing your Vitamin D3 supplementation from 2,000 IU to 5,000 IU daily, and suggests retesting in 8 weeks. She also noted your improved HbA1c trend.",
    timestamp: "2026-06-12T06:00:00Z",
    timeAgo: "1d ago",
    read: true,
    actionLabel: "Open Chat",
  },
  {
    id: "n5",
    type: "appointment",
    priority: "info",
    title: "Appointment reminder: Lab Review tomorrow",
    message:
      "You have a virtual appointment with Dr. Kim tomorrow at 10:00 AM for your quarterly lab review.",
    detail:
      "Quarterly Lab Review with Dr. Sarah Kim, MD. Scheduled for June 14, 2026 at 10:00 AM (PST). This is a virtual appointment via the Everist telehealth platform. Please have your recent lab results and any questions ready.",
    timestamp: "2026-06-11T09:00:00Z",
    timeAgo: "2d ago",
    read: true,
    relatedData: {
      label: "Appointment",
      value: "Jun 14, 10:00 AM",
      context: "Virtual - Dr. Sarah Kim, MD",
    },
    actionLabel: "View Appointment",
  },
  {
    id: "n6",
    type: "protocol",
    priority: "action",
    title: "BPC-157 cycle completing in 3 days",
    message:
      "Your current BPC-157 peptide cycle ends on June 16. Review your protocol for next steps.",
    detail:
      "Your 4-week BPC-157 peptide protocol is nearing completion. Current dosage: 250 mcg twice daily (subcutaneous). Adherence this cycle: 94%. Your provider may recommend a wash-out period before the next cycle. Review your protocol details and discuss with your coach.",
    timestamp: "2026-06-11T08:00:00Z",
    timeAgo: "2d ago",
    read: true,
    relatedData: {
      label: "Cycle Adherence",
      value: "94%",
      context: "BPC-157 250mcg 2x/day - ends Jun 16",
    },
    actionLabel: "Review Protocol",
  },
  {
    id: "n7",
    type: "heart",
    priority: "urgent",
    title: "Blood pressure trending upward",
    message:
      "Your systolic blood pressure has averaged 138 mmHg over the past 5 days, up from 124 mmHg.",
    detail:
      "Blood pressure trend alert: Your 5-day rolling average systolic BP is 138 mmHg, which is above the elevated threshold of 130 mmHg. Diastolic average is 88 mmHg. Previous 30-day average was 124/78 mmHg. Contributing factors may include increased sodium intake, stress, or medication timing changes. Please consult your provider if this trend continues.",
    timestamp: "2026-06-10T07:00:00Z",
    timeAgo: "3d ago",
    read: true,
    relatedData: {
      label: "Systolic BP (5-day avg)",
      value: "138",
      unit: "mmHg",
      context: "Previous 30-day avg: 124 mmHg",
    },
    actionLabel: "View Blood Pressure",
  },
  {
    id: "n8",
    type: "report",
    priority: "info",
    title: "Weekly health report ready",
    message:
      "Your weekly health summary for June 2-8 has been generated with insights and recommendations.",
    detail:
      "Your weekly health report covers June 2-8, 2026. Highlights: Overall health score improved to 78 (+3). Average glucose: 108 mg/dL. Average sleep: 6h 48m. Steps: 9,200/day avg. Protocol adherence: 87%. Key recommendation: Increase daily water intake to support kidney function biomarkers.",
    timestamp: "2026-06-09T06:00:00Z",
    timeAgo: "4d ago",
    read: true,
    relatedData: {
      label: "Health Score",
      value: "78",
      context: "+3 from previous week",
    },
    actionLabel: "View Report",
  },
  {
    id: "n9",
    type: "supplement",
    priority: "action",
    title: "Supplement refill needed: Omega-3",
    message:
      "Based on your usage rate, your Omega-3 (EPA/DHA) supply will run out in approximately 5 days.",
    detail:
      "Omega-3 Fish Oil (EPA 720mg / DHA 480mg) refill reminder. Estimated remaining supply: 5 days at current dosage of 2 softgels daily. This supplement is part of your Cardiovascular Support protocol. Maintaining consistent supplementation is important for your triglyceride management goals.",
    timestamp: "2026-06-08T09:00:00Z",
    timeAgo: "5d ago",
    read: true,
    relatedData: {
      label: "Days Remaining",
      value: "5",
      context: "Omega-3 2 softgels/day",
    },
    actionLabel: "Review Protocol",
  },
  {
    id: "n10",
    type: "scan",
    priority: "info",
    title: "DEXA scan results uploaded",
    message:
      "Your DEXA body composition scan from June 5 has been processed and is available for review.",
    detail:
      "DEXA Scan Results (June 5, 2026): Total body fat: 18.2% (down from 19.8% in March). Lean mass: 156.4 lbs (+2.1 lbs). Bone mineral density: T-score -0.3 (normal). Visceral fat: 0.8 lbs (optimal range). Your body composition is trending favorably with your current training protocol.",
    timestamp: "2026-06-06T10:00:00Z",
    timeAgo: "1w ago",
    read: true,
    relatedData: {
      label: "Body Fat",
      value: "18.2%",
      context: "Down from 19.8% in March",
    },
    actionLabel: "View Scan",
  },
  {
    id: "n11",
    type: "goal",
    priority: "resolved",
    title: "Goal achieved: 7+ hrs sleep streak",
    message:
      "Congratulations! You have slept 7 or more hours for 14 consecutive nights.",
    detail:
      "Sleep goal milestone reached! You have maintained 7+ hours of sleep for 14 consecutive nights (May 23 - June 5). Average sleep duration: 7h 22m. Average sleep quality score: 81. This consistent sleep pattern is associated with improved HRV, better glucose regulation, and enhanced cognitive performance. Keep it up!",
    timestamp: "2026-06-06T08:00:00Z",
    timeAgo: "1w ago",
    read: true,
    relatedData: {
      label: "Sleep Streak",
      value: "14 nights",
      context: "Avg 7h 22m, quality score 81",
    },
    actionLabel: "View Sleep",
  },
  {
    id: "n12",
    type: "medication",
    priority: "urgent",
    title: "Metformin interaction warning",
    message:
      "Potential interaction detected between Metformin and your new Vitamin B12 supplement timing.",
    detail:
      "Drug-supplement interaction alert: Metformin can reduce Vitamin B12 absorption. Your recent addition of B12 supplementation should be timed at least 2 hours apart from your Metformin dose. Current schedule shows both taken at 8:00 AM. Recommendation: Move B12 to 12:00 PM or take with lunch. Discuss with your provider at your next appointment.",
    timestamp: "2026-06-06T07:00:00Z",
    timeAgo: "1w ago",
    read: true,
    relatedData: {
      label: "Interaction Risk",
      value: "Moderate",
      context: "Metformin + Vitamin B12 timing",
    },
    actionLabel: "Review Protocol",
  },
  {
    id: "n13",
    type: "protocol",
    priority: "action",
    title: "Protocol adherence dropped below 80%",
    message:
      "Your overall protocol adherence has fallen to 76% this week. Several tasks were missed.",
    detail:
      "Protocol adherence alert: Your weekly adherence dropped to 76%, below the 80% minimum target. Missed items this week: 3 morning supplement doses, 2 evening meditation sessions, 1 fasting window was broken early. Most missed items occurred on Tuesday and Wednesday. Consider setting additional reminders or adjusting your protocol schedule.",
    timestamp: "2026-05-30T08:00:00Z",
    timeAgo: "2w ago",
    read: true,
    relatedData: {
      label: "Adherence",
      value: "76%",
      context: "Target: 80% minimum",
    },
    actionLabel: "Review Protocol",
  },
  {
    id: "n14",
    type: "exercise",
    priority: "info",
    title: "New exercise plan from Coach Walid",
    message:
      "Coach Walid has created a new 4-week resistance training program tailored to your DEXA results.",
    detail:
      "Coach Walid has designed a new resistance training program based on your recent DEXA scan results. The 4-week program focuses on upper body hypertrophy to address the lean mass asymmetry noted in your scan. Sessions: 4x/week, 45-60 minutes. Equipment: gym required. The plan has been added to your Protocols.",
    timestamp: "2026-05-30T06:00:00Z",
    timeAgo: "2w ago",
    read: true,
    actionLabel: "Review Protocol",
  },
  {
    id: "n15",
    type: "biome",
    priority: "info",
    title: "Gut biome results available",
    message:
      "Your gut microbiome analysis from Viome has been processed and integrated into your health profile.",
    detail:
      "Gut Microbiome Analysis (Viome): Overall gut health score: 72/100. Microbial diversity: Good (top 35th percentile). Key findings: Elevated Firmicutes-to-Bacteroidetes ratio (2.8:1, optimal <2:1), low Akkermansia muciniphila levels. Recommendations: Increase polyphenol-rich foods, consider prebiotic fiber supplementation, reduce processed food intake. Full report available in your health profile.",
    timestamp: "2026-05-30T05:00:00Z",
    timeAgo: "2w ago",
    read: true,
    relatedData: {
      label: "Gut Health Score",
      value: "72/100",
      context: "Diversity: Good (35th percentile)",
    },
    actionLabel: "View Labs",
  },
];
