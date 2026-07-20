/**
 * EVERIST Timezone Utilities
 *
 * Coach availability times are stored as wall-clock strings ("09:00")
 * in the COACH's IANA timezone. These helpers convert them to UTC
 * instants so clients can see slots in their own local time.
 *
 * No external library — uses the standard Intl offset technique
 * (DST-correct for any IANA zone).
 */

/** Common timezone choices for the coach settings dropdown. */
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

/**
 * Interpret `dateStr` (YYYY-MM-DD) + `timeStr` (HH:mm) as wall-clock
 * time in `timeZone`, and return the corresponding UTC instant.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  // Start by pretending the wall-clock time is UTC
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);

  // What wall-clock time does that instant show in the target zone?
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(naive)) parts[p.type] = p.value;
  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  // offset = zone wall time − actual instant; correct by subtracting it
  const offsetMs = shownAsUtc - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}

/** Human label for a timezone, e.g. "Eastern Time (ET)" or the raw id. */
export function timezoneLabel(tz: string | null | undefined): string {
  if (!tz) return "coach's local time";
  return COMMON_TIMEZONES.find((t) => t.value === tz)?.label ?? tz.replace(/_/g, " ");
}
