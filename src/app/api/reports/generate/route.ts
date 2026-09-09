import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getClientContext } from "@/lib/ai/health-context";
import { callWithRetry } from "@/lib/ai/retry";

// The Comprehensive report generates close to the full token budget, which can
// take well over two minutes end-to-end. Give the function the max headroom the
// plan allows so it finishes instead of hitting a gateway timeout (which returns
// a non-JSON body the client can't parse).
export const maxDuration = 300;

/**
 * Parse the model's report output into an object. Handles code fences, leading/
 * trailing prose, and trailing commas. If the JSON is truncated, attempts to
 * repair it by closing any still-open strings/objects/arrays. Returns undefined
 * if nothing usable can be recovered.
 */
function parseReportJson(text: string): unknown {
  let s = text.trim();
  // Strip markdown code fences if present.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  // Narrow to the outermost JSON object (drop any prose before/after).
  const start = s.indexOf("{");
  if (start > 0) s = s.slice(start);

  const attempt = (candidate: string): unknown => {
    try {
      return JSON.parse(candidate);
    } catch {
      // Remove trailing commas (…,} or …,]) and retry.
      const cleaned = candidate.replace(/,(\s*[}\]])/g, "$1");
      try {
        return JSON.parse(cleaned);
      } catch {
        return undefined;
      }
    }
  };

  // 1) As-is (to the last closing brace).
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) {
    const direct = attempt(s.slice(0, lastBrace + 1));
    if (direct !== undefined) return direct;
  }

  // 2) Repair a truncated object: close open strings/brackets in order.
  const repaired = repairTruncatedJson(s);
  if (repaired) {
    const fixed = attempt(repaired);
    if (fixed !== undefined) return fixed;
  }

  return undefined;
}

/** Best-effort close of an unterminated JSON object/array (truncated output). */
function repairTruncatedJson(s: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }
  if (!inString && stack.length === 0) return null; // not actually truncated
  let out = s;
  // Drop a dangling partial token after the last complete value.
  out = out.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
  if (inString) out += '"';
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === "{" ? "}" : "]";
  }
  return out;
}

// ---------------------------------------------------------------------------
// Report type definitions
// ---------------------------------------------------------------------------

