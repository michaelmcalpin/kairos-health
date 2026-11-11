/**
 * Client portal navigation — four destinations, Oura-style (audit H3):
 *
 *   Today          scores, today's plan, one insight
 *   Body           everything a device or a log measures
 *   Health record  clinical documents and reports
 *   Care           people, plan and wellbeing
 *
 * Devices, settings, payments and data import live in the profile menu
 * (CLIENT_ACCOUNT_LINKS), not the sidebar.
 *
 * Plain data (no JSX) so it can be unit-tested; Sidebar.tsx maps `icon` keys
 * to lucide icons.
 *
 * NOTE: the client layout hides "Cycle Tracker" by its label unless the
 * cycleTracker feature toggle is on — keep that label as-is.
 */

export type ClientNavIcon =
  | "today" | "sleep" | "activity" | "bp" | "glucose" | "body" | "nutrition" | "fasting" | "cycle"
  | "log" | "healthData" | "labs" | "genetics" | "dexa" | "gut" | "record" | "reports" | "photos"
  | "messages" | "careTeam" | "appointments" | "supplements" | "medications" | "peptides" | "goals" | "lifescore"
  | "devices" | "settings" | "payments" | "import";

export interface ClientNavEntry {
  label: string;
  href: string;
  section: ClientDestination;
  icon: ClientNavIcon;
}

export const CLIENT_DESTINATIONS = ["Today", "Body", "Health record", "Care"] as const;
export type ClientDestination = (typeof CLIENT_DESTINATIONS)[number];

export const CLIENT_NAV: ClientNavEntry[] = [
  // Today — a single destination, rendered as a plain link.
  { label: "Today", href: "/dashboard", section: "Today", icon: "today" },

  // Body
  { label: "Sleep & Recovery", href: "/sleep", section: "Body", icon: "sleep" },
  { label: "Activity & Workouts", href: "/workouts", section: "Body", icon: "activity" },
  { label: "Blood Pressure", href: "/blood-pressure", section: "Body", icon: "bp" },
  { label: "Glucose", href: "/glucose", section: "Body", icon: "glucose" },
  { label: "Body Comp", href: "/measurements", section: "Body", icon: "body" },
  { label: "Nutrition & Meals", href: "/nutrition", section: "Body", icon: "nutrition" },
  { label: "Fasting", href: "/fasting", section: "Body", icon: "fasting" },
  { label: "Cycle Tracker", href: "/cycle-tracker", section: "Body", icon: "cycle" },
  { label: "Log Data", href: "/checkin", section: "Body", icon: "log" },
  { label: "All Health Data", href: "/health-data", section: "Body", icon: "healthData" },

  // Health record
  { label: "Labs", href: "/labs", section: "Health record", icon: "labs" },
  { label: "Genetics", href: "/genetics", section: "Health record", icon: "genetics" },
  { label: "DEXA", href: "/dexascan", section: "Health record", icon: "dexa" },
  { label: "Gut Biome", href: "/gut-biome", section: "Health record", icon: "gut" },
  { label: "Medical Record", href: "/medical-record", section: "Health record", icon: "record" },
  { label: "Reports", href: "/insights", section: "Health record", icon: "reports" },
  { label: "Progress Photos", href: "/progress-photos", section: "Health record", icon: "photos" },

  // Care
  { label: "Messages", href: "/chat", section: "Care", icon: "messages" },
  { label: "Care Team", href: "/care-team", section: "Care", icon: "careTeam" },
  { label: "Appointments", href: "/appointments", section: "Care", icon: "appointments" },
  { label: "Supplements", href: "/supplements", section: "Care", icon: "supplements" },
  { label: "Medications", href: "/medications", section: "Care", icon: "medications" },
  { label: "Peptides", href: "/peptides", section: "Care", icon: "peptides" },
  { label: "Goals", href: "/goals", section: "Care", icon: "goals" },
  { label: "LifeScore Check-in", href: "/lifescore", section: "Care", icon: "lifescore" },
];

/** Profile-menu links (Clerk user button in the top bar). */
export const CLIENT_ACCOUNT_LINKS: Array<{ label: string; href: string; icon: ClientNavIcon }> = [
  { label: "Devices", href: "/settings?tab=integrations", icon: "devices" },
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Payments", href: "/payments", icon: "payments" },
  { label: "Import data", href: "/import", icon: "import" },
];

/**
 * Client routes that are deliberately NOT in the sidebar or profile menu, and
 * where they are reached from instead. Kept here so the route-coverage test
 * fails when someone adds a page without placing it.
 */
export const CLIENT_ROUTES_ELSEWHERE: Record<string, string> = {
  "/alerts": "Top bar health-alerts icon and notification bell",
  "/ai-reports": "Redirects to /insights (Reports)",
  "/meals": "Redirects to /nutrition",
  "/messages": "Redirects to /chat?tab=coach",
  "/peptide-calc": "Button on /peptides",
  "/onboarding": "Sign-up flow (RoleGuard / select-role)",
  "/marketplace": "Hidden until it has content (same as coach marketplace)",
};
