import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { auth } from "@clerk/nextjs/server";
import { callWithRetry } from "@/lib/ai/retry";

// Allow longer processing time for large documents
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Document-type–specific parsing prompts
// ---------------------------------------------------------------------------

const DOC_PROMPTS: Record<string, string> = {
  dexa_scan: `Parse this DEXA / DXA body composition scan report (commonly from DexaFit, Hologic, or Lunar). Extract ALL available data. Use the MOST RECENT measurement date row if multiple dates are shown.

{
  "title": "<report title or 'DEXA Scan'>",
  "reportDate": "<the Measure Date / Measured Date in YYYY-MM-DD format, else null>",
  "providerName": "<facility/provider name if found, else null>",
  "parsedData": {
    "totalBodyFatPct": <Total Body Fat % as number, e.g. 17.6>,
    "totalMassLbs": <Total Mass / Weight in lbs as number, e.g. 170.3>,
    "fatMassLbs": <Fat Tissue / Fat Mass in lbs as number, e.g. 30.0>,
    "leanMassLbs": <Lean Tissue / Lean Mass in lbs as number, e.g. 133.2>,
    "boneMineralContent": <BMC / Bone Mineral Content in lbs as number, e.g. 7.1>,
    "visceralFatLbs": <Visceral Fat Mass in lbs as number, e.g. 0.78>,
    "androidFatPct": <Android Body Fat % as number, e.g. 17.1>,
    "gynoidFatPct": <Gynoid Body Fat % as number, e.g. 16.2>,
    "agRatio": <Android/Gynoid Ratio as number, e.g. 1.03>,
    "androidFatMass": <Android Fat Mass in lbs as number or null>,
    "restingMetabolicRate": <RMR in kcal as number or null>,
    "bmi": <BMI as number or null>,
    "regions": {
      "arms": { "fatPct": <number>, "fatLbs": <number>, "leanLbs": <number>, "totalLbs": <number> },
      "legs": { "fatPct": <number>, "fatLbs": <number>, "leanLbs": <number>, "totalLbs": <number> },
      "trunk": { "fatPct": <number>, "fatLbs": <number>, "leanLbs": <number>, "totalLbs": <number> }
    }
  }
}

IMPORTANT: If the report shows data for multiple measurement dates (comparison view), extract ONLY the most recent date's values. Look for "Measured Date", "Measure Date", or similar headers. DexaFit reports typically show the summary table at the top with Total Body Fat %, Total Mass, Fat Tissue, Lean Tissue, BMC, and Visceral Fat columns.`,

  gut_biome: `Parse this gut biome / microbiome analysis report. This may be from Viome, GI-MAP, Genova, or other providers. Extract ALL available data into this JSON structure:

{
  "title": "<report title or 'Gut Biome Analysis'>",
  "reportDate": "<ISO date (YYYY-MM-DD) from 'Date Collected' or 'Date reported', else null>",
  "providerName": "<lab/provider name — e.g. 'Viome', 'Diagnostic Solutions', else null>",
  "parsedData": {
    "testType": "<viome|gi_map|genova|other>",
    "healthScores": [
      {
        "name": "<score name — e.g. 'BioAge', 'Gut & Digestive Health', 'Immunity', 'Inflammaging', 'Energy Production Pathways', etc.>",
        "status": "<maintain|improve|attention>",
        "category": "<overall|pathway> — 'overall' for top-level scores like BioAge, Energy & Performance; 'pathway' for specific pathways>",
        "description": "<1-2 sentence summary of what this score means for this person>"
      }
    ],
    "activeMicrobes": [
      {
        "name": "<organism name — e.g. 'Bacteroides uniformis', 'Candida albicans'>",
        "type": "<bacterium|virus|eukaryote|probiotic|archaeon>",
        "source": "<gut|oral|null>"
      }
    ],
    "diversityScore": <number 0-100 or null — only if explicitly provided>,
    "diversityRating": "<high|moderate|low|null>",
    "totalSpecies": <number or null>,
    "keyFindings": ["<key finding or summary point>"],
    "dietaryRecommendations": ["<food or dietary recommendation>"],
    "supplementRecommendations": ["<supplement recommendation>"],
    "foodsToAvoid": ["<food to minimize or avoid>"],
    "foodsToEnjoy": ["<food to increase>"]
  }
}

IMPORTANT for Viome reports:
- Extract ALL health scores (there are typically 25-30). Each has a name and a rating of Maintain (green), Improve (yellow/amber), or Attention (red).
- Top-level scores like BioAge, Energy & Performance, Gut & Digestive Health, Immunity, Inflammaging should have category "overall".
- Pathway-specific scores should have category "pathway".
- Extract ALL active microbes from the "My Active Microbes" / "My Active Gut Microbes" lists. Include the organism type (Bacterium, Virus, Eukaryote, Probiotic, Archaeon).
- If the document includes food recommendations (Superfoods, Enjoy, Minimize, Avoid), extract those into the appropriate arrays.`,

  medical_record: `Parse this medical record / clinical document. Extract ALL available data into this JSON structure:

{
  "title": "<document title or type>",
  "reportDate": "<ISO date if found, else null>",
  "providerName": "<provider/facility name if found, else null>",
  "parsedData": {
    "documentType": "<lab_report|physical_exam|imaging|consultation|prescription|discharge_summary|other>",
    "patientInfo": {
      "age": <number or null>,
      "sex": "<M|F|null>",
      "height": "<value or null>",
      "weight": "<value or null>"
    },
    "diagnoses": ["<diagnosis>"],
    "medications": [
      { "name": "<med name>", "dosage": "<dosage>", "frequency": "<frequency>", "notes": "<notes>" }
    ],
    "vitalSigns": {
      "bloodPressure": "<value or null>",
      "heartRate": <number or null>,
      "temperature": "<value or null>",
      "respiratoryRate": <number or null>,
      "oxygenSaturation": "<value or null>"
    },
    "labResults": [
      { "name": "<test name>", "value": "<value>", "unit": "<unit>", "referenceRange": "<range>", "status": "<normal|high|low|critical>" }
    ],
    "findings": ["<key finding>"],
    "recommendations": ["<recommendation>"],
    "followUp": "<follow-up instructions or null>"
  }
}`,

  genetics: `Parse this genetic / genomic / DNA test report. Extract ALL available data into this JSON structure.

IMPORTANT: Extract EVERY gene variant you can find in the document. Group them by biological pathway. For each variant, determine the risk level from the genotype notation — (+/+) or homozygous mutant = "high", (+/-) or heterozygous = "moderate", (-/-) or wild type = "low". Include the genotype exactly as shown (e.g. "CT", "GG", "T/C (+/-)").

{
  "title": "<report title or 'Genetic Analysis'>",
  "reportDate": "<ISO date if found, else null>",
  "providerName": "<lab/provider name if found, else null>",
  "parsedData": {
    "testType": "<whole_genome|exome|snp_panel|pharmacogenomic|carrier_screening|nutrigenomic|other>",
    "pathways": [
      {
        "name": "<pathway name — e.g. Methylation, Detoxification, Inflammation, Autophagy, Mitochondria, Homocysteine, Neurotransmitter, External Inflammatory>",
        "riskLevel": "<high|moderate|low>",
        "genesAffected": "<X/Y — genes with variants / total genes tested in this pathway>",
        "variants": [
          {
            "gene": "<gene name e.g. MTHFR, COMT, SOD2>",
            "rsid": "<rs number e.g. rs1801133>",
            "genotype": "<full genotype string e.g. 'T/C (+/-)' or 'GG (-/-)'>",
            "impact": "<high|moderate|low>",
            "description": "<what this gene/variant does — enzyme function, metabolic role>"
          }
        ],
        "recommendations": ["<recommendation based on pathway findings>"]
      }
    ],
    "pharmacogenomics": [
      { "drug": "<drug name>", "metabolism": "<poor|intermediate|normal|rapid|ultrarapid>", "recommendation": "<dosing guidance>" }
    ],
    "healthRisks": [
      { "condition": "<condition>", "risk": "<elevated|average|reduced>", "confidence": "<high|moderate|low>", "notes": "<context>" }
    ],
    "nutritionalGenomics": [
      { "nutrient": "<nutrient>", "finding": "<finding>", "recommendation": "<dietary recommendation>" }
    ],
    "summary": "<2-3 sentence overall genetic profile summary>"
  }
}

If the document is a nutrigenomic report (like Fagron Pro7), pay special attention to:
- Section groupings (Inflammatory, External Inflammatory, Autophagy, Mitochondria, Methylation, etc.)
- The (+/+), (+/-), (-/-) notation for each gene
- rsID numbers for each variant
- Extract ALL genes even if they show normal/wild-type results`,

  lab_result: `Parse this blood work / laboratory results report. Extract ALL available data into this JSON structure:

{
  "title": "<report title or 'Lab Results'>",
  "reportDate": "<ISO date if found, else null>",
  "providerName": "<lab/provider name if found, else null>",
  "parsedData": {
    "panels": [
      {
        "name": "<panel name — e.g. Complete Blood Count, Metabolic Panel, Lipid Panel, Thyroid>",
        "markers": [
          {
            "name": "<marker name>",
            "value": <number or null>,
            "valueText": "<original value string>",
            "unit": "<unit>",
            "referenceRange": "<lab reference range>",
            "optimalRange": "<functional medicine optimal range if you know it>",
            "status": "<optimal|normal|borderline|high|low|critical>",
            "flag": "<H|L|C|null — as shown on report>"
          }
        ]
      }
    ],
    "criticalFindings": ["<any critical or flagged results>"],
    "summary": "<2-3 sentence summary of overall lab picture>"
  }
}`,
};