const REPORT_PROMPTS: Record<string, { title: string; systemAddendum: string }> = {
  health_age: {
    title: "Health Age Assessment",
    systemAddendum: `Generate a comprehensive HEALTH AGE ASSESSMENT report. You must respond with valid JSON matching this structure exactly (no markdown, no code fences):

{
  "title": "Health Age Assessment",
  "generatedAt": "<ISO timestamp>",
  "summary": "<2-3 sentence executive summary>",
  "healthAge": {
    "chronologicalAge": <number>,
    "biologicalAge": <number>,
    "delta": <number — positive means older than chronological>,
    "interpretation": "<1-2 sentences explaining the difference>"
  },
  "domainScores": [
    {
      "domain": "<e.g. Cardiovascular, Metabolic, Neurological, Musculoskeletal, Immune, Sleep & Recovery>",
      "score": <0-100>,
      "ageImpact": <years added or subtracted — negative is good>,
      "status": "<optimal|good|fair|needs_attention|critical>",
      "keyFindings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<rec 1>", "<rec 2>"]
    }
  ],
  "topRisks": [
    { "risk": "<description>", "severity": "<high|medium|low>", "mitigation": "<actionable step>" }
  ],
  "topStrengths": [
    { "strength": "<description>", "impact": "<how it helps>" }
  ],
  "actionPlan": [
    { "priority": <1-5>, "action": "<specific recommendation>", "category": "<diet|supplement|exercise|sleep|lifestyle|medical>", "timeframe": "<immediate|this_week|this_month|ongoing>" }
  ]
}

HEALTH AGE CALCULATION METHODOLOGY:
- Start with the client's chronological age
- Adjust based on: resting heart rate, HRV, blood pressure, glucose/A1C, body composition, sleep quality, genetic risk factors, biomarker status, inflammation markers, exercise patterns
- Each domain contributes years added or subtracted
- Cardiovascular: BP, resting HR, HRV → ±5 years
- Metabolic: glucose, insulin resistance, body fat, lipids → ±5 years
- Sleep & Recovery: sleep duration/quality, deep sleep %, HRV → ±3 years
- Musculoskeletal: body composition, activity level → ±3 years
- Immune/Inflammation: inflammatory markers, gut health, symptoms → ±3 years
- Neurological: HRV, stress levels, mood, cognitive markers → ±2 years
- Genetics: pathway risks, methylation status → ±3 years

Use the client's ACTUAL data to calculate each domain. If data is missing for a domain, note it and use conservative estimates. Be specific with numbers — reference actual lab values, BP readings, sleep scores, etc. in your findings.

If the client has no date of birth / age data, estimate based on available biomarkers or use 40 as a default with a note.`,
  },

  comprehensive: {
    title: "Comprehensive Health Summary",
    systemAddendum: `Generate a COMPREHENSIVE HEALTH SUMMARY report. You must respond with valid JSON matching this structure exactly (no markdown, no code fences):

{
  "title": "Comprehensive Health Summary",
  "generatedAt": "<ISO timestamp>",
  "summary": "<3-4 sentence executive summary covering overall health status>",
  "overallScore": <0-100>,
  "sections": [
    {
      "title": "<section name>",
      "icon": "<body_comp|sleep|glucose|blood_pressure|heart|labs|genetics|nutrition|supplements|exercise|mental>",
      "score": <0-100 or null if insufficient data>,
      "status": "<optimal|good|fair|needs_attention|critical|no_data>",
      "summary": "<2-3 sentence summary of this area>",
      "metrics": [
        { "label": "<metric name>", "value": "<value with units>", "status": "<optimal|normal|borderline|concerning|critical>", "note": "<optional context>" }
      ],
      "recommendations": ["<rec 1>", "<rec 2>"]
    }
  ],
  "crossDomainInsights": [
    { "insight": "<pattern spanning multiple domains>", "domains": ["<domain1>", "<domain2>"], "action": "<recommended action>" }
  ],
  "prioritizedActions": [
    { "priority": <1-10>, "action": "<specific recommendation>", "category": "<category>", "impact": "<expected impact>", "effort": "<low|medium|high>" }
  ]
}

Cover ALL available health domains: body composition, sleep, glucose/metabolic, blood pressure, cardiovascular, labs/biomarkers, genetics, nutrition, supplements/protocol adherence, exercise, mental/stress. For each, reference the client's actual numbers. Identify cross-domain patterns (e.g., poor sleep correlating with glucose spikes). Prioritize actions by health impact.`,
  },

  metabolic: {
    title: "Metabolic & Glucose Report",
    systemAddendum: `Generate a METABOLIC & GLUCOSE focused report. You must respond with valid JSON matching this structure exactly (no markdown, no code fences):

{
  "title": "Metabolic & Glucose Report",
  "generatedAt": "<ISO timestamp>",
  "summary": "<2-3 sentence metabolic health summary>",
  "metabolicScore": <0-100>,
  "glucoseAnalysis": {
    "avgGlucose": <number or null>,
    "timeInRange": <percentage or null>,
    "spikeCount": <number or null>,
    "fastingEstimate": <number or null>,
    "variability": "<low|moderate|high|unknown>",
    "trend": "<improving|stable|declining|unknown>",
    "findings": ["<finding 1>", "<finding 2>"]
  },
  "bodyComposition": {
    "weight": "<value or unknown>",
    "bodyFat": "<value or unknown>",
    "assessment": "<1-2 sentences>",
    "recommendations": ["<rec>"]
  },
  "nutritionImpact": {
    "assessment": "<how current nutrition affects metabolic health>",
    "recommendations": ["<specific dietary recommendation>"]
  },
  "relevantBiomarkers": [
    { "name": "<marker>", "value": "<value>", "optimalRange": "<range>", "status": "<status>", "note": "<context>" }
  ],
  "geneticFactors": ["<relevant genetic factors affecting metabolism>"],
  "actionPlan": [
    { "priority": <1-5>, "action": "<specific metabolic optimization step>", "category": "<diet|supplement|exercise|lifestyle>", "expectedImpact": "<what this should improve>" }
  ]
}

Focus on metabolic health: glucose control, insulin sensitivity, body composition, lipid markers, thyroid function, and how genetics/nutrition/exercise interact with metabolic status. Reference specific numbers from the client's data.`,
  },

  recovery: {
    title: "Recovery & Performance Report",
    systemAddendum: `Generate a RECOVERY & PERFORMANCE report. You must respond with valid JSON matching this structure exactly (no markdown, no code fences):

{
  "title": "Recovery & Performance Report",
  "generatedAt": "<ISO timestamp>",
  "summary": "<2-3 sentence recovery status summary>",
  "recoveryScore": <0-100>,
  "sleepAnalysis": {
    "avgDuration": "<hours>",
    "avgQuality": <score or null>,
    "deepSleepPct": "<percentage or unknown>",
    "remSleepPct": "<percentage or unknown>",
    "consistency": "<consistent|variable|irregular|unknown>",
    "findings": ["<finding>"],
    "recommendations": ["<rec>"]
  },
  "autonomicHealth": {
    "restingHR": "<value or unknown>",
    "hrv": "<value or unknown>",
    "trend": "<improving|stable|declining|unknown>",
    "assessment": "<1-2 sentences>"
  },
  "stressAndRecovery": {
    "stressLevel": "<low|moderate|high|unknown>",
    "readiness": "<value or unknown>",
    "adrenalStatus": "<assessment based on symptoms/HRV>",
    "recommendations": ["<rec>"]
  },
  "exerciseReadiness": {
    "currentLoad": "<assessment>",
    "recommendations": ["<training recommendation>"]
  },
  "supplementSupport": [
    { "supplement": "<name>", "purpose": "<recovery benefit>", "status": "<currently_taking|recommended|consider>" }
  ],
  "actionPlan": [
    { "priority": <1-5>, "action": "<specific recovery optimization>", "category": "<sleep|exercise|supplement|lifestyle>", "expectedImpact": "<benefit>" }
  ]
}

Focus on recovery capacity: sleep architecture, HRV, stress markers, autonomic balance, exercise recovery, and how current protocols support or hinder recovery. Reference the client's actual sleep, HRV, and check-in data.`,
  },

  genetic_protocol: {
    title: "Genetic Risk & Protocol Alignment",
    systemAddendum: `Generate a GENETIC RISK & PROTOCOL ALIGNMENT report. You must respond with valid JSON matching this structure exactly (no markdown, no code fences):

{
  "title": "Genetic Risk & Protocol Alignment",
  "generatedAt": "<ISO timestamp>",
  "summary": "<2-3 sentence summary of genetic risks and how well the current protocol addresses them>",
  "alignmentScore": <0-100 — how well current protocol matches genetic needs>,
  "pathwayAnalysis": [
    {
      "pathway": "<pathway name>",
      "riskLevel": "<high|moderate|low>",
      "genesAffected": "<X/Y>",
      "keyMutations": ["<gene: mutation>"],
      "currentProtocolCoverage": "<fully_addressed|partially_addressed|not_addressed>",
      "supplementsAddressing": ["<supplement currently in protocol>"],
      "gaps": ["<what's missing from the protocol>"],
      "recommendations": ["<specific supplement/diet/lifestyle recommendation>"]
    }
  ],
  "protocolGaps": [
    { "gap": "<what genetic risk is not being addressed>", "risk": "<consequence of not addressing>", "solution": "<specific recommendation>" }
  ],
  "protocolRedundancies": [
    { "item": "<supplement/peptide that may not be needed>", "reason": "<why it may be redundant>" }
  ],
  "labCorrelations": [
    { "geneticRisk": "<genetic finding>", "labMarker": "<related biomarker>", "labValue": "<current value>", "interpretation": "<how lab confirms or contradicts genetic risk>" }
  ],
  "actionPlan": [
    { "priority": <1-5>, "action": "<specific protocol adjustment>", "category": "<supplement|peptide|diet|lifestyle|testing>", "rationale": "<genetic basis for recommendation>" }
  ]
}

Cross-reference the client's genetic markers and pathway scores against their current supplement/peptide protocol. Identify gaps where genetic risks exist but are not addressed by the protocol. Also identify where lab results confirm or contradict genetic predispositions. If no genetic data exists, note this and provide general recommendations.`,
  },
};

