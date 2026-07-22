/**
 * Shared AI consolidation for user feedback.
 *
 * Used by both the super-admin `admin.feedback.consolidate` tRPC procedure
 * and the daily feedback digest cron (/api/cron/daily-feedback).
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";

export interface FeedbackItemForAnalysis {
  type: string;
  page: string | null;
  platform: string | null;
  role: string | null;
  message: string;
  createdAt: Date;
}

/**
 * Produce a consolidated analysis of a window of feedback items:
 * groups items into themes, characterizes each bug/request cluster,
 * notes frequency and affected pages, and suggests priorities.
 *
 * Throws if ANTHROPIC_API_KEY is missing or the API call fails —
 * callers decide how to degrade.
 */
export async function consolidateFeedback(
  items: FeedbackItemForAnalysis[],
  days: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const itemList = items
    .map((i) => {
      const msg = i.message.replace(/\s+/g, " ").trim().slice(0, 600);
      return `- [${i.type}] platform=${i.platform ?? "unknown"} role=${i.role ?? "unknown"} page=${i.page ?? "unknown"} at=${i.createdAt.toISOString()}: ${msg}`;
    })
    .join("\n");

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are analyzing user feedback collected for Everist.ai, a health/longevity platform, over the last ${days} day(s). There are ${items.length} feedback item(s) below.

Produce a consolidated analysis as plain text (no markdown tables, no code fences):
1. Group the feedback into themes/clusters.
2. For each cluster, identify the nature of the bug or request, how many items mention it (frequency), and which pages/platforms/roles are affected.
3. Suggest a priority (High / Medium / Low) for each cluster with a one-line rationale.
4. End with a short "Top actions" list.

Feedback items:
${itemList}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }
  return textBlock.text.trim();
}
