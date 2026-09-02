/**
 * Hume AI (EVI) webhook receiver.
 *
 * Receives real-time EVI Chat events (chat_started, chat_ended, tool_call) and
 * verifies their authenticity per Hume's spec:
 *   https://dev.hume.ai/docs/speech-to-speech-evi/configuration/webhooks
 *
 * Each request carries:
 *   X-Hume-AI-Webhook-Signature  — HMAC-SHA256 of `${rawBody}.${timestamp}`
 *   X-Hume-AI-Webhook-Timestamp  — Unix timestamp (seconds)
 * signed with the per-account webhook signing key (HUME_WEBHOOK_SIGNING_KEY).
 *
 * To start receiving events, point an EVI Config's `webhooks.url` at:
 *   https://<APP_URL>/api/webhooks/hume
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/middleware/logger";

// Reject requests whose timestamp is older than this (replay protection).
const TIMESTAMP_WINDOW_SECONDS = 180;

type HumeWebhookEvent = {
  event_name: "chat_started" | "chat_ended" | "tool_call" | string;
  chat_group_id?: string;
  chat_id?: string;
  config_id?: string;
  caller_number?: string | null;
  custom_session_id?: string | null;
  [key: string]: unknown;
};

/** Verify the HMAC signature + timestamp. Returns an error string, or null when valid. */
function verify(rawBody: string, signature: string | null, timestamp: string | null): string | null {
  const signingKey = env.HUME_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return "HUME_WEBHOOK_SIGNING_KEY is not configured";
  if (!signature) return "Missing signature header";
  if (!timestamp) return "Missing timestamp header";

  // Signature: HMAC-SHA256(`${payload}.${timestamp}`)
  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${rawBody}.${timestamp}`)
    .digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return "Invalid signature";
  }

  // Replay protection: timestamp must be recent.
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return "Invalid timestamp";
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > TIMESTAMP_WINDOW_SECONDS) return "Timestamp too old";

  return null;
}

export async function POST(req: Request) {
  // Raw body is required for a byte-exact HMAC — do not JSON.parse first.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hume-ai-webhook-signature");
  const timestamp = req.headers.get("x-hume-ai-webhook-timestamp");

  const err = verify(rawBody, signature, timestamp);
  if (err) {
    logger.warn("hume-webhook", "Rejected webhook", { error: err });
    return NextResponse.json({ error: err }, { status: 401 });
  }

  let event: HumeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as HumeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    switch (event.event_name) {
      case "chat_started":
        logger.info("hume-webhook", "chat_started", { chatId: event.chat_id, configId: event.config_id });
        // TODO(hume-evi): begin a session record when the product needs it.
        break;
      case "chat_ended":
        logger.info("hume-webhook", "chat_ended", {
          chatId: event.chat_id,
          durationSeconds: event.duration_seconds,
          endReason: event.end_reason,
        });
        // TODO(hume-evi): persist session summary / fetch transcript when needed.
        break;
      case "tool_call":
        logger.info("hume-webhook", "tool_call", { chatId: event.chat_id });
        // TODO(hume-evi): handle server-side tool calls via the Control Plane API.
        break;
      default:
        // Acknowledge unknown events so Hume doesn't retry indefinitely.
        logger.info("hume-webhook", "unhandled event", { eventName: event.event_name });
    }
  } catch (e) {
    logger.error("hume-webhook", "Handler error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
