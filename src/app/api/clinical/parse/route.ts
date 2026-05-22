import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

// ---------------------------------------------------------------------------
// Document-type–specific parsing prompts
// ---------------------------------------------------------------------------

const DOC_PROMPTS: Record<string, string> = {
  dexa_scan: `Parse this DEXA / DXA body composition scan report. Extract ALL available data into this JSON structure:

{
  "title": "<report title or 'DEXA Scan'>",
  "reportDate": "<ISO date if found, else null>",
  "providerName": "<facility/provider name if found, else null>",
  "parsedData": {
    "totalBodyFatPct": <number or null>,
    "leanMassLbs": <number or null>,
    "fatMassLbs": <number or null>,
    "boneDensityTScore": <number or null>,
    "visceralFatArea": <number or null — in cm²>,
    "androidFatPct": <number or null>,
    "gynoidFatPct": <number or null>,
    "agRatio": <number or null>,
    "restingMetabolicRate": <number or null — in kcal>,
    "totalMassLbs": <number or null>,
    "bmi": <number or null>,
    "regions": {
      "arms": { "fatPct": <number>, "leanMassLbs": <number> },
      "legs": { "fatPct": <number>, "leanMassLbs": <number> },
      "trunk": { "fatPct": <number>, "leanMassLbs": <number> }
    }
  }
}`,

  gut_biome: `Parse this gut biome / microbiome analysis report. Extract ALL available data into this JSON structure:

{
  "title": "<report title or 'Gut Biome Analysis'>",
  "reportDate": "<ISO date if found, else null>",
  "providerName": "<lab/provider name if found, else null>",
  "parsedData": {
    "diversityScore": <number or null — 0-100>,
    "diversityRating": "<high|moderate|low|null>",
    "totalSpecies": <number or null>,
    "beneficialPct": <number or null>,
    "commensalPct": <number or null>,
    "pathogenicPct": <number or null>,
    "keyFindings": ["<finding 1>", "<finding 2>"],
    "probioticRecommendations": ["<recommendation>"],
    "dietaryRecommendations": ["<recommendation>"],
    "phyla": [
      { "name": "<phylum name>", "percentage": <number>, "status": "<normal|high|low>" }
    ],
    "keyBacteria": [
      { "name": "<species>", "level": "<high|normal|low|absent>", "significance": "<brief note>" }
    ],
    "functionalMarkers": [
      { "marker": "<name>", "value": "<value>", "status": "<normal|high|low>", "note": "<significance>" }
    ]
  }
}`,

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
    const { fileBase64, fileName, docType, mimeType } = body as {
      fileBase64: string;
      fileName: string;
      docType: string;
      mimeType: string;
    };

    if (!fileBase64 || !docType) {
      return new Response(
        JSON.stringify({ error: "fileBase64 and docType are required" }),
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

    // Determine media type for the vision API
    const mediaType = mimeType === "application/pdf"
      ? "application/pdf" as const
      : mimeType === "image/png"
      ? "image/png" as const
      : mimeType === "image/jpeg"
      ? "image/jpeg" as const
      : mimeType === "image/webp"
      ? "image/webp" as const
      : "application/pdf" as const;

    // Build content blocks — PDF uses document type, images use image type
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

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

    contentBlocks.push({
      type: "text",
      text: `Parse this clinical document (${fileName}). ${prompt}\n\nRespond ONLY with valid JSON — no markdown, no code fences, no explanatory text.`,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
    });

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
