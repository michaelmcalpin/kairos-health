/**
 * EVERIST Gmail Send Integration (dependency-free)
 *
 * Sends a coach's client-facing email FROM the coach's own connected Gmail,
 * using the Gmail REST API (users.messages.send). Builds a valid RFC 2822
 * message (optionally multipart with a .ics calendar attachment) and POSTs it
 * base64url-encoded. Uses global fetch — no googleapis dependency.
 *
 * This relies on the `https://www.googleapis.com/auth/gmail.send` scope, which
 * Google classifies as SENSITIVE/RESTRICTED: an app must pass Google's OAuth
 * verification before non-test users can grant it in production.
 *
 * SECURITY: never logs the access token or full message bodies. Catches its own
 * errors and returns { success: false } rather than throwing.
 */

import crypto from "crypto";

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export interface SendGmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromEmail: string;
  fromName?: string;
  icsContent?: string;
  icsFilename?: string;
}

export interface SendGmailResult {
  success: boolean;
  error?: string;
}

/** Wrap a base64 string to 76-char lines (RFC 2045). */
function wrap76(b64: string): string {
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

function base64Body(content: string): string {
  return wrap76(Buffer.from(content, "utf-8").toString("base64"));
}

/** RFC 2047 encoded-word for subjects/names that contain non-ASCII chars. */
function encodeHeaderWord(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function formatFrom(fromEmail: string, fromName?: string): string {
  if (!fromName) return fromEmail;
  return `"${encodeHeaderWord(fromName).replace(/"/g, "")}" <${fromEmail}>`;
}

/** A text/html or text/plain MIME part with a base64 body. */
function bodyPart(kind: "html" | "text", content: string): string {
  const contentType = kind === "html" ? "text/html" : "text/plain";
  return [
    `Content-Type: ${contentType}; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(content),
  ].join("\r\n");
}

/**
 * Build the full RFC 2822 message. Attachment present → multipart/mixed
 * (single html-or-text body part + the .ics attachment). No attachment but both
 * html and text → multipart/alternative. Otherwise a simple single-body message.
 */
function buildRawMessage(msg: SendGmailMessage): string {
  const headers = [
    `From: ${formatFrom(msg.fromEmail, msg.fromName)}`,
    `To: ${msg.to}`,
    `Subject: ${encodeHeaderWord(msg.subject)}`,
    "MIME-Version: 1.0",
  ];

  const html = msg.html;
  const text = msg.text;

  // Case 1: calendar attachment present → multipart/mixed.
  if (msg.icsContent) {
    const boundary = `everist_mixed_${crypto.randomBytes(12).toString("hex")}`;
    const filename = msg.icsFilename ?? "invite.ics";
    // Prefer html for the body, falling back to text (then empty).
    const body =
      html !== undefined
        ? bodyPart("html", html)
        : bodyPart("text", text ?? "");
    const attachment = [
      `Content-Type: text/calendar; method=REQUEST; charset="UTF-8"; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Body(msg.icsContent),
    ].join("\r\n");
    return [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      body,
      `--${boundary}`,
      attachment,
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  // Case 2: both html and text, no attachment → multipart/alternative.
  if (html !== undefined && text !== undefined) {
    const boundary = `everist_alt_${crypto.randomBytes(12).toString("hex")}`;
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      bodyPart("text", text),
      `--${boundary}`,
      bodyPart("html", html),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  // Case 3: single body.
  const kind: "html" | "text" = html !== undefined ? "html" : "text";
  const content = html !== undefined ? html : (text ?? "");
  return [
    ...headers,
    `Content-Type: ${kind === "html" ? "text/html" : "text/plain"}; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(content),
    "",
  ].join("\r\n");
}

/** URL-safe base64 (base64url) without padding, per the Gmail API `raw` field. */
function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send an email via the coach's Gmail. `accessToken` must be a valid token with
 * the gmail.send scope; `msg.fromEmail` must be the coach's connected Gmail
 * address. Never throws — returns { success, error? }.
 */
export async function sendGmail(
  accessToken: string,
  msg: SendGmailMessage,
): Promise<SendGmailResult> {
  try {
    const raw = toBase64Url(buildRawMessage(msg));
    const res = await fetch(GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      // Read a short status hint without logging any token or message body.
      return { success: false, error: `gmail send failed: ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
