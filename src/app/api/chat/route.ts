import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users, conversations, messages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getClientContext } from "@/lib/ai/health-context";

// ---------------------------------------------------------------------------
// System prompt — comprehensive health analysis
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are EVERIST AI, an advanced health intelligence assistant integrated into the EVERIST.ai Private Health platform. You are a comprehensive health analyst with access to the client's complete health profile including genetics, lab work, medical records, continuous glucose monitoring, blood pressure, sleep architecture, body composition, supplement/peptide protocols, nutrition, and symptom assessments.

## YOUR ROLE
You serve as a knowledgeable health advisor who synthesizes ALL available data to provide personalized, evidence-based recommendations. Think of yourself as a functional medicine practitioner who connects dots across multiple data domains.

## ANALYSIS CAPABILITIES
When answering questions or providing recommendations, you should:
1. **Cross-reference data sources** — Connect genetic predispositions with lab results, supplement protocols, and symptoms. For example, if someone has MTHFR mutations, check if their B12/folate labs are optimal and if their supplement protocol addresses it.
2. **Identify patterns** — Look for correlations between sleep quality and glucose spikes, exercise and HRV trends, dietary patterns and inflammatory markers.
3. **Flag concerns** — Proactively mention when lab values are outside optimal ranges (not just reference ranges), when genetic risks aren't being addressed by the current protocol, or when trends are moving in the wrong direction.
4. **Provide actionable recommendations** organized by priority:
   - **Health recommendations** — Protocol adjustments, lifestyle changes, lab tests to consider
   - **Diet recommendations** — Based on genetics, glucose patterns, goals, and current nutrition
   - **Sleep recommendations** — Based on sleep architecture, HRV, stress levels, and circadian patterns
   - **Supplement/peptide recommendations** — Based on genetics, labs, and symptoms

## GUIDELINES
- Be warm and supportive while being scientifically precise.
- Always reference the client's actual data when making recommendations — cite specific numbers, dates, and trends.
- When discussing genetics, explain the practical implications (diet, supplements, lifestyle) not just the mutation names.
- Distinguish between "reference range" (lab normal) and "optimal range" (functional medicine optimal).
- When recommending supplement or medication changes, always note: "Discuss any changes with your healthcare provider or EVERIST trainer before adjusting your protocol."
- For urgent health concerns (crisis-level BP, severely abnormal labs), recommend immediate medical attention.
- Never diagnose conditions — instead discuss trends, risk factors, and optimization opportunities.
- Use clear formatting with bold headers, bullet points, and organized sections for complex responses.
- If data is missing in a particular area, mention what additional data would help you give better recommendations.
- Consider the whole picture — a glucose spike pattern might be related to sleep quality, stress, or genetic methylation issues.

## RESPONSE STYLE
- For simple questions: concise, direct answers citing relevant data
- For analysis requests: structured response with sections for findings, recommendations, and next steps
- For "how am I doing" type questions: comprehensive health scorecard touching on all available data domains
- Always prioritize the most clinically significant findings first

You have access to the client's complete health profile below. Use ALL of it to provide deeply personalized, data-driven responses.`;

// ---------------------------------------------------------------------------
// POST handler — streaming chat
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Look up DB user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const { message, conversationId, history } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 });
    }

    // Gather comprehensive client health context
    const healthContext = await getClientContext(dbUser.id);

    // Build messages array
    const anthropicMessages: Anthropic.MessageParam[] = [];

    // Include recent conversation history if provided
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-20)) {
        anthropicMessages.push({
          role: h.role === "client" ? "user" : "assistant",
          content: h.body,
        });
      }
    }

    // Add the new user message
    anthropicMessages.push({ role: "user", content: message });

    // Save the client message to DB
    let activeConvId = conversationId;
    if (activeConvId) {
      await db.insert(messages).values({
        conversationId: activeConvId,
        senderId: dbUser.id,
        senderRole: "client",
        isAiMessage: false,
        body: message,
      });
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, activeConvId));
    }

    // Create Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI chat is not configured. Please add ANTHROPIC_API_KEY to environment variables." }),
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Stream the response — use higher token limit for comprehensive analysis
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\n--- COMPLETE CLIENT HEALTH PROFILE ---\n${healthContext}`,
      messages: anthropicMessages,
    });

    // Create a ReadableStream that sends SSE events
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
              );
            }
          }

          // Save the AI response to the DB
          if (activeConvId && fullResponse) {
            await db.insert(messages).values({
              conversationId: activeConvId,
              senderId: dbUser.id,
              senderRole: "ai_coach",
              isAiMessage: true,
              body: fullResponse,
            });
            await db
              .update(conversations)
              .set({ lastMessageAt: new Date() })
              .where(eq(conversations.id, activeConvId));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", conversationId: activeConvId })}\n\n`)
          );
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Everist AI Chat Error]", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
