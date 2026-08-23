/**
 * EVERIST Push Delivery (Expo)
 *
 * Sends push notifications through the Expo Push API using global fetch.
 * No server secret is required — delivery is gated purely on the presence
 * of registered Expo push tokens for the recipient.
 */

import { logger } from "@/lib/middleware/logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SendExpoPushResult {
  success: boolean;
  error?: string;
  /** Expo push tokens Expo reported as no longer registered (best-effort). */
  invalidTokens?: string[];
}

interface ExpoPushTicket {
  status?: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: { message?: string }[];
}

/**
 * Send a push notification to one or more Expo push tokens.
 * Non-throwing — always resolves to a result. Treats an HTTP 2xx response as
 * "sent" and surfaces any tokens Expo flags as DeviceNotRegistered so the
 * caller can prune them.
 */
export async function sendExpoPush(
  tokens: string[],
  message: ExpoPushMessage
): Promise<SendExpoPushResult> {
  if (tokens.length === 0) {
    return { success: false, error: "No push tokens" };
  }

  try {
    const messages = tokens.map((token) => ({
      to: token,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: "default" as const,
    }));

    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      logger.error("notifications", "Expo push send failed", { status: res.status, error: errorBody });
      return { success: false, error: `Expo responded ${res.status}` };
    }

    const json = (await res.json().catch(() => null)) as ExpoPushResponse | null;

    // Map error tickets back to their tokens (tickets are index-aligned).
    const invalidTokens: string[] = [];
    if (json?.data) {
      json.data.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const token = tokens[i];
          if (token) invalidTokens.push(token);
        }
      });
    }

    return { success: true, invalidTokens: invalidTokens.length > 0 ? invalidTokens : undefined };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("notifications", "Expo push send error", { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}
