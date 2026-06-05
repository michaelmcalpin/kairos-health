import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getClientContext } from "@/lib/ai/health-context";

export const maxDuration = 120;

const MEAL_SYSTEM_PROMPT = `You are EVERIST AI Nutrition Specialist. You create personalized meal libraries based on the client's complete health profile — genetics, gut biome, body composition, lab results, dietary preferences, and health goals.

## OUTPUT FORMAT
Respond with ONLY valid JSON — no markdown, no code fences:

{
  "libraryName": "<descriptive name based on diet type and goals>",
  "description": "<1-2 sentence overview>",
  "dailyTargets": {
    "calories": <number>,
    "proteinG": <number>,
    "carbsG": <number>,
    "fatG": <number>,
    "fiberG": <number>
  },
  "meals": [
    {
      "id": "<unique slug like 'grilled-salmon-bowl'>",
      "name": "<meal name>",
      "category": "<breakfast|lunch|dinner|snack>",
      "prepTimeMinutes": <number>,
      "calories": <number>,
      "proteinG": <number>,
      "carbsG": <number>,
      "fatG": <number>,
      "ingredients": [
        { "name": "<ingredient>", "amount": "<quantity with unit>", "category": "<produce|protein|dairy|pantry|frozen|other>" }
      ],
      "instructions": "<brief 2-3 step prep instructions>",
      "tags": ["<high-protein>", "<anti-inflammatory>", "<gut-friendly>", etc.],
      "rationale": "<why this meal is good for this client — reference specific health data>"
    }
  ]
}

## GUIDELINES
- Generate 20-30 meals across all categories (6-8 breakfast, 6-8 lunch, 6-8 dinner, 4-6 snacks)
- Each meal should have complete macro breakdown
- Consider the client's dietary approach (keto, paleo, clean eating, etc.)
- If gut biome data shows attention areas, avoid inflammatory foods
- If genetics show methylation issues, include folate-rich foods
- If DEXA shows high body fat, keep calories moderate
- Include ingredient amounts for 1 serving
- Tag meals for easy filtering (high-protein, low-carb, quick, meal-prep, etc.)
- The rationale should reference the client's actual data`;

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500 });

    const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!dbUser) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    const { userRequest, refinement, previousLibrary } = await req.json();

    let healthContext = await getClientContext(dbUser.id);
    if (healthContext.length > 40000) healthContext = healthContext.slice(0, 40000);

    const anthropic = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [];

    if (previousLibrary && refinement) {
      messages.push({ role: "user", content: `Create a personalized meal library. ${userRequest ?? ""}` });
      messages.push({ role: "assistant", content: JSON.stringify(previousLibrary) });
      messages.push({ role: "user", content: `Modify the meal library: ${refinement}. Return the COMPLETE updated library.` });
    } else {
      messages.push({
        role: "user",
        content: userRequest
          ? `Create a personalized meal library. ${userRequest}`
          : "Create a personalized meal library based on all my health data, dietary preferences, and goals. Include breakfast, lunch, dinner, and snack options.",
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: `${MEAL_SYSTEM_PROMPT}\n\n--- CLIENT HEALTH PROFILE ---\n${healthContext}`,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "No response" }), { status: 500 });
    }

    let parsed: unknown;
    try {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse meal library", raw: textBlock.text.slice(0, 300) }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, library: parsed }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Meal Generate Error]", errMsg);
    return new Response(JSON.stringify({ error: `Meal generation failed: ${errMsg.slice(0, 200)}` }), { status: 500 });
  }
}
