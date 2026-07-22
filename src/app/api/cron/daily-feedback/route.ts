/**
 * EVERIST Cron: Daily Feedback Digest
 *
 * Called by Vercel Cron once a day. Collects all feedback submitted in
 * the last 24 hours, runs the shared AI consolidation, and emails a
 * digest to FEEDBACK_DIGEST_EMAIL (or every super_admin user).
 *
 * Vercel Cron config (vercel.json):
 * { "crons": [{ "path": "/api/cron/daily-feedback", "schedule": "0 12 * * *" }] }
 */

import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { feedback, users } from "@/server/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { consolidateFeedback } from "@/lib/feedback/consolidate";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/middleware/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TYPE_COLORS: Record<string, string> = {
  bug: "#ef4444",
  feature: "#3b82f6",
  redesign: "#a855f7",
};

export async function GET(req: Request) {
  // Verify cron secret — REQUIRED in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV === "production") {
    logger.error("cron", "CRON_SECRET not configured in production — rejecting request");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("cron", "Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        type: feedback.type,
        page: feedback.page,
        platform: feedback.platform,
        role: feedback.role,
        message: feedback.message,
        createdAt: feedback.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(gte(feedback.createdAt, since))
      .orderBy(desc(feedback.createdAt));

    if (rows.length === 0) {
      logger.info("cron", "Daily feedback digest: no feedback in last 24h — skipping");
      return NextResponse.json({ success: true, skipped: true });
    }

    // AI consolidation (best-effort — the itemized digest still goes out)
    let analysis: string;
    try {
      analysis = await consolidateFeedback(
        rows.map((r) => ({
          type: r.type,
          page: r.page,
          platform: r.platform,
          role: r.role,
          message: r.message,
          createdAt: r.createdAt,
        })),
        1,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.warn("cron", "Daily feedback digest: AI consolidation failed", { error: msg });
      analysis = `(AI consolidation unavailable: ${msg})`;
    }

    // Counts by type
    const byType: Record<string, number> = {};
    rows.forEach((r) => {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
    });
    const countsLine = Object.entries(byType)
      .map(
        ([type, count]) =>
          `<span style="display:inline-block;margin-right:12px;padding:2px 10px;border-radius:12px;background:${TYPE_COLORS[type] ?? "#6b7280"}22;color:${TYPE_COLORS[type] ?? "#6b7280"};font-weight:600;">${escapeHtml(type)}: ${count}</span>`,
      )
      .join("");

    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tableRows = rows
      .map((r) => {
        const name =
          [r.userFirstName, r.userLastName].filter(Boolean).join(" ") || "Unknown";
        const time = r.createdAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        });
        return `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${escapeHtml(time)} UTC</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(name)}<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(r.userEmail ?? "")}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.role ?? "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.platform ?? "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;word-break:break-all;">${escapeHtml(r.page ?? "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;"><span style="color:${TYPE_COLORS[r.type] ?? "#6b7280"};font-weight:600;">${escapeHtml(r.type)}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.message)}</td>
        </tr>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="max-width:800px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 4px;font-size:20px;">Everist.ai Daily Feedback — ${escapeHtml(dateLabel)}</h1>
    <p style="margin:0 0 16px;color:#6b7280;">${rows.length} feedback item${rows.length === 1 ? "" : "s"} in the last 24 hours</p>
    <div style="margin-bottom:24px;">${countsLine}</div>

    <h2 style="font-size:15px;margin:0 0 8px;">AI Consolidated Analysis</h2>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:28px;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(analysis)}</div>

    <h2 style="font-size:15px;margin:0 0 8px;">All Items</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#6b7280;">
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Time</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">User</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Role</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Platform</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Page</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Type</th>
          <th style="padding:8px 10px;border-bottom:2px solid #e5e7eb;">Message</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    // Determine recipients
    let recipients: string[];
    const digestEmail = process.env.FEEDBACK_DIGEST_EMAIL;
    if (digestEmail) {
      recipients = [digestEmail];
    } else {
      const superAdmins = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, "super_admin"));
      recipients = superAdmins.map((u) => u.email).filter(Boolean);
    }

    if (recipients.length === 0) {
      logger.warn("cron", "Daily feedback digest: no recipients found — skipping send");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "no recipients",
        itemCount: rows.length,
      });
    }

    const sendResult = await sendEmail({
      to: recipients,
      subject: `Everist.ai Daily Feedback — ${dateLabel}`,
      html,
      tags: [{ name: "category", value: "feedback_digest" }],
    });

    const durationMs = Date.now() - startTime;
    logger.info("cron", "Daily feedback digest sent", {
      itemCount: rows.length,
      recipients: recipients.length,
      emailSuccess: sendResult.success,
      durationMs,
    });

    return NextResponse.json({
      success: sendResult.success,
      itemCount: rows.length,
      recipients: recipients.length,
      messageId: sendResult.messageId,
      ...(sendResult.error ? { error: sendResult.error } : {}),
      durationMs,
    });
  } catch (err) {
    logger.error("cron", "Daily feedback digest failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest failed" },
      { status: 500 },
    );
  }
}
