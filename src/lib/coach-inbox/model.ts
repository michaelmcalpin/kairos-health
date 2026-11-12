/**
 * Coach Inbox — one list for everything that used to live in Alerts,
 * Follow-ups, Needs Attention and Awaiting Your Reply.
 *
 *   Severity   Urgent · Action · Info
 *   State      New → Acknowledged → Resolved
 *
 * Sources and how they map:
 *   alert       `alerts` row. priority → severity; status active → New,
 *               acknowledged → Acknowledged, resolved/dismissed → Resolved.
 *   scheduling  `alerts` row with type "scheduling" (booking notice). Always
 *               Info; auto-resolved by alert-hygiene once the date passes.
 *   hrv         HRV > 25% off the 14-day average (derived, no row).
 *   no_data     Connected device, nothing synced for 2+ days (derived).
 *   message     Last message in a conversation came from the client.
 *
 * Derived items (hrv, no_data, message) keep the coach's state in
 * `coach_inbox_states`, keyed so a new occurrence comes back as New
 * (a new day's HRV reading, a new sync, a new client message).
 *
 * Pure: no DB access, so the mapping and counting are unit-tested.
 */

export type InboxSeverity = "urgent" | "action" | "info";
export type InboxState = "new" | "acknowledged" | "resolved";
export type InboxKind = "alert" | "scheduling" | "hrv" | "no_data" | "message";
export type InboxCategory = "health" | "messages" | "sessions";

/** Length of the client-message preview shown in the Inbox. */
export const MESSAGE_PREVIEW_CHARS = 300;

export interface InboxItem {
  /** Stable id, also the key for state changes: "alert:<uuid>", "msg:<conv>:<msg>", … */
  key: string;
  kind: InboxKind;
  category: InboxCategory;
  severity: InboxSeverity;
  state: InboxState;
  clientId: string;
  clientName: string;
  title: string;
  detail: string | null;
  /** ISO time the item happened (alert created, reading taken, message sent). */
  timestamp: string;
  /** The one thing to do about it. */
  action: { label: string; href: string };
}

export const SEVERITIES: InboxSeverity[] = ["urgent", "action", "info"];
export const SEVERITY_LABEL: Record<InboxSeverity, string> = { urgent: "Urgent", action: "Action", info: "Info" };
export const STATE_LABEL: Record<InboxState, string> = { new: "New", acknowledged: "Acknowledged", resolved: "Resolved" };
export const CATEGORY_LABEL: Record<InboxCategory, string> = { health: "Health", messages: "Messages", sessions: "Sessions" };

const SEVERITY_RANK: Record<InboxSeverity, number> = { urgent: 0, action: 1, info: 2 };
const STATE_RANK: Record<InboxState, number> = { new: 0, acknowledged: 1, resolved: 2 };

// ─── Keys ────────────────────────────────────────────────────────

export const alertKey = (alertId: string) => `alert:${alertId}`;
/** One HRV item per client per reading day: tomorrow's deviation is New again. */
export const hrvKey = (clientId: string, readingDate: string) => `hrv:${clientId}:${readingDate}`;
/** Tied to the last sync: a sync followed by another gap is New again. */
export const noDataKey = (clientId: string, lastSyncIso: string | null) =>
  `no_data:${clientId}:${lastSyncIso ? lastSyncIso.slice(0, 10) : "never"}`;
/** Tied to the client's latest message: a new message is New again. */
export const messageKey = (conversationId: string, messageId: string) => `msg:${conversationId}:${messageId}`;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY_PATTERNS: Array<[InboxKind | "alert", RegExp]> = [
  ["alert", new RegExp(`^alert:(${UUID})$`, "i")],
  ["hrv", new RegExp(`^hrv:(${UUID}):(\\d{4}-\\d{2}-\\d{2})$`, "i")],
  ["no_data", new RegExp(`^no_data:(${UUID}):(\\d{4}-\\d{2}-\\d{2}|never)$`, "i")],
  ["message", new RegExp(`^msg:(${UUID}):(${UUID})$`, "i")],
];

export type ParsedKey =
  | { kind: "alert"; alertId: string }
  | { kind: "hrv" | "no_data"; clientId: string }
  | { kind: "message"; conversationId: string };

