/**
 * KAIROS Email Sending Service
 *
 * Integrates the Resend email provider with the KAIROS email
 * template engine and white-label brand configuration.
 *
 * Environment variables:
 *   RESEND_API_KEY  — Resend API key (required for sending)
 *   EMAIL_FROM      — Default from address (optional, defaults to noreply@kairos.health)
 *   APP_URL         — Base URL for links in emails (optional, defaults to http://localhost:3000)
 */

import { Resend } from "resend";
import type { EmailBrandConfig } from "@/lib/company-ops/brand";
import {
  buildWelcomeEmail,
  buildWeeklyReportEmail,
  buildAlertEmail,
  buildTrainerMessageEmail,
} from "./templates";

// ─── Singleton Resend Client ─────────────────────────────────────────────────

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required for email sending");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_FROM = process.env.EMAIL_FROM ?? "KAIROS Health <noreply@kairos.health>";
const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function resolveFrom(brand?: Partial<EmailBrandConfig>): string {
  if (brand?.fromName) {
    // Extract domain from DEFAULT_FROM or use kairos.health
    const match = DEFAULT_FROM.match(/<(.+)>/);
    const domain = match ? match[1] : "noreply@kairos.health";
    return `${brand.fromName} <${domain}>`;
  }
  return DEFAULT_FROM;
}

function interpolateBaseUrl(html: string): string {
  return html
    .replace(/\{\{baseUrl\}\}/g, APP_URL)
    .replace(/\{\{unsubscribeUrl\}\}/g, `${APP_URL}/settings/notifications`)
    .replace(/\{\{settingsUrl\}\}/g, `${APP_URL}/settings`);
}

// ─── Core Send Function ──────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // In development without RESEND_API_KEY, log and return success
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send to ${Array.isArray(options.to) ? options.to.join(", ") : options.to}: ${options.subject}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: options.from ?? DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: interpolateBaseUrl(options.html),
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (result.error) {
      console.error("[EMAIL] Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[EMAIL] Send failed:", message);
    return { success: false, error: message };
  }
}

// ─── Template-Based Senders ──────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  brand?: Partial<EmailBrandConfig>;
}): Promise<SendEmailResult> {
  const html = buildWelcomeEmail(params.name, params.brand);
  const brandName = params.brand?.companyName ?? "KAIROS";
  return sendEmail({
    to: params.to,
    subject: `Welcome to ${brandName} — Your Health Journey Starts Now`,
    html,
    from: resolveFrom(params.brand),
    tags: [{ name: "category", value: "onboarding" }],
  });
}

export async function sendWeeklyReportEmail(params: {
  to: string;
  name: string;
  score: number;
  change: number;
  wins: string[];
  focusAreas: string[];
  brand?: Partial<EmailBrandConfig>;
}): Promise<SendEmailResult> {
  const html = buildWeeklyReportEmail(params);
  const changeText = params.change >= 0 ? `+${params.change}` : String(params.change);
  return sendEmail({
    to: params.to,
    subject: `Your Weekly Health Report — Score: ${params.score} (${changeText})`,
    html,
    from: resolveFrom(params.brand),
    tags: [{ name: "category", value: "weekly_report" }],
  });
}

export async function sendAlertEmail(params: {
  to: string;
  name: string;
  alertTitle: string;
  alertBody: string;
  actionUrl: string;
  actionLabel: string;
  severity: string;
  brand?: Partial<EmailBrandConfig>;
}): Promise<SendEmailResult> {
  const html = buildAlertEmail(params);
  return sendEmail({
    to: params.to,
    subject: `Health Alert: ${params.alertTitle}`,
    html,
    from: resolveFrom(params.brand),
    tags: [
      { name: "category", value: "health_alert" },
      { name: "severity", value: params.severity },
    ],
  });
}

export async function sendTrainerMessageEmail(params: {
  to: string;
  clientName: string;
  trainerName: string;
  preview: string;
  brand?: Partial<EmailBrandConfig>;
}): Promise<SendEmailResult> {
  const html = buildTrainerMessageEmail(params);
  return sendEmail({
    to: params.to,
    subject: `New Message from ${params.trainerName}`,
    html,
    from: resolveFrom(params.brand),
    tags: [{ name: "category", value: "coach_message" }],
  });
}

// ─── Generic Notification Email ──────────────────────────────────────────────

export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  brand?: Partial<EmailBrandConfig>;
}): Promise<SendEmailResult> {
  // Use alert template as generic notification wrapper
  const html = buildAlertEmail({
    name: "",
    alertTitle: params.title,
    alertBody: params.body,
    actionUrl: params.actionUrl ?? APP_URL,
    actionLabel: params.actionLabel ?? "View in App",
    severity: "info",
    brand: params.brand,
  });

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html,
    from: resolveFrom(params.brand),
    tags: [{ name: "category", value: "notification" }],
  });
}
