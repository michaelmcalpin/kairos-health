/**
 * EVERIST Send-As-Coach Email Helper
 *
 * A single entry point for client-facing, coach-originated emails. When the
 * coach has connected Google AND granted the gmail.send scope, the email is
 * sent FROM the coach's own Gmail (so it lands in the client's inbox as if the
 * coach sent it). Otherwise — not connected, missing scope, Google unconfigured,
 * or the Gmail send failing — it FALLS BACK to the app's system email sender so
 * nothing is ever silently dropped.
 *
 * This helper NEVER throws: callers can fire it best-effort.
 */

import { eq, and } from "drizzle-orm";
import type { Database } from "@/server/db";
import { calendarConnections } from "@/server/db/schema";
import { isGoogleConfigured, getValidAccessToken } from "./google-calendar";
import { sendGmail } from "./gmail";
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
  via: "gmail" | "system" | "failed";
}

/**
 * Send a client-facing email as the coach when possible, else via the system
 * sender. Returns which path delivered it. Best-effort — never throws.
 */
export async function sendCoachEmail(
  db: Database,
  coachId: string,
  msg: CoachEmailMessage,
): Promise<CoachEmailResult> {
  // ── Preferred path: send FROM the coach's own Gmail ──────────────────────
  try {
    if (isGoogleConfigured()) {
      const connection = await db.query.calendarConnections.findFirst({
        where: and(
          eq(calendarConnections.coachId, coachId),
          eq(calendarConnections.provider, "google"),
        ),
      });
      if (
        connection &&
        connection.status === "connected" &&
        connection.canSendEmail &&
        connection.googleEmail
      ) {
        const accessToken = await getValidAccessToken(db, connection);
        if (accessToken) {
          const result = await sendGmail(accessToken, {
            to: msg.to,
            subject: msg.subject,
            html: msg.html,
            text: msg.text,
            fromEmail: connection.googleEmail,
            fromName: msg.fromName,
            icsContent: msg.icsContent,
            icsFilename: msg.icsFilename,
          });
          if (result.success) return { via: "gmail" };
          // Fall through to the system sender on Gmail failure.
        }
      }
    }
  } catch (err) {
    console.error("[CoachEmail] Gmail send path failed (falling back):", err);
  }

  // ── Fallback: the app's system email sender ──────────────────────────────
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
    console.error("[CoachEmail] System email fallback failed (non-fatal):", err);
    return { via: "failed" };
  }
}
