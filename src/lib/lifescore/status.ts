/**
 * Coach-facing client status from LifeScore.
 *
 *   Critical          Core < 50, Physical < 45, Mental < 40, 4+ open alerts,
 *                     or Physical and Mental both trending down.
 *   Needs attention   Core < 65, Physical < 60, Mental < 55, 2+ open alerts,
 *                     or either side trending down.
 *   Stable            otherwise.
 *   Insufficient data no scores yet (unless alerts alone make it critical/attention).
 *
 * The reason is one short line the coach can act on. Mental reasons stay
 * general ("Mental trending down") — coaches never see what a client wrote.
 */

export type ClientStatus = "stable" | "attention" | "critical";

export interface StatusInput {
  core: number | null;
  physical: number | null;
  mental: number | null;
  physicalSentiment: string;
  mentalSentiment: string;
  activeAlerts: number;
  /** Lowest-scoring physical measures, lowest first. */
  focus: Array<{ label: string; score: number }>;
}

export interface StatusResult {
  status: ClientStatus | "insufficient_data";
  reason: string;
  /** Core trend for the list arrow. */
  trend: "up" | "down" | "flat";
}

const alertsLine = (n: number) => `${n} open alert${n === 1 ? "" : "s"}`;

export function deriveLifeScoreStatus(i: StatusInput): StatusResult {
  const pDown = i.physicalSentiment === "struggling";
  const mDown = i.mentalSentiment === "struggling";
  const trend: StatusResult["trend"] =
    pDown || mDown ? "down" : i.physicalSentiment === "well" || i.mentalSentiment === "well" ? "up" : "flat";
  const worstFocus = i.focus[0];
  const physicalReason = worstFocus ? `${worstFocus.label} low (${worstFocus.score}/100)` : `Physical ${i.physical}`;

  if (i.core == null && i.physical == null && i.mental == null) {
    if (i.activeAlerts >= 4) return { status: "critical", reason: alertsLine(i.activeAlerts), trend };
    if (i.activeAlerts >= 2) return { status: "attention", reason: alertsLine(i.activeAlerts), trend };
    return { status: "insufficient_data", reason: "No scores yet", trend };
  }

  // Critical, most specific reason first.
  if (i.activeAlerts >= 4) return { status: "critical", reason: alertsLine(i.activeAlerts), trend };
  if (pDown && mDown) return { status: "critical", reason: "Physical and Mental both trending down", trend };
  if (i.physical != null && i.physical < 45) return { status: "critical", reason: physicalReason, trend };
  if (i.mental != null && i.mental < 40) return { status: "critical", reason: `Mental ${i.mental}/100`, trend };
  if (i.core != null && i.core < 50) return { status: "critical", reason: `LifeScore ${i.core}/100`, trend };

  // Needs attention.
  if (i.activeAlerts >= 2) return { status: "attention", reason: alertsLine(i.activeAlerts), trend };
  if (pDown) return { status: "attention", reason: worstFocus ? `Physical trending down · ${physicalReason}` : "Physical trending down", trend };
  if (mDown) return { status: "attention", reason: "Mental trending down", trend };
  if (i.physical != null && i.physical < 60) return { status: "attention", reason: physicalReason, trend };
  if (i.mental != null && i.mental < 55) return { status: "attention", reason: `Mental ${i.mental}/100`, trend };
  if (i.core != null && i.core < 65) return { status: "attention", reason: `LifeScore ${i.core}/100`, trend };

  const good = i.physicalSentiment === "well" || i.mentalSentiment === "well";
  return { status: "stable", reason: good ? "Trending up" : i.activeAlerts ? alertsLine(i.activeAlerts) : "On track", trend };
}
