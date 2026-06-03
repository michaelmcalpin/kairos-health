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
} from "@/server/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

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
    db.query.geneticProfiles.findFirst({
      where: and(eq(geneticProfiles.clientId, dbUserId), eq(geneticProfiles.status, "complete")),
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
  if (geneticMarkersData.length > 0 || pathwayScores.length > 0) {
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
    const parsed = latest.parsedData as Record<string, unknown> | null;
    let dexaInfo = `**Latest DEXA Scan** (${latest.reportDate ?? "unknown date"})`;
    if (parsed) {
      dexaInfo += `\n${JSON.stringify(parsed, null, 0).slice(0, 1500)}`;
    }
    sections.push(`## DEXA SCAN\n${dexaInfo}`);
  }

  if (gutDocs.length > 0) {
    const latest = gutDocs[0];
    const parsed = latest.parsedData as Record<string, unknown> | null;
    let gutInfo = `**Latest Gut Biome Report** (${latest.reportDate ?? "unknown date"})`;
    if (parsed) {
      gutInfo += `\n${JSON.stringify(parsed, null, 0).slice(0, 1500)}`;
    }
    sections.push(`## GUT BIOME\n${gutInfo}`);
  }

  if (medDocs.length > 0) {
    const medLines = medDocs.slice(0, 5).map((d) => {
      const parsed = d.parsedData as Record<string, unknown> | null;
      let line = `${d.title ?? "Medical Record"} (${d.reportDate ?? "unknown"})`;
      if (d.providerName) line += ` — ${d.providerName}`;
      if (parsed) {
        line += `\n  ${JSON.stringify(parsed, null, 0).slice(0, 800)}`;
      }
      return line;
    });
    sections.push(`## MEDICAL RECORDS\n${medLines.join("\n")}`);
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
    const screeningProfile = await db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, dbUserId),
    });
    if (screeningProfile?.exerciseScreening) {
      const s = screeningProfile.exerciseScreening;
      sections.push(
        `## EXERCISE SCREENING (Last updated: ${s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "unknown"})\n` +
        `Client-reported injuries, conditions, equipment, and preferences:\n${s.rawAnswer}`
      );
    }
  } catch {
    // Column may not exist yet if migration hasn't run — skip silently
  }

  return sections.length > 0 ? sections.join("\n\n") : "No health data available yet.";
}
