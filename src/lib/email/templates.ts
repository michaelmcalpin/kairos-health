/**
 * KAIROS Email Template Engine
 *
 * Generates branded HTML emails using inline styles
 * for maximum email client compatibility.
 *
 * Supports white-label company branding via EmailBrandConfig.
 * Falls back to KAIROS defaults when no company config is provided.
 *
 * NOTE: Server-rendered emails with static inline styles. CSS variables don't work in email clients,
 * so hex color values must remain hardcoded here for consistent brand appearance across all email clients.
 */

import type { EmailBrandConfig } from "@/lib/company-ops/brand";

// ─── Default Brand Constants ────────────────────────────────────────────────

const DEFAULT_BRAND: EmailBrandConfig = {
  companyName: "KAIROS",
  primaryColor: "#122055",
  primaryColorDark: "#0A0F1F",
  accentColor: "#D4AF37",
  logoUrl: null,
  fromName: "KAIROS Health",
  footer: "KAIROS Health Management",
  website: "https://kairos.health",
};

const FONTS = {
  heading: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  body: "'Open Sans', 'Helvetica Neue', Arial, sans-serif",
};

const COLORS = {
  gold: "#D4AF37",
  goldLight: "#E8D48B",
  silver: "#E0E0E0",
  silverDark: "#9E9E9E",
  white: "#FFFFFF",
  border: "#1E2A5A",
};

// ─── Brand Resolution ───────────────────────────────────────────────────────

function resolveBrand(config?: Partial<EmailBrandConfig>): EmailBrandConfig {
  return { ...DEFAULT_BRAND, ...config };
}

// ─── Layout Wrapper ─────────────────────────────────────────────────────────

export function wrapEmailLayout(
  content: string,
  options?: { preheader?: string; brand?: Partial<EmailBrandConfig> },
): string {
  const brand = resolveBrand(options?.brand);
  const headerBorder = `1px solid ${lightenColor(brand.primaryColor, 30)}`;

  // For white-label: show company logo or name, then "Powered by Kairos" in footer
  const isWhiteLabel = brand.companyName !== "KAIROS";
  const headerContent = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.companyName)}" style="max-height: 40px; max-width: 200px;" />`
    : `<span style="font-family: ${FONTS.heading}; font-size: 28px; font-weight: 700; color: ${brand.accentColor}; letter-spacing: 4px;">${escapeHtml(brand.companyName)}</span>`;

  const footerText = isWhiteLabel
    ? `${escapeHtml(brand.footer)}<br /><span style="color: ${COLORS.silverDark}; font-size: 10px;">Powered by KAIROS</span>`
    : escapeHtml(brand.footer);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(brand.companyName)}</title>
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${brand.primaryColorDark}; font-family: ${FONTS.body};">
  ${options?.preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(options.preheader)}</div>` : ""}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brand.primaryColorDark};">
    <tr>
      <td align="center" style="padding: 24px 16px;">

        <!-- Header -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              ${headerContent}
            </td>
          </tr>
        </table>

        <!-- Content Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: ${brand.primaryColor}; border-radius: 12px; border: ${headerBorder};">
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 0; font-family: ${FONTS.body}; font-size: 12px; color: ${COLORS.silverDark}; line-height: 1.5;">
              ${footerText}<br />
              <a href="{{unsubscribeUrl}}" style="color: ${COLORS.silverDark}; text-decoration: underline;">Manage notification preferences</a>
              &nbsp;|&nbsp;
              <a href="{{settingsUrl}}" style="color: ${COLORS.silverDark}; text-decoration: underline;">Settings</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Content Builders ───────────────────────────────────────────────────────

export function emailHeading(text: string): string {
  return `<h1 style="margin: 0 0 16px; font-family: ${FONTS.heading}; font-size: 22px; font-weight: 700; color: ${COLORS.white};">${escapeHtml(text)}</h1>`;
}

export function emailSubheading(text: string, accentColor?: string): string {
  return `<h2 style="margin: 0 0 12px; font-family: ${FONTS.heading}; font-size: 16px; font-weight: 600; color: ${accentColor ?? COLORS.gold};">${escapeHtml(text)}</h2>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-family: ${FONTS.body}; font-size: 15px; line-height: 1.6; color: ${COLORS.silver};">${escapeHtml(text)}</p>`;
}

export function emailButton(label: string, url: string, accentColor?: string): string {
  const bgColor = accentColor ?? COLORS.gold;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${bgColor}; border-radius: 8px; padding: 14px 28px;">
      <a href="${escapeHtml(url)}" style="font-family: ${FONTS.heading}; font-size: 14px; font-weight: 600; color: #0A0F1F; text-decoration: none; display: inline-block;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailDivider(borderColor?: string): string {
  return `<hr style="margin: 24px 0; border: none; border-top: 1px solid ${borderColor ?? COLORS.border};" />`;
}

export function emailMetricRow(label: string, value: string, color?: string): string {
  return `<tr>
  <td style="padding: 8px 0; font-family: ${FONTS.body}; font-size: 14px; color: ${COLORS.silverDark};">${escapeHtml(label)}</td>
  <td style="padding: 8px 0; font-family: ${FONTS.heading}; font-size: 14px; font-weight: 600; color: ${color ?? COLORS.white}; text-align: right;">${escapeHtml(value)}</td>
</tr>`;
}