// ---------------------------------------------------------------------------
// POST handler — accept PDF as base64, parse with Claude Vision
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI parsing is not configured. Please add ANTHROPIC_API_KEY." }),
        { status: 500 }
      );
    }

    const body = await req.json();
    const { fileBase64, fileName, docType, mimeType, pageImages } = body as {
      fileBase64?: string;
      fileName: string;
      docType: string;
      mimeType?: string;
      pageImages?: string[]; // Array of base64-encoded JPEG page images (for large PDFs)
    };

    if ((!fileBase64 && (!pageImages || pageImages.length === 0)) || !docType) {
      return new Response(
        JSON.stringify({ error: "fileBase64 or pageImages required, plus docType" }),
        { status: 400 }
      );
    }

    const prompt = DOC_PROMPTS[docType];
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Invalid docType", validTypes: Object.keys(DOC_PROMPTS) }),
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build content blocks
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    if (pageImages && pageImages.length > 0) {
      // Large PDF mode: pages were rendered as images on the client
      for (const pageImg of pageImages) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: pageImg,
          },
        });
      }
    } else if (fileBase64) {
      // Small file mode: send as document or image
      const mediaType = mimeType === "application/pdf"
        ? "application/pdf" as const
        : mimeType === "image/png"
        ? "image/png" as const
        : mimeType === "image/jpeg"
        ? "image/jpeg" as const
        : mimeType === "image/webp"
        ? "image/webp" as const
        : "application/pdf" as const;

      if (mediaType === "application/pdf") {
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fileBase64,
          },
        } as unknown as Anthropic.ContentBlockParam);
      } else {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: fileBase64,
          },
        });
      }
    }

    contentBlocks.push({
      type: "text",
      text: `Parse this clinical document (${fileName}). ${prompt}\n\nRespond ONLY with valid JSON — no markdown, no code fences, no explanatory text.`,
    });

    const response = await callWithRetry(
      () =>
        anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: contentBlocks,
            },
          ],
        }),
      "Clinical Document Parsing",
    );

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "No response from AI" }), { status: 500 });
    }

    // Parse JSON
    let parsed: unknown;
    try {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: textBlock.text.slice(0, 500) }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Everist Clinical Parse Error]", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
