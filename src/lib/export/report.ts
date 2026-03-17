/**
 * KAIROS Health Report Generator
 *
 * Generates structured HTML report content that can be rendered
 * or converted to PDF. Works with the weekly report data structure.
 *
 * NOTE: Server-rendered static HTML/PDF with inline styles. CSS variables don't work in PDF generation,
 * so hex color values are hardcoded in the stylesheet for consistent output when exported.
 */

import type { WeeklyHealthReport, HealthInsight } from "@/lib/ai/types";

// ─── Report Sections ─────────────────────────────────────────────────────────

export interface ReportSection {
  title: string;
  content: string;
  type: "summary" | "insights" | "data" | "recommendations";
}

export interface GeneratedReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
  metadata: Record<string, string>;
}

// ─── Report Builder ──────────────────────────────────────────────────────────

export function buildWeeklyReport(report: WeeklyHealthReport): GeneratedReport {
  const sections: ReportSection[] = [];

  // Executive summary
  const scoreLabel =
    report.overallScore >= 80 ? "excellent" :
    report.overallScore >= 70 ? "good" :
    report.overallScore >= 60 ? "moderate" :
    "needs attention";

  const trendLabel =
    report.scoreChange > 3 ? "improving" :
    report.scoreChange < -3 ? "declining" :
    "stable";

  sections.push({
    title: "Executive Summary",
    type: "summary",
    content: `Overall health score: ${report.overallScore}/100 (${scoreLabel}). ` +
      `Week-over-week trend: ${trendLabel} (${report.scoreChange >= 0 ? "+" : ""}${report.scoreChange} points). ` +
      `This report covers ${report.weekStart} through ${report.weekEnd} and includes ` +
      `${report.insights.length} personalized health insights across all tracked domains.`,
  });

  // Wins section
  if (report.topWins.length > 0) {
    sections.push({
      title: "This Week's Wins",
      type: "summary",
      content: report.topWins.map((w, i) => `${i + 1}. ${w}`).join("\n"),
    });
  }

  // Focus areas
  if (report.areasToImprove.length > 0) {
    sections.push({
      title: "Focus Areas",
      type: "recommendations",
      content: report.areasToImprove.map((a, i) => `${i + 1}. ${a}`).join("\n"),
    });
  }

  // Critical & warning insights
  const critical = report.insights.filter((i) => i.severity === "critical");
  const warnings = report.insights.filter((i) => i.severity === "warning");

  if (critical.length > 0) {
    sections.push({
      title: "Critical Alerts",
      type: "insights",
      content: critical.map((i) => formatInsightForReport(i)).join("\n\n"),
    });
  }

  if (warnings.length > 0) {
    sections.push({
      title: "Areas Requiring Attention",
      type: "insights",
      content: warnings.map((i) => formatInsightForReport(i)).join("\n\n"),
    });
  }

  // Positive insights
  const positives = report.insights.filter((i) => i.severity === "positive");
  if (positives.length > 0) {
    sections.push({
      title: "Positive Trends",
      type: "insights",
      content: positives.map((i) => formatInsightForReport(i)).join("\n\n"),
    });
  }

  // Recommendations
  const allActions = report.insights
    .flatMap((i) => i.actions)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);

  if (allActions.length > 0) {
    sections.push({
      title: "Action Plan",
      type: "recommendations",
      content: allActions.map((a, i) =>
        `${i + 1}. ${a.label}: ${a.description}`
      ).join("\n"),
    });
  }

  // Coach note
  if (report.coachNote) {
    sections.push({
      title: "Coach's Note",
      type: "summary",
      content: report.coachNote,
    });
  }

  return {
    title: "KAIROS Weekly Health Report",
    subtitle: `${report.weekStart} — ${report.weekEnd}`,
    generatedAt: report.generatedAt,
    sections,
    metadata: {
      overallScore: String(report.overallScore),
      scoreChange: String(report.scoreChange),
      insightCount: String(report.insights.length),
      criticalCount: String(critical.length),
      warningCount: String(warnings.length),
    },
  };
}

function formatInsightForReport(insight: HealthInsight): string {
  const lines = [
    `[${insight.category.toUpperCase()}] ${insight.title}`,
    insight.summary,
  ];

  if (insight.dataPoints.length > 0) {
    const dps = insight.dataPoints.map((d) =>
      `  ${d.metric}: ${d.value}${d.unit.startsWith("/") || d.unit === "%" ? d.unit : " " + d.unit}${d.context ? ` (${d.context})` : ""}`
    );
    lines.push(...dps);
  }

  if (insight.actions.length > 0) {
    lines.push("  Actions:");
    for (const a of insight.actions) {
      lines.push(`  - ${a.label}: ${a.description}`);
    }
  }

  return lines.join("\n");
}

// ─── HTML Report (for PDF conversion) ────────────────────────────────────────

export function buildHTMLReport(report: GeneratedReport): string {
  const sectionHTML = report.sections.map((s) => `
    <div class="section">
      <h2>${escapeHTML(s.title)}</h2>
      <div class="section-content ${s.type}">
        ${s.content.split("\n").map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(report.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #122055, #1a3080); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    .header h1 { font-size: 1.5rem; font-weight: 700; }
    .header .subtitle { font-size: 0.9rem; opacity: 0.8; margin-top: 0.25rem; }
    .header .score { font-size: 3rem; font-weight: 800; margin-top: 1rem; }
    .header .score-label { font-size: 0.8rem; opacity: 0.7; }
    .section { margin-bottom: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .section h2 { font-size: 1rem; font-weight: 600; padding: 0.75rem 1rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .section-content { padding: 1rem; }
    .section-content p { margin-bottom: 0.5rem; font-size: 0.9rem; }
    .section-content.insights p:first-child { font-weight: 600; color: #122055; }
    .section-content.recommendations p { padding-left: 0.5rem; }
    .footer { text-align: center; font-size: 0.75rem; color: #9ca3af; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHTML(report.title)}</h1>
    <div class="subtitle">${escapeHTML(report.subtitle)}</div>
    <div class="score">${report.metadata.overallScore ?? "—"}</div>
    <div class="score-label">Overall Health Score</div>
  </div>
  ${sectionHTML}
  <div class="footer">
    Generated ${new Date(report.generatedAt).toLocaleString()} &bull; KAIROS Health Platform
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
