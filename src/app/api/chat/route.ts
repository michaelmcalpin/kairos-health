import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import {
  users,
  clientProfiles,
  bodyMeasurements,
  sleepSessions,
  glucoseReadings,
  protocolItems,
  supplementProtocols,
  bloodPressureReadings,
  conversations,
  messages,
} from "@/server/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getClientContext(dbUserId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Fetch all context in parallel
  const [
    user,
    profile,
    latestMeasurement,
    recentSleep,
    recentGlucose,
    recentBP,
    activeProtocol,
  ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, dbUserId) }),
    db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, dbUserId) }),
    db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.clientId, dbUserId),
      orderBy: desc(bodyMeasurements.date),
    }),
    db.query.sleepSessions.findMany({
      where: and(eq(sleepSessions.clientId, dbUserId), gte(sleepSessions.date, thirtyDaysStr)),
      orderBy: desc(sleepSessions.date),
      limit: 7,
    }),
    db.query.glucoseReadings.findMany({
      where: and(eq(glucoseReadings.clientId, dbUserId), gte(glucoseReadings.timestamp, thirtyDaysAgo)),
      orderBy: desc(glucoseReadings.timestamp),
      limit: 20,
    }),
    db.query.bloodPressureReadings.findMany({
      where: and(eq(bloodPressureReadings.clientId, dbUserId), gte(bloodPressureReadings.date, thirtyDaysStr)),
      orderBy: desc(bloodPressureReadings.date),
      limit: 10,
    }),
    db.query.supplementProtocols.findFirst({
      where: and(eq(supplementProtocols.clientId, dbUserId), eq(supplementProtocols.status, "active")),
    }),
  ]);

  // Fetch protocol items if active protocol exists
  let activeItems: typeof protocolItems.$inferSelect[] = [];
  if (activeProtocol) {
    activeItems = await db.query.protocolItems.findMany({
      where: eq(protocolItems.protocolId, activeProtocol.id),
    });
  }

  const parts: string[] = [];

  // User basics
  if (user) {
    parts.push(`**Client:** ${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
  }
  if (profile) {
    const age = profile.dateOfBirth
      ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 86400000))
      : null;
    parts.push(
      [
        age ? `Age: ${age}` : null,
        profile.gender ? `Gender: ${profile.gender}` : null,
        profile.heightInches ? `Height: ${Math.floor(profile.heightInches / 12)}'${Math.round(profile.heightInches % 12)}"` : null,
        profile.tier ? `Tier: ${profile.tier}` : null,
        profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  // Body measurements
  if (latestMeasurement) {
    const m = latestMeasurement;
    parts.push(
      `**Latest body measurements** (${m.date}): ` +
        [
          m.weightLbs ? `Weight: ${m.weightLbs} lbs` : null,
          m.bodyFatPct ? `Body fat: ${m.bodyFatPct}%` : null,
          m.waistInches ? `Waist: ${m.waistInches}"` : null,
        ]
          .filter(Boolean)
          .join(", ")
    );
  }

  // Sleep
  if (recentSleep.length > 0) {
    const avgDuration =
      recentSleep.reduce((sum: number, s) => sum + (s.totalMinutes ?? 0), 0) / recentSleep.length;
    const scoredSleep = recentSleep.filter((s) => s.score != null);
    const avgScore =
      scoredSleep.length > 0
        ? scoredSleep.reduce((sum: number, s) => sum + (s.score ?? 0), 0) / scoredSleep.length
        : 0;
    parts.push(
      `**Sleep (last 7 nights):** Avg duration: ${(avgDuration / 60).toFixed(1)} hrs` +
        (avgScore > 0 ? ` | Avg score: ${Math.round(avgScore)}/100` : "")
    );
  }

  // Glucose
  if (recentGlucose.length > 0) {
    const values = recentGlucose.map((g) => g.valueMgdl);
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    parts.push(
      `**Glucose (recent):** Avg: ${Math.round(avg)} mg/dL | Range: ${Math.round(min)}-${Math.round(max)} mg/dL`
    );
  }

  // Blood Pressure
  if (recentBP.length > 0) {
    const avgSys = recentBP.reduce((s: number, r) => s + r.systolic, 0) / recentBP.length;
    const avgDia = recentBP.reduce((s: number, r) => s + r.diastolic, 0) / recentBP.length;
    parts.push(
      `**Blood Pressure (last 30 days):** Avg: ${Math.round(avgSys)}/${Math.round(avgDia)} mmHg (${recentBP.length} readings)`
    );
  }

  // Active protocol (supplements, peptides, meds)
  if (activeItems.length > 0) {
    const items = activeItems.map(
      (i: typeof protocolItems.$inferSelect) =>
        `${i.name} ${i.dosage ?? ""}${i.frequency ? " (" + i.frequency + ")" : ""}`
    );
    parts.push(`**Active Protocol:** ${items.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No health data available yet.";
}

const SYSTEM_PROMPT = `You are KAIROS AI, a knowledgeable health and wellness assistant integrated into the KAIROS Private Health platform. You help clients understand their health data, answer questions about nutrition, exercise, genetics, supplements, peptides, sleep, and longevity.

GUIDELINES:
- Be warm, supportive, and encouraging while remaining scientifically accurate.
- Reference the client's actual health data when relevant (measurements, labs, sleep, glucose, blood pressure, protocols).
- Explain complex health concepts in accessible language.
- When discussing supplements, peptides, or medications, always note that changes should be discussed with their healthcare provider or KAIROS trainer.
- Provide evidence-based recommendations grounded in current research.
- If you don't know something or the data isn't available, say so honestly.
- Keep responses concise but thorough — aim for clarity over length.
- Use markdown formatting for readability (bold, bullet points, etc.) when helpful.
- Never diagnose medical conditions. You can discuss trends, ranges, and general health information.
- For urgent health concerns, always recommend contacting a healthcare professional immediately.

You have access to the client's recent health data provided below. Use it to personalize your responses.`;

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

    // Gather client health context
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

    // Stream the response
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `${SYSTEM_PROMPT}\n\n--- CLIENT HEALTH DATA ---\n${healthContext}`,
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
              senderId: dbUser.id, // AI messages stored with client as sender context
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
    console.error("[KAIROS AI Chat Error]", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
