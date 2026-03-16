/**
 * KAIROS Formatting Utilities
 *
 * Consistent number, currency, date, and health metric formatting
 * used across all three portals.
 */

// ─── Numbers ────────────────────────────────────────────────────────────────

/** Format number with commas: 12345 → "12,345" */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compact number: 1234 → "1.2K", 1234567 → "1.2M" */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/** Format percentage: 0.875 → "87.5%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format percentage (already in 0-100 range): 87.5 → "87.5%" */
export function formatPercentRaw(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Currency ───────────────────────────────────────────────────────────────

/** Format USD: 499 → "$499.00", 4788 → "$4,788.00" */
export function formatCurrency(amountDollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountDollars);
}

/** Format from cents: 49900 → "$499.00" */
export function formatCentsAsDollars(cents: number): string {
  return formatCurrency(cents / 100);
}

// ─── Dates & Times ──────────────────────────────────────────────────────────

/** Format date: "2024-03-15" → "Mar 15, 2024" */
export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format short date: "2024-03-15" → "Mar 15" */
export function formatDateShort(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format time: Date → "2:30 PM" */
export function formatTime(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Format datetime: Date → "Mar 15, 2024 2:30 PM" */
export function formatDateTime(dateStr: string | Date): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

/** Format relative time: Date → "5m ago", "2h ago", "3d ago" */
export function formatTimeAgo(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(d);
}

/** Format duration in minutes: 485 → "8h 5m" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** ISO date string: Date → "2024-03-15" */
export function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Health Metrics ─────────────────────────────────────────────────────────

/** Format glucose: 105 → "105 mg/dL" */
export function formatGlucose(value: number, unit: "mg/dL" | "mmol/L" = "mg/dL"): string {
  return `${Math.round(value)} ${unit}`;
}

/** Format heart rate: 72 → "72 bpm" */
export function formatHeartRate(bpm: number): string {
  return `${Math.round(bpm)} bpm`;
}

/** Format HRV: 45.3 → "45 ms" */
export function formatHRV(ms: number): string {
  return `${Math.round(ms)} ms`;
}

/** Format sleep score: 85 → "85/100" */
export function formatSleepScore(score: number): string {
  return `${Math.round(score)}/100`;
}

/** Format body weight: 185.5 → "185.5 lbs" */
export function formatWeight(value: number, unit: "lbs" | "kg" = "lbs"): string {
  return `${value.toFixed(1)} ${unit}`;
}

/** Format calories: 2150 → "2,150 kcal" */
export function formatCalories(value: number): string {
  return `${formatNumber(Math.round(value))} kcal`;
}

/** Format macros: 150 → "150g" */
export function formatMacro(grams: number): string {
  return `${Math.round(grams)}g`;
}

// ─── Text ───────────────────────────────────────────────────────────────────

/** Truncate text: "Hello World" → "Hello Wo..." */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/** Capitalize first letter: "hello" → "Hello" */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Title case: "hello world" → "Hello World" */
export function titleCase(text: string): string {
  return text.split(" ").map(capitalize).join(" ");
}

/** Pluralize: (5, "item") → "5 items", (1, "item") → "1 item" */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${formatNumber(count)} ${word}`;
}

/** Initials: "Sarah Chen" → "SC" */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}
