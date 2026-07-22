/**
 * User feedback router — any authenticated user (any role) can submit
 * bug reports, feature requests, and redesign suggestions.
 *
 * After inserting the row we do best-effort AI enrichment (one-sentence
 * summary + 1-3 tags). Enrichment failure NEVER breaks submission.
 */

import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { router, authedProcedure } from "@/server/trpc";
import { feedback } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { logger } from "@/lib/middleware/logger";

export const feedbackRouter = router({
  submit: authedProcedure
    .input(
      z.object({
        type: z.enum(["bug", "feature", "redesign"]),
        message: z.string().min(3).max(5000),
        page: z.string().max(300),
        platform: z.enum(["web", "mobile"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(feedback)
        .values({
          userId: ctx.dbUserId,
          role: ctx.userRole ?? null,
          platform: input.platform,
          page: input.page,
          type: input.type,
          message: input.message,
        })
        .returning({ id: feedback.id });

      // Best-effort AI enrichment — failure must never break submission.
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
          const anthropic = new Anthropic({ apiKey });
          const response = await anthropic.messages.create({
            model: ANTHROPIC_MODEL,
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: `Summarize this user feedback in one sentence and give 1-3 short tags. Type: ${input.type}. Page: ${input.page}. Message: ${input.message}. Reply ONLY as JSON {"summary": string, "tags": string[]} — no markdown, no code fences.`,
              },
            ],
          });

          const textBlock = response.content.find((b) => b.type === "text");
          if (textBlock && textBlock.type === "text") {
            let jsonStr = textBlock.text.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }
            const parsed = JSON.parse(jsonStr) as { summary?: unknown; tags?: unknown };
            const summary = typeof parsed.summary === "string" ? parsed.summary : null;
            const tags = Array.isArray(parsed.tags)
              ? parsed.tags.filter((t): t is string => typeof t === "string").slice(0, 3)
              : null;

            if (summary || tags) {
              await ctx.db
                .update(feedback)
                .set({
                  ...(summary ? { aiSummary: summary } : {}),
                  ...(tags ? { aiTags: tags } : {}),
                })
                .where(eq(feedback.id, row.id));
            }
          }
        }
      } catch (err) {
        logger.warn("feedback", "AI enrichment failed", {
          feedbackId: row.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      return { id: row.id };
    }),
});
