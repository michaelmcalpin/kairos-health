import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getClientContext } from "@/lib/ai/health-context";
import { callWithRetry } from "@/lib/ai/retry";

export const maxDuration = 120;

const EXERCISE_SYSTEM_PROMPT = `You are EVERIST AI Exercise Programming Specialist. You create personalized, evidence-based exercise programs that integrate the client's complete health profile — genetics, body composition (DEXA), lab work, goals, and current fitness level.

## OUTPUT FORMAT
You MUST respond with ONLY valid JSON in this exact structure — no markdown, no explanations, no code fences:

{
  "programName": "<descriptive program name>",
  "description": "<2-3 sentence overview of the program's philosophy and goals>",
  "durationWeeks": <number — typically 4, 8, or 12>,
  "daysPerWeek": <number — typically 3-6>,
  "focusAreas": ["<primary focus>", "<secondary focus>"],
  "rationale": "<1-2 paragraphs explaining WHY this program is designed this way based on the client's data — reference specific DEXA numbers, genetic findings, goals, etc.>",
  "sessions": [
    {
      "dayNumber": <1-7>,
      "dayLabel": "<e.g. Monday, Tuesday>",
      "name": "<session name — e.g. Upper Body Push, Zone 2 Cardio, Full Body Strength>",
      "type": "<strength|cardio|hiit|mobility|rest>",
      "estimatedMinutes": <number>,
      "warmup": "<brief warmup description>",
      "exercises": [
        {
          "name": "<exercise name>",
          "muscleGroups": ["<primary>", "<secondary>"],
          "sets": <number>,
          "reps": "<rep range or duration — e.g. '8-10', '12-15', '30 sec', '20 min'>",
          "tempo": "<tempo notation — e.g. '3-1-2-0' or 'controlled'>",
          "restSeconds": <rest between sets in seconds>,
          "notes": "<form cues, substitution options, or intensity guidance>"
        }
      ],
      "cooldown": "<brief cooldown description>",
      "coachNotes": "<additional notes about this session's purpose>"
    }
  ]
}

## PROGRAMMING PRINCIPLES
- **Muscle building**: Progressive overload with compound movements as foundation. Include both strength (4-6 reps) and hypertrophy (8-12 reps) ranges.
- **Cardio**: Prioritize Zone 2 (nasal breathing, 60-70% max HR) for longevity and metabolic health. Include 1-2 HIIT sessions per week max.
- **Recovery**: Factor in the client's age, sleep quality, HRV data, and recovery capacity. Older clients or those with high stress need more recovery.
- **Genetics**: If genetic data shows inflammation pathways (MTHFR, TNF, IL6), favor anti-inflammatory training (Zone 2 over intense HIIT). If detox pathways are compromised, ensure adequate recovery days.
- **Body composition**: Use DEXA data to target weak points. High visceral fat → more cardio emphasis. Low lean mass → prioritize hypertrophy. Good lean mass → can push strength focus.
- **Goals**: Align everything with the client's stated goals. Weight loss → caloric expenditure focus. Muscle gain → progressive overload emphasis. Longevity → Zone 2 + strength balance.
- **Injuries & conditions**: If the client reports ANY pain, injury, or medical condition, AVOID exercises that aggravate it. Provide safe alternatives. Note modifications in the exercise "notes" field.
- **Medications**: Review the client's medications. Beta-blockers limit max heart rate (adjust HR zones). Blood thinners increase bruising risk (avoid heavy contact). Statins can cause muscle soreness (moderate volume). Stimulants affect cardiovascular response.
- **Sleep**: If sleep quality is poor (<6 hrs or low scores), reduce training volume and intensity. Prioritize recovery. Poor sleep impairs muscle protein synthesis and increases cortisol.
- **Supplements & Peptides**: Consider active supplement/peptide protocols. BPC-157 or TB-500 may support tissue healing (can push rehab exercises). Growth hormone peptides support recovery (can handle higher volume). Creatine supplementation supports strength work. Pre-workout timing matters.
- **Fasting protocols**: If the client follows intermittent fasting, consider training timing relative to feeding windows. Fasted training may need lower intensity.
- Rest days should be listed with type "rest" and include active recovery suggestions.

## SAFETY FIRST
- NEVER program exercises that conflict with reported injuries or conditions.
- For any joint pain, provide alternative movement patterns.
- If the client reports a heart condition, keep all training in Zone 1-2 unless cleared by a physician.
- Always include proper warmup and cooldown recommendations.
- When in doubt, be conservative. It's better to undertrain than to cause injury.`;

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500 });
    }

    const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const { userRequest, refinement, previousPlan } = await req.json();

    // Get full health context
    const healthContext = await getClientContext(dbUser.id);

    const anthropic = new Anthropic({ apiKey });

    // Build messages
    const messages: Anthropic.MessageParam[] = [];

    if (previousPlan && refinement) {
      // Refinement mode — send previous plan + modification request
      messages.push({
        role: "user",
        content: `Create an exercise program for me. ${userRequest ?? ""}`,
      });
      messages.push({
        role: "assistant",
        content: JSON.stringify(previousPlan),
      });
      messages.push({
        role: "user",
        content: `Please modify the exercise program: ${refinement}. Return the COMPLETE updated program in the same JSON format.`,
      });
    } else {
      // Initial generation
      messages.push({
        role: "user",
        content: userRequest
          ? `Create an exercise program for me. Specific requests: ${userRequest}`
          : "Create a personalized exercise program based on all my health data and goals. Balance muscle building with cardio for longevity.",
      });
    }

    const response = await callWithRetry(
      () =>
        anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: `${EXERCISE_SYSTEM_PROMPT}\n\n--- CLIENT HEALTH PROFILE ---\n${healthContext}`,
          messages,
        }),
      "Exercise Generation",
    );

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "No response from AI" }), { status: 500 });
    }

    let parsed: unknown;
    try {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse exercise plan", raw: textBlock.text.slice(0, 500) }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, plan: parsed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Exercise Generate Error]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