export function emailMetricTable(rows: { label: string; value: string; color?: string }[]): string {
  const rowsHtml = rows.map((r) => emailMetricRow(r.label, r.value, r.color)).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
  ${rowsHtml}
</table>`;
}

export function emailInfoBox(content: string, bgColor?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
  <tr>
    <td style="padding: 16px; background-color: ${bgColor ?? "#0A0F1F"}; border-radius: 8px; border: 1px solid ${COLORS.border};">
      <p style="margin: 0; font-family: ${FONTS.body}; font-size: 14px; line-height: 1.5; color: ${COLORS.silver};">${content}</p>
    </td>
  </tr>
</table>`;
}

// ─── Pre-built Email Templates ──────────────────────────────────────────────

export function buildWelcomeEmail(name: string, brand?: Partial<EmailBrandConfig>): string {
  const b = resolveBrand(brand);
  return wrapEmailLayout(
    emailHeading(`Welcome to ${b.companyName}, ${name}`) +
    emailParagraph(`Your precision health optimization journey begins now. ${b.companyName} combines clinical-grade biometric tracking, AI-powered insights, and personalized coaching to help you achieve your longevity goals.`) +
    emailSubheading("Getting Started", b.accentColor) +
    emailParagraph("1. Complete your health profile to personalize your experience.") +
    emailParagraph("2. Connect your wearable devices for real-time health tracking.") +
    emailParagraph("3. Review your first AI-generated health insights within 48 hours.") +
    emailButton("Complete Your Profile", "{{baseUrl}}/onboarding", b.accentColor),
    { preheader: `Welcome to ${b.companyName} — your precision health journey starts now.`, brand: b }
  );
}

export function buildWeeklyReportEmail(params: {
  name: string;
  score: number;
  change: number;
  wins: string[];
  focusAreas: string[];
  brand?: Partial<EmailBrandConfig>;
}): string {
  const b = resolveBrand(params.brand);
  const scoreColor = params.score >= 80 ? "#10b981" : params.score >= 60 ? "#fbbf24" : "#ef4444";
  const changeText = params.change >= 0 ? `+${params.change}` : String(params.change);

  const winsHtml = params.wins.length > 0
    ? params.wins.map((w) => emailParagraph(`✓ ${w}`)).join("")
    : emailParagraph("Keep tracking to earn wins!");

  const focusHtml = params.focusAreas.length > 0
    ? params.focusAreas.map((a) => emailParagraph(`→ ${a}`)).join("")
    : emailParagraph("Great job — no major focus areas this week!");

  return wrapEmailLayout(
    emailHeading(`${params.name}'s Weekly Health Report`) +
    emailMetricTable([
      { label: "Health Score", value: `${params.score}/100`, color: scoreColor },
      { label: "Change", value: `${changeText} pts`, color: params.change >= 0 ? "#10b981" : "#ef4444" },
    ]) +
    emailDivider() +
    emailSubheading("This Week's Wins", b.accentColor) +
    winsHtml +
    emailDivider() +
    emailSubheading("Focus Areas", b.accentColor) +
    focusHtml +
    emailButton("View Full Report", "{{baseUrl}}/insights?tab=report", b.accentColor),
    { preheader: `Your health score: ${params.score}/100 (${changeText} from last week)`, brand: b }
  );
}

export function buildAlertEmail(params: {
  name: string;
  alertTitle: string;
  alertBody: string;
  actionUrl: string;
  actionLabel: string;
  severity: string;
  brand?: Partial<EmailBrandConfig>;
}): string {
  const b = resolveBrand(params.brand);
  const severityColor = params.severity === "critical" ? "#ef4444" : params.severity === "high" ? "#f59e0b" : b.accentColor;

  return wrapEmailLayout(
    emailHeading(params.alertTitle) +
    emailParagraph(`Hi ${params.name},`) +
    emailInfoBox(`<span style="color: ${severityColor}; font-weight: 600;">● ${params.severity.toUpperCase()}</span>&nbsp;&nbsp;${escapeHtml(params.alertBody)}`) +
    emailButton(params.actionLabel, params.actionUrl, b.accentColor),
    { preheader: params.alertBody.slice(0, 100), brand: b }
  );
}

export function buildTrainerMessageEmail(params: {
  clientName: string;
  trainerName: string;
  preview: string;
  brand?: Partial<EmailBrandConfig>;
}): string {
  const b = resolveBrand(params.brand);
  return wrapEmailLayout(
    emailHeading(`Message from ${params.trainerName}`) +
    emailParagraph(`Hi ${params.clientName},`) +
    emailParagraph(`${params.trainerName} sent you a message:`) +
    emailInfoBox(escapeHtml(params.preview)) +
    emailButton("Read Full Message", "{{baseUrl}}/messages", b.accentColor),
    { preheader: `${params.trainerName}: ${params.preview.slice(0, 80)}`, brand: b }
  );
}

// Legacy alias
export const buildCoachMessageEmail = (params: {
  clientName: string;
  coachName: string;
  preview: string;
  brand?: Partial<EmailBrandConfig>;
}) => buildTrainerMessageEmail({ ...params, trainerName: params.coachName });

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace(/^#/, "");
  const num = parseInt(clean, 16);
  if (isNaN(num)) return "#2E3A6A";
  const r = Math.min(255, ((num >> 16) & 255) + amount);
  const g = Math.min(255, ((num >> 8) & 255) + amount);
  const b = Math.min(255, (num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
