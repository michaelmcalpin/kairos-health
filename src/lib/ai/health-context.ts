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
  heartRateReadings,
  hrvReadings,
  dailyCheckins,
  labResults,
  biomarkerValues,
  biomarkerDefinitions,
  geneticProfiles,
  geneticMarkers,
  geneticPathwayScores,
  clinicalDocuments,
  symptomAssessments,
  fastingProtocols,
  fastingLogs,
  mealLogs,
  healthGoals,
  adherenceLogs,
  exerciseScreenings,
  workoutLogs,
  workoutPrograms,
  clientWorkoutAssignments,
  workoutSessions,
  mealPlans,
  activitySummaries,
  peptideCycles,
  peptideLogs,
  appointments,
} from "@/server/db/schema";
import { eq, desc, and, gte, ne } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Comprehensive health context builder — shared by chat + report generation
// ---------------------------------------------------------------------------

export async function getClientContext(dbUserId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().split("T")[0];

  // ── Batch 1: Core profile + biometrics ──────────────────
  const [
    user,
    profile,
    latestMeasurement,
    recentSleep,
    recentGlucose,
    recentBP,
    activeProtocol,
    recentHR,
    latestHRV,
    recentCheckins,
    latestSymptoms,
  ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, dbUserId) }),
    db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, dbUserId) }),
    db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.clientId, dbUserId),
      orderBy: desc(bodyMeasurements.date),
    }),
    db.query.sleepSessions.findMany({
      where: and(eq(sleepSessions.clientId, dbUserId), gte(sleepSessions.date, sevenDaysStr)),
      orderBy: desc(sleepSessions.date),
      limit: 7,
    }),
    db.query.glucoseReadings.findMany({
      where: and(eq(glucoseReadings.clientId, dbUserId), gte(glucoseReadings.timestamp, thirtyDaysAgo)),
      orderBy: desc(glucoseReadings.timestamp),
      limit: 30,
    }),
    db.query.bloodPressureReadings.findMany({
      where: and(eq(bloodPressureReadings.clientId, dbUserId), gte(bloodPressureReadings.date, thirtyDaysStr)),
      orderBy: desc(bloodPressureReadings.date),
      limit: 10,
    }),
    db.query.supplementProtocols.findFirst({
      where: and(eq(supplementProtocols.clientId, dbUserId), eq(supplementProtocols.status, "active")),
    }),
    db.query.heartRateReadings.findMany({
      where: and(eq(heartRateReadings.clientId, dbUserId), gte(heartRateReadings.timestamp, sevenDaysAgo)),
      orderBy: desc(heartRateReadings.timestamp),
      limit: 10,
    }),
    db.query.hrvReadings.findFirst({
      where: eq(hrvReadings.clientId, dbUserId),
      orderBy: desc(hrvReadings.timestamp),
    }),
    db.query.dailyCheckins.findMany({
      where: and(eq(dailyCheckins.clientId, dbUserId), gte(dailyCheckins.date, sevenDaysStr)),
      orderBy: desc(dailyCheckins.date),
      limit: 7,
    }),
    db.query.symptomAssessments.findFirst({
      where: eq(symptomAssessments.clientId, dbUserId),
      orderBy: desc(symptomAssessments.weekStart),
    }),
  ]);

  // ── Batch 2: Clinical data (genetics, labs, docs, protocols) ──
  const [
    geneticProfile,
    clinicalDocs,
    fastingProto,
    recentFastingLogs,
    recentMeals,
    activeGoals,
  ] = await Promise.all([
    // Include any genetics profile that isn't in "error" state — markers may be
    // imported even when the profile is still "pending" or "processing".
    db.query.geneticProfiles.findFirst({
      where: and(
        eq(geneticProfiles.clientId, dbUserId),
        ne(geneticProfiles.status, "error"),
      ),
      orderBy: desc(geneticProfiles.createdAt),
    }),
    db.query.clinicalDocuments.findMany({
      where: eq(clinicalDocuments.clientId, dbUserId),
      orderBy: desc(clinicalDocuments.reportDate),
      limit: 10,
    }),
    db.query.fastingProtocols.findFirst({
      where: and(eq(fastingProtocols.clientId, dbUserId), eq(fastingProtocols.status, "active")),
    }),
    db.query.fastingLogs.findMany({
      where: and(eq(fastingLogs.clientId, dbUserId), gte(fastingLogs.date, sevenDaysStr)),
      orderBy: desc(fastingLogs.date),
      limit: 7,
    }),
    db.query.mealLogs.findMany({
      where: and(eq(mealLogs.clientId, dbUserId), gte(mealLogs.date, sevenDaysStr)),
      orderBy: desc(mealLogs.date),
      limit: 14,
    }),
    db.query.healthGoals.findMany({
      where: and(eq(healthGoals.clientId, dbUserId), eq(healthGoals.status, "active")),
      limit: 10,
    }),
  ]);

  // ── Batch 2b: Additional data sources ──────────────────
  const [recentWorkouts, activeMealPlan, recentActivity, activePeptides, upcomingAppts, activeWorkoutAssignment] = await Promise.all([
    db.query.workoutLogs.findMany({
      where: and(eq(workoutLogs.clientId, dbUserId), gte(workoutLogs.date, sevenDaysStr)),
      orderBy: desc(workoutLogs.date),
      limit: 10,
    }),
    db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.clientId, dbUserId), eq(mealPlans.status, "active")),
      orderBy: desc(mealPlans.createdAt),
    }),
    db.query.activitySummaries.findMany({
      where: and(eq(activitySummaries.clientId, dbUserId), gte(activitySummaries.date, sevenDaysStr)),
      orderBy: desc(activitySummaries.date),
      limit: 7,
    }),
    db.query.peptideCycles.findMany({
      where: and(eq(peptideCycles.clientId, dbUserId), eq(peptideCycles.status, "active")),
    }).catch(() => [] as typeof peptideCycles.$inferSelect[]),
    db.query.appointments.findMany({
      where: and(eq(appointments.clientId, dbUserId), gte(appointments.date, new Date().toISOString().split("T")[0])),
      orderBy: appointments.date,
      limit: 5,
    }),
    db.query.clientWorkoutAssignments.findFirst({
      where: and(eq(clientWorkoutAssignments.clientId, dbUserId), eq(clientWorkoutAssignments.status, "active")),
    }),
  ]);

  // ── Batch 3: Dependent queries ──────────────────────────
  const [activeItems, geneticMarkersData, pathwayScores, latestBiomarkers] = await Promise.all([
    activeProtocol
      ? db.query.protocolItems.findMany({ where: eq(protocolItems.protocolId, activeProtocol.id) })
      : Promise.resolve([]),
    geneticProfile
      ? db.query.geneticMarkers.findMany({
          where: eq(geneticMarkers.profileId, geneticProfile.id),
          limit: 100,
        })
      : Promise.resolve([]),
    geneticProfile
      ? db.query.geneticPathwayScores.findMany({
          where: eq(geneticPathwayScores.profileId, geneticProfile.id),
        })
      : Promise.resolve([]),
    db
      .select({
        code: biomarkerValues.biomarkerCode,
        value: biomarkerValues.value,
        unit: biomarkerValues.unit,
        refLow: biomarkerValues.refLow,
        refHigh: biomarkerValues.refHigh,
        status: biomarkerValues.status,
        name: biomarkerDefinitions.name,
        category: biomarkerDefinitions.category,
      })
      .from(biomarkerValues)
      .innerJoin(labResults, eq(biomarkerValues.resultId, labResults.id))
      .leftJoin(biomarkerDefinitions, eq(biomarkerValues.biomarkerCode, biomarkerDefinitions.code))
      .where(eq(labResults.clientId, dbUserId))
      .orderBy(desc(labResults.receivedAt))
      .limit(80),
  ]);

  // ── Adherence stats ─────────────────────────────────────
  let adherenceStats = { total: 0, taken: 0 };
  if (activeProtocol) {
    const recentAdherence = await db.query.adherenceLogs.findMany({
      where: and(eq(adherenceLogs.clientId, dbUserId), gte(adherenceLogs.date, sevenDaysStr)),
    });
    adherenceStats.total = recentAdherence.length;
    adherenceStats.taken = recentAdherence.filter((a) => !a.skipped).length;
  }

  // ─────────────────────────────────────────────────────────
  // Build the context string
  // ─────────────────────────────────────────────────────────
  const sections: string[] = [];

  // ── 1. Client Profile ───────────────────────────────────
  if (user || profile) {
    const profileParts: string[] = [];
    if (user) profileParts.push(`Name: ${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
    if (profile) {
      const age = profile.dateOfBirth
        ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 86400000))
        : null;
      if (age) profileParts.push(`Age: ${age}`);
      if (profile.gender) profileParts.push(`Gender: ${profile.gender}`);
      if (profile.heightInches) {
        profileParts.push(`Height: ${Math.floor(profile.heightInches / 12)}'${Math.round(profile.heightInches % 12)}"`);
      }
      if (profile.tier) profileParts.push(`Tier: ${profile.tier}`);
      if (profile.goals?.length) profileParts.push(`Goals: ${profile.goals.join(", ")}`);
    }
    sections.push(`## CLIENT PROFILE\n${profileParts.join(" | ")}`);
  }

  // ── 2. Body Measurements ────────────────────────────────
  if (latestMeasurement) {
    const m = latestMeasurement;
    const mParts = [
      m.weightLbs ? `Weight: ${m.weightLbs} lbs` : null,
      m.bodyFatPct ? `Body fat: ${m.bodyFatPct}%` : null,
      m.waistInches ? `Waist: ${m.waistInches}"` : null,
      m.chestInches ? `Chest: ${m.chestInches}"` : null,
      m.hipsInches ? `Hips: ${m.hipsInches}"` : null,
      m.neckInches ? `Neck: ${m.neckInches}"` : null,
      m.shouldersInches ? `Shoulders: ${m.shouldersInches}"` : null,
    ].filter(Boolean);
    sections.push(`## BODY MEASUREMENTS (${m.date})\n${mParts.join(" | ")}`);
  }

  // ── 3. Sleep Data ───────────────────────────────────────
  if (recentSleep.length > 0) {
    const avgDur = recentSleep.reduce((s: number, r) => s + (r.totalMinutes ?? 0), 0) / recentSleep.length;
    const scored = recentSleep.filter((s) => s.score != null);
    const avgScore = scored.length > 0 ? scored.reduce((s: number, r) => s + (r.score ?? 0), 0) / scored.length : null;
    const details = recentSleep.slice(0, 5).map((s) => {
      const parts = [`${s.date}: ${s.totalMinutes ? (s.totalMinutes / 60).toFixed(1) : "?"}hrs`];
      if (s.score) parts.push(`score=${s.score}`);
      if (s.deepMinutes) parts.push(`deep=${s.deepMinutes}min`);
      if (s.remMinutes) parts.push(`REM=${s.remMinutes}min`);
      if (s.awakeMinutes) parts.push(`awake=${s.awakeMinutes}min`);
      return parts.join(", ");
    });
    let sleepSection = `## SLEEP (Last 7 Days)\nAvg duration: ${(avgDur / 60).toFixed(1)} hrs`;
    if (avgScore) sleepSection += ` | Avg score: ${Math.round(avgScore)}/100`;
    sleepSection += `\nRecent nights:\n${details.join("\n")}`;
    sections.push(sleepSection);
  }

  // ── 4. CGM / Glucose ────────────────────────────────────
  if (recentGlucose.length > 0) {
    const vals = recentGlucose.map((g) => g.valueMgdl);
    const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    const inRange = vals.filter((v: number) => v >= 70 && v <= 140).length;
    const spikes = vals.filter((v: number) => v > 140).length;
    sections.push(
      `## GLUCOSE / CGM (Last 30 Days, ${recentGlucose.length} readings)\n` +
      `Avg: ${Math.round(avg)} mg/dL | Range: ${Math.round(Math.min(...vals))}-${Math.round(Math.max(...vals))} mg/dL\n` +
      `Time in range (70-140): ${Math.round((inRange / vals.length) * 100)}% | Spike readings (>140): ${spikes}`
    );
  }

  // ── 5. Blood Pressure ───────────────────────────────────
  if (recentBP.length > 0) {
    const avgSys = recentBP.reduce((s: number, r) => s + r.systolic, 0) / recentBP.length;
    const avgDia = recentBP.reduce((s: number, r) => s + r.diastolic, 0) / recentBP.length;
    const latest = recentBP[0];
    let bpCat = "Normal";
    if (avgSys > 180 || avgDia > 120) bpCat = "CRISIS";
    else if (avgSys >= 140 || avgDia >= 90) bpCat = "Stage 2 Hypertension";
    else if (avgSys >= 130 || avgDia >= 80) bpCat = "Stage 1 Hypertension";
    else if (avgSys >= 120) bpCat = "Elevated";
    sections.push(
      `## BLOOD PRESSURE (Last 30 Days, ${recentBP.length} readings)\n` +
      `Avg: ${Math.round(avgSys)}/${Math.round(avgDia)} mmHg | Category: ${bpCat}\n` +
      `Latest (${latest.date}): ${latest.systolic}/${latest.diastolic} mmHg${latest.pulse ? ` | Pulse: ${latest.pulse} bpm` : ""}`
    );
  }

  // ── 6. Heart Rate & HRV ─────────────────────────────────
  if (recentHR.length > 0 || latestHRV) {
    const hrParts: string[] = [];
    if (recentHR.length > 0) {
      const avgHR = recentHR.reduce((s: number, r) => s + r.bpm, 0) / recentHR.length;
      hrParts.push(`Avg HR (7d): ${Math.round(avgHR)} bpm | Range: ${Math.min(...recentHR.map((r) => r.bpm))}-${Math.max(...recentHR.map((r) => r.bpm))} bpm`);
    }
    if (latestHRV) {
      hrParts.push(`Latest HRV (RMSSD): ${latestHRV.rmssd} ms`);
    }
    sections.push(`## HEART RATE & HRV\n${hrParts.join("\n")}`);
  }

  // ── 7. Lab Results / Biomarkers ─────────────────────────
  if (latestBiomarkers.length > 0) {
    const seen = new Set<string>();
    const unique = latestBiomarkers.filter((b) => {
      if (seen.has(b.code)) return false;
      seen.add(b.code);
      return true;
    });

    const byCategory: Record<string, typeof unique> = {};
    for (const b of unique) {
      const cat = b.category ?? "Other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(b);
    }

    const labLines: string[] = [];
    for (const cat of Object.keys(byCategory)) {
      const markers = byCategory[cat];
      labLines.push(`**${cat}:**`);
      for (const m of markers.slice(0, 10)) {
        const range = m.refLow != null && m.refHigh != null ? ` (ref: ${m.refLow}-${m.refHigh})` : "";
        const flag = m.status && m.status !== "normal" ? ` [${m.status.toUpperCase()}]` : "";
        labLines.push(`  ${m.name ?? m.code}: ${m.value} ${m.unit ?? ""}${range}${flag}`);
      }
    }
    sections.push(`## LAB RESULTS / BIOMARKERS (Latest)\n${labLines.join("\n")}`);
  }

  // ── 8. Genetic Profile ──────────────────────────────────
  if (geneticProfile && geneticMarkersData.length === 0 && pathwayScores.length === 0) {
    // Profile exists but no markers parsed yet — tell the AI it exists
    sections.push(
      `## GENETIC PROFILE\nGenetic profile uploaded (status: ${geneticProfile.status}).` +
      `${geneticProfile.uploadType ? ` Source: ${geneticProfile.uploadType}.` : ""}` +
      ` Marker data is still being processed — results will appear once parsing is complete.`
    );
  } else if (geneticMarkersData.length > 0 || pathwayScores.length > 0) {
    const genLines: string[] = [];

    if (pathwayScores.length > 0) {
      genLines.push("**Pathway Risk Summary:**");
      for (const p of pathwayScores.sort((a, b) => (b.homozygousCount ?? 0) - (a.homozygousCount ?? 0)).slice(0, 15)) {
        genLines.push(
          `  ${p.pathway}: ${p.genesAffected ?? 0}/${p.genesInPathway ?? 0} genes affected (${p.homozygousCount ?? 0} homozygous, ${p.heterozygousCount ?? 0} heterozygous) — Priority: ${p.priorityLevel ?? "unknown"}`
        );
      }
    }

    if (geneticMarkersData.length > 0) {
      const highPriority = geneticMarkersData
        .filter((m) => m.clinicalPriority === "high" || m.clinicalPriority === "critical")
        .slice(0, 20);
      const medPriority = geneticMarkersData
        .filter((m) => m.clinicalPriority === "medium")
        .slice(0, 10);

      if (highPriority.length > 0) {
        genLines.push("\n**High-Priority Genetic Mutations:**");
        for (const m of highPriority) {
          genLines.push(`  ${m.gene} (${m.rsId ?? ""}): ${m.mutation ?? "variant"} — ${m.pathway ?? ""}`);
          if (m.symptoms) genLines.push(`    Symptoms: ${m.symptoms}`);
          if (m.supplementProtocol) genLines.push(`    Supplement strategy: ${m.supplementProtocol}`);
          if (m.peptideSupport) genLines.push(`    Peptide support: ${m.peptideSupport}`);
          if (m.dietStrategy) genLines.push(`    Diet strategy: ${m.dietStrategy}`);
          if (m.lifestyleStrategy) genLines.push(`    Lifestyle strategy: ${m.lifestyleStrategy}`);
        }
      }

      if (medPriority.length > 0) {
        genLines.push("\n**Medium-Priority Genetic Mutations:**");
        for (const m of medPriority) {
          genLines.push(`  ${m.gene} (${m.rsId ?? ""}): ${m.mutation ?? "variant"} — ${m.pathway ?? ""}`);
          if (m.dietStrategy) genLines.push(`    Diet: ${m.dietStrategy}`);
          if (m.supplementProtocol) genLines.push(`    Supplements: ${m.supplementProtocol}`);
        }
      }
    }

    sections.push(`## GENETIC PROFILE\n${genLines.join("\n")}`);
  }

  // ── 9. Clinical Documents ───────────────────────────────
  const dexaDocs = clinicalDocs.filter((d) => d.docType === "dexa_scan");
  const gutDocs = clinicalDocs.filter((d) => d.docType === "gut_biome");
  const medDocs = clinicalDocs.filter((d) => d.docType === "medical_record");

  if (dexaDocs.length > 0) {
    const latest = dexaDocs[0];
    const dp = latest.parsedData as Record<string, unknown> | null;
    let dexaInfo = `**Latest DEXA Scan** (${latest.reportDate ?? "unknown date"})`;
    if (dp && Object.keys(dp).length > 0) {
      const dParts: string[] = [];
      // Check both camelCase and snake_case field names to handle varied parsing
      const get = (keys: string[]) => {
        for (const k of keys) if (dp[k] != null) return dp[k];
        return null;
      };
      const bodyFat = get(["totalBodyFatPct", "total_body_fat_pct", "bodyFatPercentage", "body_fat_percentage"]);
      const totalMass = get(["totalMassLbs", "total_mass_lbs", "totalWeight", "total_weight"]);
      const leanMass = get(["leanMassLbs", "lean_mass_lbs", "leanMass", "lean_mass"]);
      const fatMass = get(["fatMassLbs", "fat_mass_lbs", "fatMass", "fat_mass"]);
      const bmc = get(["boneMineralContent", "bone_mineral_content", "bmc", "BMC"]);
      const visceral = get(["visceralFatLbs", "visceral_fat_lbs", "visceralFat", "visceral_fat"]);
      const androidFat = get(["androidFatPct", "android_fat_pct", "androidFat", "android_fat"]);
      const gynoidFat = get(["gynoidFatPct", "gynoid_fat_pct", "gynoidFat", "gynoid_fat"]);
      const agRatio = get(["agRatio", "ag_ratio", "a_g_ratio"]);
      const tScore = get(["tScore", "t_score"]);
      const zScore = get(["zScore", "z_score"]);
      const bmd = get(["boneMineralDensity", "bone_mineral_density", "bmd"]);

      if (bodyFat != null) dParts.push(`Body Fat: ${bodyFat}%`);
      if (totalMass != null) dParts.push(`Total Mass: ${totalMass} lbs`);
      if (leanMass != null) dParts.push(`Lean Mass: ${leanMass} lbs`);
      if (fatMass != null) dParts.push(`Fat Mass: ${fatMass} lbs`);
      if (bmc != null) dParts.push(`BMC: ${bmc} lbs`);
      if (visceral != null) dParts.push(`Visceral Fat: ${visceral} lbs`);
      if (androidFat != null) dParts.push(`Android Fat: ${androidFat}%`);
      if (gynoidFat != null) dParts.push(`Gynoid Fat: ${gynoidFat}%`);
      if (agRatio != null) dParts.push(`A/G Ratio: ${agRatio}`);
      if (tScore != null) dParts.push(`T-Score: ${tScore}`);
      if (zScore != null) dParts.push(`Z-Score: ${zScore}`);
      if (bmd != null) dParts.push(`BMD: ${bmd}`);

      if (dParts.length > 0) {
        dexaInfo += `\n${dParts.join(" | ")}`;
      } else {
        // parsedData exists but has no recognized fields — dump top-level keys
        const summary = Object.entries(dp)
          .filter(([, v]) => v != null && typeof v !== "object")
          .slice(0, 15)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        if (summary) dexaInfo += `\n${summary}`;
      }
    } else {
      // No parsed data — still tell the AI a DEXA exists
      dexaInfo += `\nStatus: ${latest.status ?? "pending"} (document uploaded, awaiting full parsing)`;
      if (latest.title) dexaInfo += `\nTitle: ${latest.title}`;
    }
    // Show comparison if 2+ scans
    if (dexaDocs.length >= 2) {
      const prev = dexaDocs[1].parsedData as Record<string, unknown> | null;
      if (prev && dp) {
        const prevFat = prev.totalBodyFatPct ?? prev.total_body_fat_pct ?? prev.bodyFatPercentage;
        const curFat = dp.totalBodyFatPct ?? dp.total_body_fat_pct ?? dp.bodyFatPercentage;
        if (prevFat != null && curFat != null) {
          const prevLean = prev.leanMassLbs ?? prev.lean_mass_lbs ?? prev.leanMass;
          dexaInfo += `\nPrevious scan (${dexaDocs[1].reportDate ?? "?"}): Body Fat ${prevFat}%${prevLean ? ` | Lean ${prevLean} lbs` : ""}`;
        }
      }
    }
    sections.push(`## DEXA SCAN\n${dexaInfo}`);
  }

  if (gutDocs.length > 0) {
    const latest = gutDocs[0];
    const gp = latest.parsedData as Record<string, unknown> | null;
    let gutInfo = `**Latest Gut Biome Report** (${latest.reportDate ?? "unknown date"})`;
    if (gp && Object.keys(gp).length > 0) {
      const healthScores = gp.healthScores as Array<{ name: string; status: string }> | undefined;
      if (healthScores?.length) {
        const attention = healthScores.filter(s => s.status?.toLowerCase() === "attention");
        const improve = healthScores.filter(s => s.status?.toLowerCase() === "improve");
        const maintain = healthScores.filter(s => s.status?.toLowerCase() === "maintain");
        gutInfo += `\nScores: ${maintain.length} Maintain, ${improve.length} Improve, ${attention.length} Attention`;
        if (attention.length > 0) gutInfo += `\nAttention areas: ${attention.map(s => s.name).join(", ")}`;
        if (improve.length > 0) gutInfo += `\nImprove areas: ${improve.map(s => s.name).join(", ")}`;
      }
      if (gp.diversityScore != null) gutInfo += `\nDiversity Score: ${gp.diversityScore}/100 (${gp.diversityRating ?? "?"})`;
      const microbes = gp.activeMicrobes as Array<{ name: string; type: string }> | undefined;
      if (microbes?.length) gutInfo += `\nActive microbes: ${microbes.length} detected`;
      // Fallback: dump top-level keys if no specific fields matched
      if (!healthScores?.length && gp.diversityScore == null && !microbes?.length) {
        const summary = Object.entries(gp)
          .filter(([, v]) => v != null && typeof v !== "object")
          .slice(0, 10)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        if (summary) gutInfo += `\n${summary}`;
      }
    } else {
      gutInfo += `\nStatus: ${latest.status ?? "pending"} (document uploaded, awaiting full parsing)`;
    }
    sections.push(`## GUT BIOME\n${gutInfo}`);
  }

  if (medDocs.length > 0) {
    const medLines = medDocs.slice(0, 5).map((d) => {
      const pd = d.parsedData as Record<string, unknown> | null;
      let line = `### ${d.title ?? "Medical Record"} (${d.reportDate ?? "unknown"})`;
      if (d.providerName) line += ` — ${d.providerName}`;

      if (pd) {
        const docType = pd.documentType as string | undefined;
        if (docType) line += `\nType: ${docType}`;

        // Vitals
        const vitals = pd.vitalSigns as Record<string, unknown> | undefined;
        if (vitals) {
          const vParts: string[] = [];
          if (vitals.bloodPressure) vParts.push(`BP: ${vitals.bloodPressure}`);
          if (vitals.heartRate) vParts.push(`HR: ${vitals.heartRate} bpm`);
          if (vitals.temperature) vParts.push(`Temp: ${vitals.temperature}`);
          if (vitals.oxygenSaturation) vParts.push(`O2: ${vitals.oxygenSaturation}`);
          if (vParts.length > 0) line += `\nVitals: ${vParts.join(" | ")}`;
        }

        // Diagnoses
        const diagnoses = pd.diagnoses as string[] | undefined;
        if (diagnoses?.length) line += `\nDiagnoses: ${diagnoses.join(", ")}`;

        // Medications
        const meds = pd.medications as Array<{ name: string; dosage?: string; frequency?: string }> | undefined;
        if (meds?.length) line += `\nMedications: ${meds.map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ")}`;

        // Lab results
        const labs = pd.labResults as Array<{ name: string; value?: string; status?: string }> | undefined;
        if (labs?.length) {
          const flagged = labs.filter(l => l.status && l.status !== "normal" && l.status !== "optimal");
          if (flagged.length > 0) line += `\nFlagged labs: ${flagged.map(l => `${l.name}: ${l.value} (${l.status})`).join(", ")}`;
          line += `\nAll labs: ${labs.map(l => `${l.name}: ${l.value}`).join(", ")}`;
        }

        // Findings & recommendations
        const findings = pd.findings as string[] | undefined;
        if (findings?.length) line += `\nFindings: ${findings.join("; ")}`;
        const recs = pd.recommendations as string[] | undefined;
        if (recs?.length) line += `\nRecommendations: ${recs.join("; ")}`;

        // Follow-up
        const followUp = pd.followUp as string | undefined;
        if (followUp) line += `\nFollow-up: ${followUp}`;
      }
      return line;
    });
    sections.push(`## MEDICAL RECORDS\n${medLines.join("\n\n")}`);
  }

  // ── 10. Active Protocol ─────────────────────────────────
  if (activeItems.length > 0) {
    const supplements = activeItems.filter((i) => i.category === "supplement");
    const peptides = activeItems.filter((i) => i.category === "peptide" || i.category === "injection");
    const medications = activeItems.filter((i) => i.category === "medication");

    const protocolLines: string[] = [];

    if (supplements.length > 0) {
      protocolLines.push("**Supplements:**");
      for (const s of supplements) {
        protocolLines.push(
          `  ${s.name}: ${s.dosage ?? ""}${s.unit ?? ""} ${s.form ?? ""} — ${s.frequency ?? "daily"}${s.timeOfDay ? ` (${s.timeOfDay})` : ""}${s.rationale ? ` | Rationale: ${s.rationale}` : ""}`
        );
      }
    }

    if (peptides.length > 0) {
      protocolLines.push("**Peptides / Injections:**");
      for (const p of peptides) {
        protocolLines.push(
          `  ${p.name}: ${p.dosage ?? ""}${p.unit ?? ""} ${p.route ?? ""} — ${p.frequency ?? "as directed"}${p.injectionSites ? ` | Sites: ${JSON.stringify(p.injectionSites)}` : ""}${p.rationale ? ` | Rationale: ${p.rationale}` : ""}`
        );
      }
    }

    if (medications.length > 0) {
      protocolLines.push("**Medications:**");
      for (const m of medications) {
        protocolLines.push(
          `  ${m.name}: ${m.dosage ?? ""}${m.unit ?? ""} — ${m.frequency ?? "as directed"}${m.rationale ? ` | Rationale: ${m.rationale}` : ""}`
        );
      }
    }

    if (adherenceStats.total > 0) {
      const rate = Math.round((adherenceStats.taken / adherenceStats.total) * 100);
      protocolLines.push(`\nAdherence (7d): ${adherenceStats.taken}/${adherenceStats.total} doses (${rate}%)`);
    }

    sections.push(`## ACTIVE PROTOCOL\n${protocolLines.join("\n")}`);
  }

  // ── 11. Fasting Protocol ────────────────────────────────
  if (fastingProto) {
    let fastingSection = `## FASTING\nProtocol: ${fastingProto.type} | Feeding window: ${fastingProto.feedingStartHour ?? "?"}:00 – ${fastingProto.feedingEndHour ?? "?"}:00`;
    if (recentFastingLogs.length > 0) {
      const completedCount = recentFastingLogs.filter((l) => l.completed).length;
      fastingSection += `\nLast 7 days: ${completedCount}/${recentFastingLogs.length} fasts completed`;
    }
    sections.push(fastingSection);
  }

  // ── 12. Nutrition / Meals ───────────────────────────────
  if (recentMeals.length > 0) {
    const avgCals = recentMeals.reduce((s: number, m) => s + (m.totalCalories ?? 0), 0) / recentMeals.length;
    const avgProtein = recentMeals.reduce((s: number, m) => s + (m.totalProtein ?? 0), 0) / recentMeals.length;
    const avgCarbs = recentMeals.reduce((s: number, m) => s + (m.totalCarbs ?? 0), 0) / recentMeals.length;
    const avgFat = recentMeals.reduce((s: number, m) => s + (m.totalFat ?? 0), 0) / recentMeals.length;
    sections.push(
      `## NUTRITION (Last 7 Days, ${recentMeals.length} meals logged)\n` +
      `Avg per meal: ${Math.round(avgCals)} cal | ${Math.round(avgProtein)}g protein | ${Math.round(avgCarbs)}g carbs | ${Math.round(avgFat)}g fat`
    );
  }

  // ── 13. Daily Check-ins ─────────────────────────────────
  if (recentCheckins.length > 0) {
    const latest = recentCheckins[0];
    const checkinParts: string[] = [`Date: ${latest.date}`];
    if (latest.energy) checkinParts.push(`Energy: ${latest.energy}/10`);
    if (latest.mood) checkinParts.push(`Mood: ${latest.mood}/10`);
    if (latest.stress) checkinParts.push(`Stress: ${latest.stress}/10`);
    if (latest.hunger) checkinParts.push(`Hunger: ${latest.hunger}/10`);
    if (latest.sleepQuality) checkinParts.push(`Sleep quality: ${latest.sleepQuality}/10`);
    if (latest.readinessScore) checkinParts.push(`Readiness: ${latest.readinessScore}/10`);
    if (latest.waterOz) checkinParts.push(`Water: ${latest.waterOz} oz`);
    if (latest.notes) checkinParts.push(`Notes: ${latest.notes}`);
    if (latest.deviations) checkinParts.push(`Deviations: ${latest.deviations}`);
    sections.push(`## LATEST CHECK-IN\n${checkinParts.join(" | ")}`);
  }

  // ── 14. Symptom Assessment ──────────────────────────────
  if (latestSymptoms) {
    const s = latestSymptoms;
    sections.push(
      `## SYMPTOM ASSESSMENT (Week of ${s.weekStart})\nTotal score: ${s.totalScore ?? "?"}/96\n` +
      `Categories: Digestive=${JSON.stringify(s.digestive)}, Joint=${JSON.stringify(s.joint)}, Mood=${JSON.stringify(s.mood)}, ` +
      `Adrenal=${JSON.stringify(s.adrenal)}, Skin=${JSON.stringify(s.skin)}, Energy/Sleep=${JSON.stringify(s.energySleep)}`
    );
  }

  // ── 15. Health Goals ────────────────────────────────────
  if (activeGoals.length > 0) {
    const goalLines = activeGoals.map(
      (g) => `  ${g.category}: ${g.title}${g.targetValue ? ` — Target: ${g.targetValue} ${g.targetUnit ?? ""}` : ""}${g.currentValue ? ` (current: ${g.currentValue})` : ""}`
    );
    sections.push(`## ACTIVE HEALTH GOALS\n${goalLines.join("\n")}`);
  }

  // ── 16. Exercise Screening (injuries, conditions, preferences) ──
  try {
    const screening = await db.query.exerciseScreenings.findFirst({
      where: eq(exerciseScreenings.clientId, dbUserId),
    });
    if (screening?.rawAnswer) {
      sections.push(
        `## EXERCISE SCREENING (Last updated: ${screening.updatedAt ? new Date(screening.updatedAt).toLocaleDateString() : "unknown"})\n` +
        `Client-reported injuries, conditions, equipment, and preferences:\n${screening.rawAnswer}`
      );
    }
  } catch {
    // Table may not exist yet if migration hasn't run — skip silently
  }

  // ── 17. Recent Workouts ─────────────────────────────────
  if (recentWorkouts.length > 0) {
    const workoutLines = recentWorkouts.map((w) => {
      let meta: { type?: string; durationMinutes?: number } | null = null;
      try { if (w.notes) meta = JSON.parse(w.notes); } catch { /* not JSON */ }
      const exercises = (w.exercisesCompleted ?? []) as Array<{ exerciseId: string; sets: unknown[] }>;
      const isQuickLog = exercises.length === 1 && String(exercises[0]?.exerciseId).startsWith("quick_log:");
      if (isQuickLog && meta) {
        return `  ${w.date}: ${meta.type ?? "workout"} — ${meta.durationMinutes ?? "?"}min`;
      }
      return `  ${w.date}: ${exercises.length} exercises, ${exercises.reduce((s, e) => s + (Array.isArray(e.sets) ? e.sets.length : 0), 0)} total sets`;
    });
    sections.push(`## RECENT WORKOUTS (Last 7 Days)\n${workoutLines.join("\n")}`);
  }

  // ── 18. Active Workout Program ─────────────────────────
  if (activeWorkoutAssignment) {
    try {
      const program = await db.query.workoutPrograms.findFirst({ where: eq(workoutPrograms.id, activeWorkoutAssignment.programId) });
      if (program) {
        const sessions = await db.query.workoutSessions.findMany({ where: eq(workoutSessions.programId, program.id), orderBy: workoutSessions.dayNumber });
        const sessionLines = sessions.map((s) => {
          const exs = (s.exercises ?? []) as Array<{ exerciseId: string; sets: number; reps: string }>;
          return `  ${s.name}: ${exs.map(e => `${e.exerciseId.replace(/_/g, " ")} ${e.sets}x${e.reps}`).join(", ")}`;
        });
        let progInfo = `**${program.name}**${program.isAiGenerated ? " (AI-generated)" : ""}`;
        if (program.durationWeeks) progInfo += ` | ${program.durationWeeks} weeks`;
        progInfo += `\nStarted: ${activeWorkoutAssignment.startDate}`;
        sections.push(`## ACTIVE WORKOUT PROGRAM\n${progInfo}\n${sessionLines.join("\n")}`);
      }
    } catch { /* skip if tables don't exist */ }
  }

  // ── 19. Active Meal Plan ───────────────────────────────
  if (activeMealPlan) {
    const meals = activeMealPlan.meals as { meals?: Array<{ name: string; category: string; calories: number; proteinG: number }> } | null;
    const targets = activeMealPlan.macroTargets;
    let planInfo = `**${activeMealPlan.name}**`;
    if (targets) planInfo += `\nDaily targets: ${targets.calories} cal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat`;
    if (meals?.meals) {
      const categories = ["breakfast", "lunch", "dinner", "snack"];
      for (const cat of categories) {
        const catMeals = meals.meals.filter(m => m.category === cat);
        if (catMeals.length > 0) planInfo += `\n${cat}: ${catMeals.map(m => `${m.name} (${m.calories}cal/${m.proteinG}g P)`).join(", ")}`;
      }
    }
    sections.push(`## ACTIVE MEAL PLAN\n${planInfo}`);
  }

  // ── 20. Activity Summaries ─────────────────────────────
  if (recentActivity.length > 0) {
    const actLines = recentActivity.map((a) => {
      const parts = [`${a.date}:`];
      if (a.steps) parts.push(`${a.steps} steps`);
      if (a.exerciseMinutes) parts.push(`${a.exerciseMinutes}min exercise`);
      if (a.caloriesActive) parts.push(`${a.caloriesActive} active cal`);
      return `  ${parts.join(" | ")}`;
    });
    sections.push(`## DAILY ACTIVITY (Last 7 Days)\n${actLines.join("\n")}`);
  }

  // ── 21. Active Peptide Cycles ──────────────────────────
  if (activePeptides.length > 0) {
    const peptideLines = activePeptides.map((p) => {
      return `  ${p.peptideName}: ${p.dosage ?? "?"} ${p.frequency ?? ""} — started ${p.startDate}${p.endDate ? `, ends ${p.endDate}` : ""}`;
    });
    sections.push(`## ACTIVE PEPTIDE CYCLES\n${peptideLines.join("\n")}`);
  }

  // ── 22. Upcoming Appointments ──────────────────────────
  if (upcomingAppts.length > 0) {
    const apptLines = upcomingAppts.map((a) => {
      return `  ${a.date} ${a.startTime ?? ""}: ${a.sessionType?.replace(/_/g, " ") ?? "session"} (${a.meetingType ?? "video"})${a.coachName ? ` with ${a.coachName}` : ""}`;
    });
    sections.push(`## UPCOMING APPOINTMENTS\n${apptLines.join("\n")}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : "No health data available yet.";
}
