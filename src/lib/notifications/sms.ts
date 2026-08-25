/**
 * EVERIST SMS Delivery (Twilio)
 *
 * Thin wrapper around the Twilio Messages REST API using global fetch.
 * Env-gated: if the required Twilio credentials are not configured, sends
 * are skipped (see `isSmsConfigured`).
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID          — Twilio Account SID (required)
 *   TWILIO_AUTH_TOKEN           — Twilio Auth Token (required)
 *   TWILIO_FROM_NUMBER          — E.164 sender number (required unless a
 *                                 messaging service SID is set)
 *   TWILIO_MESSAGING_SERVICE_SID — Messaging Service SID (alternative to
 *                                 TWILIO_FROM_NUMBER)
 */

import { logger } from "@/lib/middleware/logger";

export interface SendSmsResult {
  success: boolean;
  error?: string;
}

/** True when all Twilio credentials required to send are present. */
export function isSmsConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
  return Boolean(sid && token && sender);
}

/** Basic E.164 guard — must start with "+" followed by 7-15 digits. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

/**
 * Send an SMS via Twilio. Non-throwing — always resolves to a result.
 * Returns { success: false } (without attempting a send) if Twilio is not
 * configured or the destination number is not a valid E.164 number.
 */
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  // Trim to defend against trailing spaces / newlines pasted into env vars,
  // which produce a Twilio 401 (auth rejected).
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!sid || !token || (!fromNumber && !messagingServiceSid)) {
    return { success: false, error: "Twilio not configured" };
  }

  if (!isValidE164(to)) {
    return { success: false, error: "Invalid E.164 phone number" };
  }

  try {
    const body = new URLSearchParams();
    body.set("To", to.trim());
    if (messagingServiceSid) {
      body.set("MessagingServiceSid", messagingServiceSid);
    } else if (fromNumber) {
      body.set("From", fromNumber);
    }
    body.set("Body", message.slice(0, 600));

    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (res.ok) {
      return { success: true };
    }

    const errorBody = await res.text().catch(() => "");
    logger.error("notifications", "Twilio SMS send failed", { status: res.status, error: errorBody });
    return { success: false, error: `Twilio responded ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("notifications", "Twilio SMS send error", { error: message });
    return { success: false, error: message };
  }
}