// ---------------------------------------------------------------------------
// POST handler — generate report
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const { reportType } = await req.json();
    if (!reportType || !REPORT_PROMPTS[reportType]) {
      return new Response(
        JSON.stringify({ error: "Invalid report type", validTypes: Object.keys(REPORT_PROMPTS) }),
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI reports are not configured. Please add ANTHROPIC_API_KEY." }),
        { status: 500 }
      );
    }

    // Gather all health data — truncate if too long to avoid token limits.
    // A failure here (e.g. a transient DB error) must not 500 the whole report;
    // fall back to a minimal context so the AI can still produce a useful
    // (if more general) report instead of failing outright.
    let healthContext: string;
    try {
      healthContext = await getClientContext(dbUser.id);
    } catch (ctxErr) {
      console.error("[Everist Report] health context failed, using minimal context:", ctxErr);
      healthContext =
        "Limited health data was available at report time. Base the report on general best practices and note where specific data was unavailable.";
    }
    if (healthContext.length > 50000) {
      healthContext = healthContext.slice(0, 50000) + "\n\n[... health context truncated for report generation ...]";
    }
    const reportConfig = REPORT_PROMPTS[reportType];

    const anthropic = new Anthropic({ apiKey });

    const response = await callWithRetry(
      () =>
        anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          // The Comprehensive report's JSON is large; 8192 truncated it mid-object
          // ("Failed to parse report"). Give it ample room to finish the object.
          max_tokens: 16000,
          system: `You are EVERIST AI, an advanced health analytics engine. You generate structured clinical health reports based on comprehensive client data. You must respond ONLY with valid JSON — no markdown, no code fences, no explanatory text before or after the JSON.

${reportConfig.systemAddendum}

--- COMPLETE CLIENT HEALTH PROFILE ---
${healthContext}`,
          messages: [
            {
              role: "user",
              content: `Generate my ${reportConfig.title} report now. Analyze all available data and produce the structured JSON report.`,
            },
          ],
        }),
      "Report Generation",
    );

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "No response from AI" }), { status: 500 });
    }

    // Parse and validate JSON — robustly, since the model can wrap output in
    // prose/fences or (if truncated) emit slightly malformed JSON.
    const reportData = parseReportJson(textBlock.text);
    if (reportData === undefined) {
      const truncated = response.stop_reason === "max_tokens";
      return new Response(
        JSON.stringify({
          error: truncated
            ? "The report was too long to finish generating. Please try again."
            : "Failed to parse report. Please try again.",
          raw: textBlock.text.slice(0, 500),
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ report: reportData, reportType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Everist Report Generation Error]", errMsg, err);

    // Check for specific Anthropic API errors
    if (errMsg.includes("model")) {
      return new Response(
        JSON.stringify({ error: `AI model error: ${errMsg.slice(0, 200)}` }),
        { status: 500 }
      );
    }
    if (errMsg.includes("token") || errMsg.includes("context")) {
      return new Response(
        JSON.stringify({ error: "Health profile too large for report generation. Try with fewer uploaded documents." }),
        { status: 500 }
      );
    }
    if (errMsg.includes("timeout") || errMsg.includes("TIMEOUT")) {
      return new Response(
        JSON.stringify({ error: "Report generation timed out. Please try again." }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ error: `Report generation failed: ${errMsg.slice(0, 200)}` }),
      { status: 500 }
    );
  }
}
