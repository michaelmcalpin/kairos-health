/**
 * AI health reports — mobile client for the same /api/reports/generate endpoint
 * the web dashboard uses. Generation is an LLM call (15–30s), so we use a long
 * timeout and attach the Clerk bearer token (mobile has no cookies).
 */

import { API_URL } from "./constants";

export type ReportTypeId =
  | "health_age"
  | "comprehensive"
  | "metabolic"
  | "recovery"
  | "genetic_protocol";

export interface ReportTypeDef {
  id: ReportTypeId;
  title: string;
  description: string;
  /** lucide-react-native icon name resolved in the UI. */
  icon: "clock" | "file" | "droplets" | "moon" | "dna";
}

/** The five report types, mirroring the web dashboard. */
export const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: "health_age",
    title: "Health Age Assessment",
    description: "Your biological vs. chronological age across key health domains.",
    icon: "clock",
  },
  {
    id: "comprehensive",
    title: "Comprehensive Summary",
    description: "Full analysis of every health domain and cross-domain patterns.",
    icon: "file",
  },
  {
    id: "metabolic",
    title: "Metabolic & Glucose",
    description: "Glucose control, body composition, and metabolic biomarkers.",
    icon: "droplets",
  },
  {
    id: "recovery",
    title: "Recovery & Performance",
    description: "Sleep, HRV, stress, and training readiness.",
    icon: "moon",
  },
  {
    id: "genetic_protocol",
    title: "Genetic Risk & Protocol",
    description: "Your genetics cross-referenced against your current protocol.",
    icon: "dna",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportData = Record<string, any>;

/**
 * Generate a report on the server. Returns the structured report JSON.
 * Throws an Error with a user-friendly message on failure.
 */
export async function generateReport(
  reportType: ReportTypeId,
  getToken: () => Promise<string | null>,
): Promise<ReportData> {
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // AI can take 15–30s+

  try {
    const res = await fetch(`${API_URL}/api/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ reportType }),
      signal: controller.signal,
    });

    let body: { report?: ReportData; error?: string } = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON response
    }

    if (!res.ok || !body.report) {
      throw new Error(body.error || "Failed to generate report. Please try again.");
    }
    return body.report;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Report generation timed out. Please try again.");
    }
    throw err instanceof Error ? err : new Error("Failed to generate report.");
  } finally {
    clearTimeout(timeout);
  }
}