/** Validates a key from the client before any state change. */
export function parseInboxKey(key: string): ParsedKey | null {
  for (const [kind, re] of KEY_PATTERNS) {
    const m = re.exec(key);
    if (!m) continue;
    if (kind === "alert") return { kind: "alert", alertId: m[1] };
    if (kind === "message") return { kind: "message", conversationId: m[1] };
    return { kind: kind as "hrv" | "no_data", clientId: m[1] };
  }
  return null;
}

// ─── State ───────────────────────────────────────────────────────

export type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export function alertStatusToState(status: string): InboxState {
  if (status === "acknowledged") return "acknowledged";
  if (status === "resolved" || status === "dismissed") return "resolved";
  return "new";
}

export function stateToAlertStatus(state: InboxState): Exclude<AlertStatus, "dismissed"> {
  return state === "new" ? "active" : state;
}

/**
 * State for an alert row given a coach override (shared-access coaches keep
 * their own state instead of changing the client's alert). A resolved row is
 * resolved for everyone.
 */
export function resolveAlertState(status: string, override?: InboxState): InboxState {
  const fromRow = alertStatusToState(status);
  if (fromRow === "resolved") return "resolved";
  return override ?? fromRow;
}

// ─── Mapping ─────────────────────────────────────────────────────

/**
 * Alert types that come from mental-wellbeing signals. Coaches see that
 * something was flagged, never what the client wrote.
 */
const MENTAL_TYPE = /mood|mental|mind|journal|stress|anxi|depress|emotion|sentiment|wellbeing/i;
export const isMentalAlertType = (type: string) => MENTAL_TYPE.test(type);

const clientHref = (clientId: string) => `/trainer/clients/${clientId}`;

export interface AlertRow {
  id: string;
  clientId: string;
  type: string;
  priority: string;
  title: string;
  message: string | null;
  status: string;
  createdAt: Date | string;
}

export function mapAlert(a: AlertRow, clientName: string, override?: InboxState): InboxItem {
  const state = resolveAlertState(a.status, override);
  const ts = new Date(a.createdAt).toISOString();
  if (a.type === "scheduling") {
    // Booking notices are Info and never count as needing attention.
    return {
      key: alertKey(a.id), kind: "scheduling", category: "sessions", severity: "info", state,
      clientId: a.clientId, clientName, title: a.title, detail: a.message, timestamp: ts,
      action: { label: "Open schedule", href: "/trainer/schedule" },
    };
  }
  const mental = isMentalAlertType(a.type);
  const severity: InboxSeverity = a.priority === "urgent" || a.priority === "action" ? a.priority : "info";
  return {
    key: alertKey(a.id), kind: "alert", category: "health", severity, state,
    clientId: a.clientId, clientName,
    title: mental ? "Mental wellbeing flagged" : a.title,
    detail: mental ? "See the Mind section of their LifeScore." : a.message,
    timestamp: ts,
    action: { label: "Open client", href: clientHref(a.clientId) },
  };
}

export function mapHrv(
  s: { clientId: string; latestRmssd: number; avgRmssd: number; readingAt: Date | string },
  clientName: string,
  override?: InboxState,
): InboxItem | null {
  if (!(s.avgRmssd > 0)) return null;
  const deviation = ((s.latestRmssd - s.avgRmssd) / s.avgRmssd) * 100;
  if (Math.abs(deviation) <= 25) return null;
  const ts = new Date(s.readingAt).toISOString();
  return {
    key: hrvKey(s.clientId, ts.slice(0, 10)), kind: "hrv", category: "health",
    severity: Math.abs(deviation) > 40 ? "urgent" : "action",
    state: override ?? "new",
    clientId: s.clientId, clientName,
    title: `HRV ${Math.round(Math.abs(deviation))}% ${deviation < 0 ? "below" : "above"} 14-day average`,
    detail: `${Math.round(s.latestRmssd)} ms vs ${Math.round(s.avgRmssd)} ms average`,
    timestamp: ts,
    action: { label: "Open client", href: clientHref(s.clientId) },
  };
}

export function mapNoData(
  s: { clientId: string; lastSyncAt: Date | string | null },
  clientName: string,
  now: Date,
  override?: InboxState,
): InboxItem {
  const last = s.lastSyncAt ? new Date(s.lastSyncAt) : null;
  const days = last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : null;
  return {
    key: noDataKey(s.clientId, last ? last.toISOString() : null), kind: "no_data", category: "health",
    severity: "action", state: override ?? "new",
    clientId: s.clientId, clientName,
    title: "No device data for 2+ days",
    detail: days != null ? `Last sync ${days} day${days === 1 ? "" : "s"} ago` : "Device connected but never synced",
    timestamp: (last ?? now).toISOString(),
    action: { label: "Open client", href: clientHref(s.clientId) },
  };
}

