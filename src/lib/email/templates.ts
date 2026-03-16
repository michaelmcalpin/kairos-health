/**
 * KAIROS Email Template Engine
 *
 * Generates branded HTML emails using inline styles
 * for maximum email client compatibility.
 */

// ─── Brand Constants ─────────────────────────────────────────────────────────

const BRAND = {
  royal: "#122055",
  royalLight: "#1A2D6D",
  royalDark: "#0A0F1F",
  gold: "#D4AF37",
  goldLight: "#E8D48B",
  silver: "#E0E0E0",
  silverDark: "#9E9E9E",
  white: "#FFFFFF",
  fontHeading: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  fontBody: "'Open Sans', 'Helvetica Neue', Arial, sans-serif",
};

// ─── Layout Wrapper ──────────────────────────────────────────────────────────

export function wrapEmailLayout(content: string, options?: { preheader?: string }): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>KAIROS Health</title>
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.royalDark}; font-family: ${BRAND.fontBody};">
  ${options?.preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(options.preheader)}</div>` : ""}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.royalDark};">
    <tr>
      <td align="center" style="padding: 24px 16px;">

        <!-- Header -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <span style="font-family: ${BRAND.fontHeading}; font-size: 28px; font-weight: 700; color: ${BRAND.gold}; letter-spacing: 4px;">
                KAIROS
              </span>
            </td>
          </tr>
        </table>

        <!-- Content Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: ${BRAND.royal}; border-radius: 12px; border: 1px solid #1E2A5A;">
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 0; font-family: ${BRAND.fontBody}; font-size: 12px; color: ${BRAND.silverDark}; line-height: 1.5;">
              KAIROS Health Management<br />
              <a href="{{unsubscribeUrl}}" style="color: ${BRAND.silverDark}; text-decoration: underline;">Manage notification preferences</a>
              &nbsp;|&nbsp;
              <a href="{{settingsUrl}}" style="color: ${BRAND.silverDark}; text-decoration: underline;">Settings</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Content Builders ────────────────────────────────────────────────────────

export function emailHeading(text: string): string {
  return `<h1 style="margin: 0 0 16px; font-family: ${BRAND.fontHeading}; font-size: 22px; font-weight: 700; color: ${BRAND.white};">${escapeHtml(text)}</h1>`;
}

export function emailSubheading(text: string): string {
  return `<h2 style="margin: 0 0 12px; font-family: ${BRAND.fontHeading}; font-size: 16px; font-weight: 600; color: ${BRAND.gold};">${escapeHtml(text)}</h2>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-family: ${BRAND.fontBody}; font-size: 15px; line-height: 1.6; color: ${BRAND.silver};">${escapeHtml(text)}</p>`;
}

export function emailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${BRAND.gold}; border-radius: 8px; padding: 14px 28px;">
      <a href="${escapeHtml(url)}" style="font-family: ${BRAND.fontHeading}; font-size: 14px; font-weight: 600; color: ${BRAND.royalDark}; text-decoration: none; display: inline-block;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailDivider(): string {
  return `<hr style="margin: 24px 0; border: none; border-top: 1px solid #1E2A5A;" />`;
}

export function emailMetricRow(label: string, value: string, color?: string): string {
  return `<tr>
  <td style="padding: 8px 0; font-family: ${BRAND.fontBody}; font-size: 14px; color: ${BRAND.silverDark};">${escapeHtml(label)}</td>
  <td style="padding: 8px 0; font-family: ${BRAND.fontHeading}; font-size: 14px; font-weight: 600; color: ${color ?? BRAND.white}; text-align: right;">${escapeHtml(value)}</td>
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
    <td style="padding: 16px; background-color: ${bgColor ?? BRAND.royalDark}; border-radius: 8px; border: 1px solid #1E2A5A;">
      <p style="margin: 0; font-family: ${BRAND.fontBody}; font-size: 14px; line-height: 1.5; color: ${BRAND.silver};">${content}</p>
    </td>
  </tr>
</table>`;
}

// ─── Pre-built Email Templates ───────────────────────────────────────────────

export function buildWelcomeEmail(name: string): string {
  return wrapEmailLayout(
    emailHeading(`Welcome to KAIROS, ${name}`) +
    emailParagraph("Your precision health optimization journey begins now. KAIROS combines clinical-grade biometric tracking, AI-powered insights, and personalized coaching to help you achieve your longevity goals.") +
    emailSubheading("Getting Started") +
    emailParagraph("1. Complete your health profile to personalize your experience.") +
    emailParagraph("2. Connect your wearable devices for real-time health tracking.") +
    emailParagraph("3. Review your first AI-generated health insights within 48 hours.") +
    emailButton("Complete Your Profile", "{{baseUrl}}/onboarding"),
    { preheader: "Welcome to KAIROS — your precision health journey starts now." }
  );
}

export function buildWeeklyReportEmail(params: {
  name: string;
  score: number;
  change: number;
  wins: string[];
  focusAreas: string[];
}): string {
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
    emailSubheading("This Week's Wins") +
    winsHtml +
    emailDivider() +
    emailSubheading("Focus Areas") +
    focusHtml +
    emailButton("View Full Report", "{{baseUrl}}/insights?tab=report"),
    { preheader: `Your health score: ${params.score}/100 (${changeText} from last week)` }
  );
}

export function buildAlertEmail(params: {
  name: string;
  alertTitle: string;
  alertBody: string;
  actionUrl: string;
  actionLabel: string;
  severity: string;
}): string {
  const severityColor = params.severity === "critical" ? "#ef4444" : params.severity === "high" ? "#f59e0b" : BRAND.gold;

  return wrapEmailLayout(
    emailHeading(params.alertTitle) +
    emailParagraph(`Hi ${params.name},`) +
    emailInfoBox(`<span style="color: ${severityColor}; font-weight: 600;">● ${params.severity.toUpperCase()}</span>&nbsp;&nbsp;${escapeHtml(params.alertBody)}`) +
    emailButton(params.actionLabel, params.actionUrl),
    { preheader: params.alertBody.slice(0, 100) }
  );
}

export function buildCoachMessageEmail(params: {
  clientName: string;
  coachName: string;
  preview: string;
}): string {
  return wrapEmailLayout(
    emailHeading(`Message from ${params.coachName}`) +
    emailParagraph(`Hi ${params.clientName},`) +
    emailParagraph(`${params.coachName} sent you a message:`) +
    emailInfoBox(escapeHtml(params.preview)) +
    emailButton("Read Full Message", "{{baseUrl}}/messages"),
    { preheader: `${params.coachName}: ${params.preview.slice(0, 80)}` }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
