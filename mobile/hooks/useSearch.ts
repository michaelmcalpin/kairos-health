/**
 * useSearch — Custom hooks for the global search feature.
 *
 * Tries to fetch search results from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - search.global         -> search across all data types
 *   - search.recentSearches -> stored recent searches
 */

// No backend search router exists — client-side navigational search across app features

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SearchCategory =
  | "health_data"
  | "protocols"
  | "appointments"
  | "labs"
  | "documents"
  | "insights";

export type SearchFilterChip =
  | "all"
  | "health_data"
  | "protocols"
  | "appointments"
  | "labs"
  | "documents";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  categoryLabel: string;
  icon: string;
  route?: string;
}

export interface SearchResultGroup {
  category: SearchCategory;
  categoryLabel: string;
  results: SearchResult[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Navigational Catalog — searchable app features and screens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const APP_CATALOG: SearchResult[] = [
  // Health Data
  { id: "nav-glucose", title: "Blood Glucose", subtitle: "View glucose readings and trends", category: "health_data", categoryLabel: "Health Data", icon: "droplets", route: "/health/glucose" },
  { id: "nav-bp", title: "Blood Pressure", subtitle: "View blood pressure readings", category: "health_data", categoryLabel: "Health Data", icon: "heart", route: "/health/blood-pressure" },
  { id: "nav-sleep", title: "Sleep", subtitle: "View sleep scores and patterns", category: "health_data", categoryLabel: "Health Data", icon: "moon", route: "/health/sleep" },
  { id: "nav-body", title: "Body Composition", subtitle: "Weight, body fat, and measurements", category: "health_data", categoryLabel: "Health Data", icon: "activity", route: "/health/body" },
  { id: "nav-goals", title: "Health Goals", subtitle: "Track and manage your health goals", category: "health_data", categoryLabel: "Health Data", icon: "activity", route: "/health/goals" },

  // Protocols
  { id: "nav-supplements", title: "Supplements", subtitle: "View your supplement protocol", category: "protocols", categoryLabel: "Protocol", icon: "pill", route: "/protocols/supplements" },
  { id: "nav-medications", title: "Medications", subtitle: "View medication information", category: "protocols", categoryLabel: "Protocol", icon: "pill", route: "/protocols/medications" },
  { id: "nav-workouts", title: "Workouts", subtitle: "View workout program and exercises", category: "protocols", categoryLabel: "Protocol", icon: "dumbbell", route: "/protocols/workouts" },
  { id: "nav-meals", title: "Meal Plan", subtitle: "View weekly meal plan", category: "protocols", categoryLabel: "Protocol", icon: "activity", route: "/protocols/meals" },
  { id: "nav-fasting", title: "Fasting", subtitle: "Fasting schedule and tracker", category: "protocols", categoryLabel: "Protocol", icon: "activity", route: "/protocols/fasting" },
  { id: "nav-peptides", title: "Peptides", subtitle: "View peptide protocol", category: "protocols", categoryLabel: "Protocol", icon: "pill", route: "/protocols/peptides" },
  { id: "nav-shopping", title: "Shopping List", subtitle: "Grocery list for meal plan", category: "protocols", categoryLabel: "Protocol", icon: "activity", route: "/protocols/shopping-list" },

  // Appointments
  { id: "nav-appointments", title: "Appointments", subtitle: "View and manage appointments", category: "appointments", categoryLabel: "Appointment", icon: "calendar", route: "/appointments" },
  { id: "nav-book", title: "Book Appointment", subtitle: "Schedule a new appointment", category: "appointments", categoryLabel: "Appointment", icon: "calendar", route: "/appointments/book" },
  { id: "nav-coach", title: "Coach", subtitle: "Connect with your health coach", category: "appointments", categoryLabel: "Appointment", icon: "activity", route: "/coach" },

  // Labs & Clinical
  { id: "nav-labs", title: "Lab Results", subtitle: "View blood work and lab panels", category: "labs", categoryLabel: "Lab Result", icon: "flask-conical", route: "/clinical/labs" },
  { id: "nav-dexa", title: "DEXA Scan", subtitle: "Body composition scan results", category: "labs", categoryLabel: "Lab Result", icon: "activity", route: "/clinical/dexa" },
  { id: "nav-genetics", title: "Genetics", subtitle: "Genetic test results and markers", category: "labs", categoryLabel: "Lab Result", icon: "flask-conical", route: "/clinical/genetics" },
  { id: "nav-gut", title: "Gut Biome", subtitle: "Gut microbiome analysis results", category: "labs", categoryLabel: "Lab Result", icon: "flask-conical", route: "/clinical/gut-biome" },
  { id: "nav-records", title: "Medical Records", subtitle: "Uploaded medical documents", category: "labs", categoryLabel: "Lab Result", icon: "file-text", route: "/clinical/medical-records" },

  // Insights
  { id: "nav-insights", title: "Health Insights", subtitle: "AI-generated health analysis", category: "insights", categoryLabel: "Insight", icon: "brain", route: "/insights" },
  { id: "nav-analyze", title: "Analyze Health Data", subtitle: "Run analysis on your data", category: "insights", categoryLabel: "Insight", icon: "brain", route: "/insights/analyze" },
  { id: "nav-ask", title: "Ask AI", subtitle: "Ask questions about your health", category: "insights", categoryLabel: "Insight", icon: "brain", route: "/insights/ask" },
  { id: "nav-report", title: "Health Report", subtitle: "View detailed health reports", category: "insights", categoryLabel: "Insight", icon: "file-text", route: "/insights/report" },
  { id: "nav-export", title: "Export Health Data", subtitle: "Generate and share reports", category: "insights", categoryLabel: "Insight", icon: "file-text", route: "/insights/export" },

  // Documents / Settings
  { id: "nav-devices", title: "Connected Devices", subtitle: "Manage wearables and integrations", category: "documents", categoryLabel: "Settings", icon: "activity", route: "/devices" },
  { id: "nav-profile", title: "Profile & Settings", subtitle: "Account, preferences, and privacy", category: "documents", categoryLabel: "Settings", icon: "activity", route: "/(tabs)/profile" },
  { id: "nav-notifications", title: "Notifications", subtitle: "View recent notifications", category: "documents", categoryLabel: "Settings", icon: "activity", route: "/notifications" },
  { id: "nav-data-entry", title: "Log Health Data", subtitle: "Manual data entry and check-ins", category: "documents", categoryLabel: "Settings", icon: "activity", route: "/data-entry" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useGlobalSearch — search across all data types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useGlobalSearch(
  query: string,
  filters: SearchFilterChip[] = ["all"],
) {
  const trimmedQuery = query.trim().toLowerCase();
  const isEnabled = trimmedQuery.length >= 2;

  // Backend does not have clientPortal.search — use client-side sample data
  let results: SearchResult[] = [];

  if (isEnabled) {
    results = getSampleResults(trimmedQuery);
  }

  // Apply client-side filter if not "all"
  const activeFilter = filters.length === 1 && filters[0] === "all" ? null : filters;
  const filteredResults = activeFilter
    ? results.filter((r) =>
        activeFilter.includes(r.category as SearchFilterChip),
      )
    : results;

  // Group results by category
  const grouped = groupResults(filteredResults);

  return {
    results: filteredResults,
    grouped,
    isLoading: false,
    isSearching: isEnabled,
    error: null,
    refetch: async () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useRecentSearches — stored recent searches
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useRecentSearches() {
  // Backend does not have clientPortal.search — return empty array
  return {
    searches: [] as string[],
    isLoading: false,
    error: null,
    refetch: async () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSampleResults(query: string): SearchResult[] {
  // Search across the entire app catalog by title, subtitle, and category
  return APP_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      item.categoryLabel.toLowerCase().includes(query),
  );
}

function groupResults(results: SearchResult[]): SearchResultGroup[] {
  const groups = new Map<SearchCategory, SearchResult[]>();

  for (const result of results) {
    const existing = groups.get(result.category) ?? [];
    existing.push(result);
    groups.set(result.category, existing);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    categoryLabel: items[0]?.categoryLabel ?? category,
    results: items,
  }));
}

function mapApiSearchResult(raw: any): SearchResult {
  return {
    id: raw.id,
    title: raw.title ?? "",
    subtitle: raw.subtitle ?? raw.description ?? "",
    category: raw.category ?? "health_data",
    categoryLabel: raw.categoryLabel ?? raw.category ?? "",
    icon: raw.icon ?? "circle",
    route: raw.route ?? undefined,
  };
}