export function waitingText(hours: number): string {
  if (hours < 1) return "Waiting under an hour";
  if (hours < 24) return `Waiting ${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  return `Waiting ${d} day${d === 1 ? "" : "s"}`;
}

export function mapMessage(
  m: { conversationId: string; messageId: string; clientId: string; body: string; sentAt: Date | string },
  clientName: string,
  now: Date,
  override?: InboxState,
): InboxItem {
  const sent = new Date(m.sentAt);
  const hours = Math.max(0, (now.getTime() - sent.getTime()) / 3_600_000);
  const body = (m.body ?? "").trim();
  return {
    key: messageKey(m.conversationId, m.messageId), kind: "message", category: "messages",
    severity: "action", state: override ?? "new",
    clientId: m.clientId, clientName,
    title: waitingText(hours),
    detail: body ? (body.length > MESSAGE_PREVIEW_CHARS ? `${body.slice(0, MESSAGE_PREVIEW_CHARS)}…` : body) : null,
    timestamp: sent.toISOString(),
    action: { label: "Reply", href: `/trainer/messages?conversationId=${m.conversationId}` },
  };
}

// ─── Sorting, filtering, counting ────────────────────────────────

/** Urgent first, then New before Acknowledged, then newest first. */
export function sortInbox(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    STATE_RANK[a.state] - STATE_RANK[b.state] ||
    b.timestamp.localeCompare(a.timestamp),
  );
}

export type StateFilter = "open" | InboxState | "all";
export const STATE_FILTERS: StateFilter[] = ["open", "new", "acknowledged", "resolved", "all"];

export interface InboxFilter {
  state: StateFilter;
  /** Empty = all categories. */
  categories: InboxCategory[];
  severity: InboxSeverity | "all";
  clientId?: string | null;
}

export const DEFAULT_FILTER: InboxFilter = { state: "open", categories: [], severity: "all", clientId: null };

const stateMatches = (s: InboxState, f: StateFilter) =>
  f === "all" ? true : f === "open" ? s !== "resolved" : s === f;

/** Everything except severity — the scope the header counts describe. */
function inScope(i: InboxItem, f: InboxFilter): boolean {
  return (
    stateMatches(i.state, f.state) &&
    (f.categories.length === 0 || f.categories.includes(i.category)) &&
    (!f.clientId || i.clientId === f.clientId)
  );
}

export function filterInbox(items: InboxItem[], f: InboxFilter): InboxItem[] {
  return sortInbox(items.filter((i) => inScope(i, f) && (f.severity === "all" || i.severity === f.severity)));
}

export interface InboxCounts { urgent: number; action: number; info: number; total: number }

/**
 * Header counts for the current scope. Selecting a severity tile shows exactly
 * that many rows; with no severity selected the list length equals `total`.
 */
export function countInbox(items: InboxItem[], f: InboxFilter): InboxCounts {
  const c: InboxCounts = { urgent: 0, action: 0, info: 0, total: 0 };
  for (const i of items) {
    if (!inScope(i, f)) continue;
    c[i.severity]++;
    c.total++;
  }
  return c;
}

// ─── URL <-> filter ──────────────────────────────────────────────

const CATEGORIES: InboxCategory[] = ["health", "messages", "sessions"];

export function parseInboxFilter(params: { get(name: string): string | null }): InboxFilter {
  const state = params.get("state");
  const severity = params.get("severity");
  const categories = (params.get("category") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is InboxCategory => (CATEGORIES as string[]).includes(s));
  return {
    state: (STATE_FILTERS as string[]).includes(state ?? "") ? (state as StateFilter) : "open",
    severity: (SEVERITIES as string[]).includes(severity ?? "") ? (severity as InboxSeverity) : "all",
    categories: Array.from(new Set(categories)),
    clientId: params.get("client") || null,
  };
}

export function inboxQuery(f: InboxFilter): string {
  const q = new URLSearchParams();
  if (f.state !== "open") q.set("state", f.state);
  if (f.severity !== "all") q.set("severity", f.severity);
  if (f.categories.length) q.set("category", f.categories.join(","));
  if (f.clientId) q.set("client", f.clientId);
  const s = q.toString();
  return s ? `?${s}` : "";
}
