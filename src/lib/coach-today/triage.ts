/**
 * Coach "Today" triage: which clients need the coach, in what order, and
 * the one thing to do for each. Status and reason come from the LifeScore
 * status rules (src/lib/lifescore/status.ts); this file only ranks and picks
 * the action. Pure, so it's unit-tested.
 */

export type TriageStatus = "critical" | "attention";

export interface TriageCandidate {
  id: string;
  name: string;
  initials: string;
  /** Core LifeScore 0–100, null when not scored yet. */
  core: number | null;
  status: "critical" | "attention" | "stable" | "insufficient_data";
  reason: string;
  trend: "up" | "down" | "flat";
  /** Open (New or Acknowledged) health alerts — booking notices excluded. */
  openAlerts: number;
  /** Conversation waiting on the coach's reply, if any. */
  waiting?: { conversationId: string; hours: number } | null;
}

export interface TriageAction {
  kind: "message" | "alert" | "open";
  label: string;
  href: string;
}

export interface TriageRow extends Omit<TriageCandidate, "status"> {
  status: TriageStatus;
  action: TriageAction;
}

/**
 * One primary action per client:
 *   1. They're waiting on a reply → Reply.
 *   2. Open health alerts → Review alerts (Inbox filtered to the client).
 *   3. Otherwise → Open client.
 */
export function primaryAction(c: Pick<TriageCandidate, "id" | "openAlerts" | "waiting">): TriageAction {
  if (c.waiting) {
    return { kind: "message", label: "Reply", href: `/trainer/messages?conversationId=${c.waiting.conversationId}` };
  }
  if (c.openAlerts > 0) {
    return {
      kind: "alert",
      label: c.openAlerts === 1 ? "Review alert" : "Review alerts",
      href: `/trainer/inbox?category=health&client=${c.id}`,
    };
  }
  return { kind: "open", label: "Open client", href: `/trainer/clients/${c.id}` };
}

const RANK: Record<TriageStatus, number> = { critical: 0, attention: 1 };

/**
 * Only clients who need action (critical, then needs attention). Within a
 * group: more open alerts first, then lower LifeScore (unscored last), then
 * longest-waiting message, then name.
 */
export function rankTriage(clients: TriageCandidate[]): TriageRow[] {
  return clients
    .filter((c): c is TriageCandidate & { status: TriageStatus } => c.status === "critical" || c.status === "attention")
    .sort((a, b) =>
      RANK[a.status] - RANK[b.status] ||
      b.openAlerts - a.openAlerts ||
      (a.core ?? 101) - (b.core ?? 101) ||
      (b.waiting?.hours ?? -1) - (a.waiting?.hours ?? -1) ||
      a.name.localeCompare(b.name),
    )
    .map((c) => ({ ...c, action: primaryAction(c) }));
}

export interface TodayTiles {
  critical: number;
  attention: number;
  unanswered: number;
  /** Hours the longest-waiting client has been waiting, null when none. */
  oldestWaitingHours: number | null;
  sessions: number;
}

export function buildTiles(
  triage: TriageRow[],
  waitingHours: number[],
  sessions: Array<{ status: string }>,
): TodayTiles {
  return {
    critical: triage.filter((t) => t.status === "critical").length,
    attention: triage.filter((t) => t.status === "attention").length,
    unanswered: waitingHours.length,
    oldestWaitingHours: waitingHours.length ? Math.max(...waitingHours) : null,
    sessions: sessions.filter((s) => s.status !== "cancelled").length,
  };
}
