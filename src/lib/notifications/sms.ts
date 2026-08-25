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
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  const sender = process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
  // Auth can be an API Key (SK sid + secret — recommended) OR the Account Auth
  // Token. The Account SID is always required (it's the REST URL path).
  const hasAuth = Boolean((keySid && keySecret) || token);
  return Boolean(sid && hasAuth && sender);
}

/**
 * Non-secret diagnostics about the Twilio credentials as the RUNNING deployment
 * sees them — used by the "Send test SMS" self-test to pinpoint a 401. Never
 * returns the actual SID/token values, only presence/shape.
 */
export function smsConfigDiagnostics() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const keySid = process.env.TWILIO_API_KEY_SID?.trim();
  const keySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const usingApiKey = Boolean(keySid && keySecret);
  return {
    sidPresent: Boolean(sid),
    sidStartsWithAC: sid?.startsWith("AC") ?? false,
    sidLen: sid?.length ?? 0, // expect 34
    authMode: usingApiKey ? ("apikey" as const) : ("authtoken" as const),
    keySidStartsWithSK: keySid?.startsWith("SK") ?? false,
    keySidLen: keySid?.length ?? 0, // expect 34
    keySecretLen: keySecret?.length ?? 0, // expect 32
    tokenPresent: Boolean(token),
    tokenLen: token?.length ?? 0, // expect 32
    senderPresent: Boolean(from || msgSvc),
    from: from ?? null,
  };
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
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  // Prefer an API Key (SK sid + secret) when present — Twilio's recommended
  // auth. Fall back to the Account Auth Token. The Account SID is always the
  // REST URL path, regardless of which credential authenticates the request.
  const useApiKey = Boolean(apiKeySid && apiKeySecret);
  const authUser = useApiKey ? apiKeySid : sid;
  const authPass = useApiKey ? apiKeySecret : token;

  if (!sid || !authUser || !authPass || (!fromNumber && !messagingServiceSid)) {
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

    const auth = Buffer.from(`${authUser}:${authPass}`).toString("base64");
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
    // Surface Twilio's own code/message so misconfig (e.g. 20003 auth error) is
    // diagnosable from the client without exposing secrets.
    let detail = "";
    try {
      const parsed = JSON.parse(errorBody) as { code?: number; message?: string };
      if (parsed.code || parsed.message) detail = ` (${parsed.code ?? ""} ${parsed.message ?? ""})`.trimEnd();
    } catch { /* non-JSON body */ }
    return { success: false, error: `Twilio responded ${res.status}${detail}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("notifications", "Twilio SMS send error", { error: message });
    return { success: false, error: message };
  }
}
