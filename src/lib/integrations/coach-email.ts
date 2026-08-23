/**
 * EVERIST Coach Email Helper
 *
 * A single entry point for client-facing, coach-originated emails (booking
 * confirmations, protocol-change alerts). These are delivered via the app's
 * system email sender.
 *
 * NOTE: "Send as the coach's own mailbox" (Gmail/Outlook) is intentionally NOT
 * enabled — the calendar integrations request calendar-only scopes and do not
 * ask for mail-send permission (which would require heavy provider
 * verification). The `db`/`coachId` params are kept so send-as-coach can be
 * reintroduced later without changing callers.
 *
 * This helper NEVER throws: callers can fire it best-effort.
 */

import type { Database } from "@/server/db";
import { sendEmail } from "@/lib/email/sender";

export interface CoachEmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  icsContent?: string;
  icsFilename?: string;
  fromName?: string;
}

export interface CoachEmailResult {
  via: "system" | "failed";
}

/**
 * Send a client-facing, coach-originated email via the system sender.
 * Best-effort — never throws.
 */
export async function sendCoachEmail(
  _db: Database,
  _coachId: string,
  msg: CoachEmailMessage,
): Promise<CoachEmailResult> {
  try {
    const result = await sendEmail({
      to: msg.to,
      subject: msg.subject,
      html: msg.html ?? msg.text ?? "",
      ...(msg.icsContent
        ? {
            attachments: [
              {
                filename: msg.icsFilename ?? "invite.ics",
                content: msg.icsContent,
                contentType: "text/calendar",
              },
            ],
          }
        : {}),
    });
    return { via: result.success ? "system" : "failed" };
  } catch (err) {
    console.error("[CoachEmail] System email failed (non-fatal):", err);
    return { via: "failed" };
  }
}
