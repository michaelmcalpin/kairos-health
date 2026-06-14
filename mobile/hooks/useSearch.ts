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

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

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
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_SEARCH_RESULTS: Record<string, SearchResult[]> = {
  glucose: [
    {
      id: "sr-1",
      title: "Blood Glucose",
      subtitle: "Current: 92 mg/dL",
      category: "health_data",
      categoryLabel: "Health Data",
      icon: "droplets",
      route: "/health/glucose",
    },
    {
      id: "sr-2",
      title: "Metformin 500mg",
      subtitle: "Morning protocol",
      category: "protocols",
      categoryLabel: "Protocol",
      icon: "pill",
      route: "/protocols",
    },
    {
      id: "sr-3",
      title: "HbA1c",
      subtitle: "5.4% (Nov 2024)",
      category: "labs",
      categoryLabel: "Lab Result",
      icon: "flask-conical",
      route: "/clinical/labs",
    },
    {
      id: "sr-4",
      title: "Glucose Variability Report",
      subtitle: "Generated Dec 2024",
      category: "insights",
      categoryLabel: "Insight",
      icon: "brain",
      route: "/insights",
    },
    {
      id: "sr-5",
      title: "Lab Review with Dr. Chen",
      subtitle: "Jan 15",
      category: "appointments",
      categoryLabel: "Appointment",
      icon: "calendar",
      route: "/appointments",
    },
  ],
  sleep: [
    {
      id: "sr-6",
      title: "Sleep Score",
      subtitle: "Current: 72 — Down 12% this week",
      category: "health_data",
      categoryLabel: "Health Data",
      icon: "moon",
      route: "/health/sleep",
    },
    {
      id: "sr-7",
      title: "Magnesium Glycinate 400mg",
      subtitle: "Bedtime protocol",
      category: "protocols",
      categoryLabel: "Protocol",
      icon: "pill",
      route: "/protocols",
    },
    {
      id: "sr-8",
      title: "Sleep Architecture Analysis",
      subtitle: "Generated Jun 2026",
      category: "insights",
      categoryLabel: "Insight",
      icon: "brain",
      route: "/insights",
    },
  ],
  blood: [
    {
      id: "sr-9",
      title: "Blood Pressure",
      subtitle: "Current: 118/76 mmHg",
      category: "health_data",
      categoryLabel: "Health Data",
      icon: "heart",
      route: "/health/blood-pressure",
    },
    {
      id: "sr-10",
      title: "Blood Glucose",
      subtitle: "Current: 92 mg/dL",
      category: "health_data",
      categoryLabel: "Health Data",
      icon: "droplets",
      route: "/health/glucose",
    },
    {
      id: "sr-11",
      title: "Complete Blood Count",
      subtitle: "All markers normal (May 2026)",
      category: "labs",
      categoryLabel: "Lab Result",
      icon: "flask-conical",
      route: "/clinical/labs",
    },
    {
      id: "sr-12",
      title: "Blood Panel Review",
      subtitle: "Dr. Chen — Jun 15, 9:00 AM",
      category: "appointments",
      categoryLabel: "Appointment",
      icon: "calendar",
      route: "/appointments",
    },
  ],
  vitamin: [
    {
      id: "sr-13",
      title: "Vitamin D3 5,000 IU",
      subtitle: "Morning protocol",
      category: "protocols",
      categoryLabel: "Protocol",
      icon: "pill",
      route: "/protocols",
    },
    {
      id: "sr-14",
      title: "Vitamin D Level",
      subtitle: "22 ng/mL — Below optimal",
      category: "labs",
      categoryLabel: "Lab Result",
      icon: "flask-conical",
      route: "/clinical/labs",
    },
    {
      id: "sr-15",
      title: "Vitamin B12",
      subtitle: "680 pg/mL — Normal range",
      category: "labs",
      categoryLabel: "Lab Result",
      icon: "flask-conical",
      route: "/clinical/labs",
    },
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useGlobalSearch — search across all data types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useGlobalSearch(
  query: string,
  filters: SearchFilterChip[] = ["all"],
) {
  const trimmedQuery = query.trim().toLowerCase();
  const isEnabled = trimmedQuery.length >= 2;

  const trpcQuery = trpc.clientPortal.search.global.useQuery(
    { query: trimmedQuery, filters },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && isEnabled,
    },
  );

  // Use sample data in dev fallback mode
  let results: SearchResult[] = [];

  if (trpcQuery.data) {
    results = (trpcQuery.data as any[]).map(mapApiSearchResult);
  } else if (isEnabled) {
    // Search sample data by matching query against known keys
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
    isLoading: trpcQuery.isLoading && isEnabled,
    isSearching: isEnabled,
    error: trpcQuery.error,
    refetch: trpcQuery.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useRecentSearches — stored recent searches
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useRecentSearches() {
  const query = trpc.clientPortal.search.recentSearches.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const searches: string[] = query.data
    ? (query.data as string[])
    : [];

  return {
    searches,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSampleResults(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const [key, items] of Object.entries(SAMPLE_SEARCH_RESULTS)) {
    if (key.includes(query) || query.includes(key)) {
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          results.push(item);
        }
      }
    }
  }

  // Also search by title/subtitle across all results
  if (results.length === 0) {
    for (const items of Object.values(SAMPLE_SEARCH_RESULTS)) {
      for (const item of items) {
        if (
          !seen.has(item.id) &&
          (item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query))
        ) {
          seen.add(item.id);
          results.push(item);
        }
      }
    }
  }

  return results;
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
