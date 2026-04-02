/**
 * KAIROS AI Insight Generation Engine
 *
 * Rule-based health analysis that generates insights from metrics.
 * Works without an external LLM — can be augmented with API calls
 * to Claude/GPT for richer natural-language insights when configured.
 */

import crypto from "crypto";
import type {
  HealthInsight,
  InsightSeverity,
  InsightAction,
  InsightDataPoint,
  GlucoseAnalysisInput,
  SleepAnalysisInput,
  NutritionAnalysisInput,
  ActivityAnalysisInput,
  SupplementAnalysisInput,
  FastingAnalysisInput,
  CompositeAnalysisInput,
  WeeklyHealthReport,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return `ins_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function makeInsight(
  overrides: Partial<HealthInsight> & Pick<HealthInsight, "category" | "severity" | "title" | "summary" | "detail">
): HealthInsight {
  return {
    id: uid(),
    actions: [],
    dataPoints: [],
    confidence: 0.8,
    generatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}

function action(type: InsightAction["type"], label: string, description: string, priority = 3): InsightAction {
  return { type, label, description, priority };
}

function dp(metric: string, value: number, unit: string, context?: string): InsightDataPoint {
  return { metric, value, unit, context };
}

// ─── Glucose Insights ────────────────────────────────────────────────────────

export function analyzeGlucose(input: GlucoseAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { avgGlucose, timeInRange, gmi, cv, minGlucose, maxGlucose, priorWeekAvg } = input;

  // Time in range analysis
  const tirPct = Math.round(timeInRange * 100);
  if (tirPct >= 90) {
    insights.push(makeInsight({
      category: "glucose",
      severity: "positive",
      title: "Excellent glucose control",
      summary: `Time in range is ${tirPct}% — well above the 70% clinical target and meeting the 90% longevity benchmark.`,
      detail: `Your glucose stayed within the optimal 70-140 mg/dL range ${tirPct}% of the time. This level of control is associated with reduced glycation, lower inflammation, and better long-term metabolic health.`,
      dataPoints: [dp("Time in Range", tirPct, "%", "target: >90%")],
      tags: ["glucose", "tir", "positive"],
      confidence: 0.9,
      actions: [action("celebrate", "Keep it up", "Your current dietary and lifestyle patterns are working well for glucose control", 5)],
    }));
  } else if (tirPct >= 70) {
    insights.push(makeInsight({
      category: "glucose",
      severity: "info",
      title: "Good glucose control — room to optimize",
      summary: `Time in range is ${tirPct}%. This meets clinical guidelines but is below the optimal 90% longevity target.`,
      detail: `Consider reviewing meals that cause the largest glucose spikes. Food journaling alongside CGM data can reveal specific triggers. Pre-meal walks and protein-first eating often improve TIR by 10-15%.`,
      dataPoints: [dp("Time in Range", tirPct, "%", "optimal: >90%")],
      tags: ["glucose", "tir", "optimization"],
      actions: [
        action("adjust_diet", "Review spike patterns", "Identify the 2-3 meals causing the largest glucose excursions", 2),
        action("adjust_exercise", "Post-meal walks", "A 10-15 minute walk after meals can reduce spikes by 20-30%", 3),
      ],
    }));
  } else {
    insights.push(makeInsight({
      category: "glucose",
      severity: "warning",
      title: "Glucose control needs attention",
      summary: `Time in range is only ${tirPct}% — below the 70% minimum clinical guideline.`,
      detail: `Spending significant time outside the 70-140 mg/dL range increases risk of metabolic dysfunction. This warrants a closer look at dietary patterns, stress levels, and sleep quality.`,
      dataPoints: [dp("Time in Range", tirPct, "%", "minimum: >70%")],
      tags: ["glucose", "tir", "warning"],
      confidence: 0.9,
      actions: [
        action("consult_coach", "Discuss with coach", "Review your CGM patterns and dietary log with your health coach", 1),
        action("adjust_diet", "Reduce refined carbs", "Focus on protein, healthy fats, and fiber-rich carbohydrates", 2),
      ],
    }));
  }

  // Glucose variability
  if (cv > 36) {
    insights.push(makeInsight({
      category: "glucose",
      severity: "critical",
      title: "High glucose variability detected",
      summary: `Glucose CV is ${cv}% — significantly above the 36% threshold indicating unstable blood sugar.`,
      detail: `High variability (large swings between highs and lows) is an independent risk factor for cardiovascular complications, even when average glucose is normal. This pattern often responds well to meal composition changes and consistent meal timing.`,
      dataPoints: [dp("CV", cv, "%", "optimal: <25%"), dp("Range", maxGlucose - minGlucose, "mg/dL")],
      tags: ["glucose", "variability", "critical"],
      confidence: 0.85,
      actions: [
        action("consult_doctor", "Medical review recommended", "Discuss glucose variability patterns with your physician", 1),
        action("adjust_diet", "Stabilize meals", "Pair carbohydrates with protein and fat to slow absorption", 2),
      ],
    }));
  } else if (cv > 25) {
    insights.push(makeInsight({
      category: "glucose",
      severity: "info",
      title: "Moderate glucose variability",
      summary: `Glucose CV is ${cv}%. Aim to bring this below 25% for optimal metabolic health.`,
      detail: `Your glucose fluctuations are in the moderate range. Consistent meal timing, reducing processed carbohydrates, and managing stress can help smooth out these swings.`,
      dataPoints: [dp("CV", cv, "%", "optimal: <25%")],
      tags: ["glucose", "variability"],
      actions: [action("adjust_diet", "Consistent meal timing", "Eating at regular intervals helps stabilize glucose patterns", 3)],
    }));
  }

  // Average glucose trend
  if (priorWeekAvg !== undefined) {
    const changePct = Math.round(((avgGlucose - priorWeekAvg) / priorWeekAvg) * 100);
    if (changePct <= -5) {
      insights.push(makeInsight({
        category: "glucose",
        severity: "positive",
        title: "Glucose trending down",
        summary: `Average glucose dropped ${Math.abs(changePct)}% from last week (${priorWeekAvg} → ${avgGlucose} mg/dL).`,
        detail: `This downward trend suggests your recent changes are having a positive effect on metabolic health. Continue with your current approach.`,
        dataPoints: [dp("Avg Glucose", avgGlucose, "mg/dL", `was ${priorWeekAvg}`), dp("Change", changePct, "%")],
        tags: ["glucose", "trend", "improving"],
        actions: [action("review_data", "Identify what changed", "Note which dietary or lifestyle changes coincided with this improvement", 4)],
      }));
    } else if (changePct >= 5) {
      insights.push(makeInsight({
        category: "glucose",
        severity: "warning",
        title: "Glucose trending up",
        summary: `Average glucose increased ${changePct}% from last week (${priorWeekAvg} → ${avgGlucose} mg/dL).`,
        detail: `A rising trend may indicate dietary changes, increased stress, reduced sleep quality, or decreased physical activity. Review recent patterns for potential causes.`,
        dataPoints: [dp("Avg Glucose", avgGlucose, "mg/dL", `was ${priorWeekAvg}`), dp("Change", changePct, "%")],
        tags: ["glucose", "trend", "declining"],
        actions: [
          action("review_data", "Check recent changes", "Review sleep, stress, and dietary patterns for the past week", 2),
          action("consult_coach", "Coach check-in", "Discuss the upward trend with your coach", 3),
        ],
      }));
    }
  }

  // GMI check
  if (gmi > 6.5) {
    insights.push(makeInsight({
      category: "glucose",
      severity: "critical",
      title: "Elevated GMI — pre-diabetic range",
      summary: `Glucose Management Indicator is ${gmi}%, which corresponds to the pre-diabetic range.`,
      detail: `A GMI above 6.5% suggests sustained elevated glucose levels. This is a strong signal to prioritize metabolic health interventions and consult with a healthcare provider.`,
      dataPoints: [dp("GMI", gmi, "%", "optimal: <5.5%")],
      tags: ["glucose", "gmi", "critical"],
      confidence: 0.9,
      actions: [action("consult_doctor", "Medical consultation", "Discuss your glucose patterns and consider an HbA1c blood test", 1)],
    }));
  }

  return insights;
}

// ─── Sleep Insights ──────────────────────────────────────────────────────────

export function analyzeSleep(input: SleepAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { avgScore, avgDuration, consistency, priorWeekAvgScore } = input;
  const avgHours = Math.round(avgDuration / 60 * 10) / 10;

  // Duration analysis
  if (avgHours < 6) {
    insights.push(makeInsight({
      category: "sleep",
      severity: "critical",
      title: "Severely insufficient sleep",
      summary: `Averaging ${avgHours} hours of sleep — well below the 7-9 hour recommendation.`,
      detail: `Chronic sleep deprivation under 6 hours is strongly associated with increased all-cause mortality, impaired glucose metabolism, weakened immune function, and accelerated cognitive decline. This should be your top health priority.`,
      dataPoints: [dp("Avg Duration", avgHours, "hours", "target: 7-9h")],
      tags: ["sleep", "duration", "critical"],
      confidence: 0.95,
      actions: [
        action("adjust_sleep", "Set a bedtime alarm", "Work backward from your wake time to ensure 8 hours in bed", 1),
        action("consult_coach", "Sleep protocol review", "Your coach can help identify barriers to adequate sleep", 2),
      ],
    }));
  } else if (avgHours < 7) {
    insights.push(makeInsight({
      category: "sleep",
      severity: "warning",
      title: "Below optimal sleep duration",
      summary: `Averaging ${avgHours} hours — slightly below the 7-hour minimum for most adults.`,
      detail: `While some individuals function well on slightly less sleep, most adults need 7-9 hours for optimal recovery, hormone regulation, and cognitive function.`,
      dataPoints: [dp("Avg Duration", avgHours, "hours", "target: 7-9h")],
      tags: ["sleep", "duration", "warning"],
      actions: [action("adjust_sleep", "Extend sleep by 30 min", "Try going to bed 30 minutes earlier for the next week", 2)],
    }));
  } else if (avgHours >= 7 && avgHours <= 9) {
    insights.push(makeInsight({
      category: "sleep",
      severity: "positive",
      title: "Sleep duration in optimal range",
      summary: `Averaging ${avgHours} hours of sleep — right in the 7-9 hour sweet spot.`,
      detail: `Consistent sleep in this range supports metabolic health, immune function, cognitive performance, and emotional regulation.`,
      dataPoints: [dp("Avg Duration", avgHours, "hours", "target: 7-9h")],
      tags: ["sleep", "duration", "positive"],
    }));
  }

  // Consistency
  if (consistency < 50) {
    insights.push(makeInsight({
      category: "sleep",
      severity: "warning",
      title: "Inconsistent sleep schedule",
      summary: `Sleep consistency score is ${consistency}/100 — highly variable bedtimes and durations.`,
      detail: `Irregular sleep patterns disrupt circadian rhythm, impacting glucose metabolism, hormone production, and recovery. Even maintaining total duration, variable timing reduces sleep quality.`,
      dataPoints: [dp("Consistency", consistency, "/100", "target: >75")],
      tags: ["sleep", "consistency", "warning"],
      actions: [action("adjust_sleep", "Fix wake time first", "Set a consistent wake time (even weekends) and let bedtime follow naturally", 2)],
    }));
  } else if (consistency >= 80) {
    insights.push(makeInsight({
      category: "sleep",
      severity: "positive",
      title: "Excellent sleep consistency",
      summary: `Sleep consistency score is ${consistency}/100 — strong circadian rhythm alignment.`,
      detail: `Consistent sleep timing is one of the most impactful factors for sleep quality. Your regular schedule supports optimal hormone cycling and recovery.`,
      dataPoints: [dp("Consistency", consistency, "/100")],
      tags: ["sleep", "consistency", "positive"],
    }));
  }

  // Score trend
  if (priorWeekAvgScore !== undefined) {
    const change = avgScore - priorWeekAvgScore;
    if (change >= 5) {
      insights.push(makeInsight({
        category: "sleep",
        severity: "positive",
        title: "Sleep quality improving",
        summary: `Average sleep score up ${Math.round(change)} points from last week (${priorWeekAvgScore} → ${Math.round(avgScore)}).`,
        detail: `Whatever changes you made this week are paying off. Review your recent habits to identify what contributed to better sleep quality.`,
        dataPoints: [dp("Score", Math.round(avgScore), "/100", `was ${priorWeekAvgScore}`)],
        tags: ["sleep", "trend", "improving"],
      }));
    } else if (change <= -5) {
      insights.push(makeInsight({
        category: "sleep",
        severity: "warning",
        title: "Sleep quality declining",
        summary: `Average sleep score dropped ${Math.abs(Math.round(change))} points from last week.`,
        detail: `A declining sleep score often correlates with changes in stress, caffeine timing, screen exposure, or exercise patterns. Review your evening routine for potential disruptors.`,
        dataPoints: [dp("Score", Math.round(avgScore), "/100", `was ${priorWeekAvgScore}`)],
        tags: ["sleep", "trend", "declining"],
        actions: [action("adjust_sleep", "Audit sleep hygiene", "Check caffeine cutoff, screen time, room temp, and evening routine", 2)],
      }));
    }
  }

  return insights;
}

// ─── Nutrition Insights ──────────────────────────────────────────────────────

export function analyzeNutrition(input: NutritionAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { avgCalories, avgProtein, avgCarbs, avgFat, dailyLogs } = input;

  // Protein check (using general guideline: >100g for most adults pursuing longevity)
  if (avgProtein < 80) {
    insights.push(makeInsight({
      category: "nutrition",
      severity: "warning",
      title: "Low protein intake",
      summary: `Averaging ${Math.round(avgProtein)}g protein daily — below the recommended minimum for muscle preservation.`,
      detail: `Adequate protein (1.0-1.2g per pound of lean body mass) is essential for maintaining muscle mass, supporting immune function, and promoting satiety. Most longevity-focused protocols target 120-160g daily.`,
      dataPoints: [dp("Avg Protein", Math.round(avgProtein), "g/day", "target: >100g")],
      tags: ["nutrition", "protein", "warning"],
      actions: [action("adjust_diet", "Add protein to each meal", "Aim for 30-40g protein per meal with a focus on complete protein sources", 2)],
    }));
  } else if (avgProtein >= 120) {
    insights.push(makeInsight({
      category: "nutrition",
      severity: "positive",
      title: "Strong protein intake",
      summary: `Averaging ${Math.round(avgProtein)}g protein daily — supporting muscle preservation and metabolic health.`,
      detail: `Your protein intake is well-positioned for maintaining lean mass and supporting recovery. Continue distributing protein across meals for optimal muscle protein synthesis.`,
      dataPoints: [dp("Avg Protein", Math.round(avgProtein), "g/day")],
      tags: ["nutrition", "protein", "positive"],
    }));
  }

  // Tracking consistency
  if (dailyLogs.length < 5) {
    insights.push(makeInsight({
      category: "nutrition",
      severity: "info",
      title: "Incomplete nutrition tracking",
      summary: `Only ${dailyLogs.length} days logged this week. More data enables better insights.`,
      detail: `Consistent food logging — even imperfect — provides valuable patterns. Try logging at least 5 days per week for meaningful nutritional analysis.`,
      dataPoints: [dp("Days Logged", dailyLogs.length, "days", "target: 5+")],
      tags: ["nutrition", "tracking"],
      actions: [action("review_data", "Log meals daily", "Use quick-log features or photo logging to reduce friction", 3)],
    }));
  }

  // Macro balance check
  if (avgCalories > 0) {
    const proteinPct = Math.round((avgProtein * 4 / avgCalories) * 100);
    const carbPct = Math.round((avgCarbs * 4 / avgCalories) * 100);
    const fatPct = Math.round((avgFat * 9 / avgCalories) * 100);

    if (carbPct > 55) {
      insights.push(makeInsight({
        category: "nutrition",
        severity: "info",
        title: "High carbohydrate ratio",
        summary: `Carbs make up ${carbPct}% of calories. Consider shifting toward more protein and healthy fats.`,
        detail: `A higher carbohydrate ratio can contribute to glucose volatility, especially if primarily from processed sources. Aim for 30-40% carbs from whole food sources.`,
        dataPoints: [
          dp("Protein", proteinPct, "% cal"),
          dp("Carbs", carbPct, "% cal"),
          dp("Fat", fatPct, "% cal"),
        ],
        tags: ["nutrition", "macros"],
        actions: [action("adjust_diet", "Swap carb-heavy meals", "Replace 1-2 high-carb meals with protein-forward alternatives", 3)],
      }));
    }
  }

  return insights;
}

// ─── Activity Insights ───────────────────────────────────────────────────────

export function analyzeActivity(input: ActivityAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { totalWorkouts, avgDurationMinutes, activeDays, totalDaysInRange } = input;
  const activePct = totalDaysInRange > 0 ? Math.round((activeDays / totalDaysInRange) * 100) : 0;

  if (activeDays === 0) {
    insights.push(makeInsight({
      category: "activity",
      severity: "critical",
      title: "No workouts logged",
      summary: "No exercise sessions recorded this period. Physical activity is foundational to longevity.",
      detail: "Even minimal exercise (a daily 20-minute walk) significantly reduces all-cause mortality risk. Start small and build consistency before intensity.",
      dataPoints: [dp("Active Days", 0, "days")],
      tags: ["activity", "critical"],
      actions: [
        action("adjust_exercise", "Start with daily walks", "Commit to a 20-minute walk each day this week", 1),
        action("consult_coach", "Exercise plan", "Work with your coach to create a sustainable movement plan", 2),
      ],
    }));
  } else if (activeDays < 3) {
    insights.push(makeInsight({
      category: "activity",
      severity: "warning",
      title: "Below minimum activity level",
      summary: `${activeDays} active days in ${totalDaysInRange} days. Guidelines recommend at least 3-4 days of exercise per week.`,
      detail: "Research consistently shows that 3-5 exercise sessions per week provides the best balance of health benefits and recovery. Focus on adding one more session per week.",
      dataPoints: [dp("Active Days", activeDays, `/${totalDaysInRange} days`)],
      tags: ["activity", "frequency", "warning"],
      actions: [action("adjust_exercise", "Add one session", "Try adding one 30-minute session to your current routine", 2)],
    }));
  } else if (activeDays >= 4) {
    insights.push(makeInsight({
      category: "activity",
      severity: "positive",
      title: "Strong exercise consistency",
      summary: `${activeDays} active days (${activePct}% of the period) with ${totalWorkouts} total sessions.`,
      detail: "Your exercise frequency is in the optimal range for longevity benefits. Ensure you're balancing strength training, cardio, and recovery.",
      dataPoints: [
        dp("Active Days", activeDays, "days"),
        dp("Total Sessions", totalWorkouts, "workouts"),
        dp("Avg Duration", avgDurationMinutes, "min"),
      ],
      tags: ["activity", "positive"],
    }));
  }

  // Duration check
  if (totalWorkouts > 0 && avgDurationMinutes < 20) {
    insights.push(makeInsight({
      category: "activity",
      severity: "info",
      title: "Short average session duration",
      summary: `Average session is ${avgDurationMinutes} minutes. Consider extending to 30-45 minutes for greater benefit.`,
      detail: "While any movement is beneficial, sessions under 20 minutes may not provide sufficient stimulus for cardiovascular adaptation or meaningful calorie expenditure.",
      dataPoints: [dp("Avg Duration", avgDurationMinutes, "min", "target: 30-45min")],
      tags: ["activity", "duration"],
      actions: [action("adjust_exercise", "Extend sessions gradually", "Add 5 minutes to each session over the next 2 weeks", 3)],
    }));
  }

  return insights;
}

// ─── Supplement Insights ─────────────────────────────────────────────────────

export function analyzeSupplements(input: SupplementAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { adherenceRate, missedItems, streakDays } = input;
  const adherencePct = Math.round(adherenceRate * 100);

  if (adherencePct >= 90) {
    insights.push(makeInsight({
      category: "supplements",
      severity: "positive",
      title: "Excellent supplement adherence",
      summary: `${adherencePct}% adherence with a ${streakDays}-day streak. Consistency is key for supplement efficacy.`,
      detail: "Most supplements require consistent daily intake to maintain therapeutic levels. Your adherence supports optimal bioavailability and health outcomes.",
      dataPoints: [dp("Adherence", adherencePct, "%"), dp("Streak", streakDays, "days")],
      tags: ["supplements", "adherence", "positive"],
    }));
  } else if (adherencePct >= 70) {
    insights.push(makeInsight({
      category: "supplements",
      severity: "info",
      title: "Good supplement adherence — optimize further",
      summary: `${adherencePct}% adherence. Aim for 90%+ for maximum benefit.`,
      detail: `${missedItems.length > 0 ? `Most frequently missed: ${missedItems.slice(0, 3).join(", ")}.` : ""} Consider linking supplements to existing habits (meals, brushing teeth) to build automaticity.`,
      dataPoints: [dp("Adherence", adherencePct, "%", "target: >90%")],
      tags: ["supplements", "adherence"],
      actions: [action("adjust_supplements", "Set reminders", "Use meal-linked reminders for your most-missed supplements", 3)],
    }));
  } else {
    insights.push(makeInsight({
      category: "supplements",
      severity: "warning",
      title: "Low supplement adherence",
      summary: `Only ${adherencePct}% adherence. Inconsistent supplementation reduces effectiveness significantly.`,
      detail: "Low adherence means you're not getting the intended therapeutic effect from your protocol. Consider simplifying your regimen or addressing barriers to compliance.",
      dataPoints: [dp("Adherence", adherencePct, "%", "target: >90%")],
      tags: ["supplements", "adherence", "warning"],
      actions: [
        action("adjust_supplements", "Simplify protocol", "Work with your coach to reduce to essential supplements only", 2),
        action("consult_coach", "Adherence support", "Discuss barriers and strategies with your coach", 3),
      ],
    }));
  }

  return insights;
}

// ─── Fasting Insights ────────────────────────────────────────────────────────

export function analyzeFasting(input: FastingAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { avgDurationHours, completionRate, protocolTargetHours, logs } = input;
  const completionPct = Math.round(completionRate * 100);

  if (logs.length === 0) {
    return [makeInsight({
      category: "fasting",
      severity: "info",
      title: "No fasting logs recorded",
      summary: "No fasting sessions tracked this period. Log fasts to receive personalized insights.",
      detail: "If intermittent fasting is part of your protocol, consistent tracking helps optimize your fasting window and identify patterns.",
      tags: ["fasting", "tracking"],
      actions: [action("review_data", "Start logging fasts", "Use the fasting timer to track your eating windows", 4)],
    })];
  }

  if (completionPct >= 85 && avgDurationHours >= protocolTargetHours * 0.9) {
    insights.push(makeInsight({
      category: "fasting",
      severity: "positive",
      title: "Strong fasting adherence",
      summary: `${completionPct}% completion rate, averaging ${Math.round(avgDurationHours * 10) / 10} hours (target: ${protocolTargetHours}h).`,
      detail: "Your fasting consistency supports autophagy, insulin sensitivity, and metabolic flexibility. Continue monitoring how you feel during fasts.",
      dataPoints: [
        dp("Completion", completionPct, "%"),
        dp("Avg Duration", Math.round(avgDurationHours * 10) / 10, "hours", `target: ${protocolTargetHours}h`),
      ],
      tags: ["fasting", "positive"],
    }));
  } else if (completionPct < 50) {
    insights.push(makeInsight({
      category: "fasting",
      severity: "warning",
      title: "Fasting completion below target",
      summary: `Only ${completionPct}% of fasts completed. Consider adjusting your fasting window.`,
      detail: "A shorter, consistently completed fast is more beneficial than an ambitious window you frequently break. Consider reducing your target by 1-2 hours.",
      dataPoints: [dp("Completion", completionPct, "%", "target: >85%")],
      tags: ["fasting", "warning"],
      actions: [action("adjust_fasting", "Shorten fasting window", "Try a shorter fast you can complete consistently for 2 weeks", 2)],
    }));
  }

  return insights;
}

// ─── Composite Health Score Insights ─────────────────────────────────────────

export function analyzeComposite(input: CompositeAnalysisInput): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const { healthScore, glucoseScore, sleepScore, activityScore, supplementScore, checkinScore, priorWeekHealthScore } = input;

  // Overall score assessment
  let severity: InsightSeverity = "info";
  let title = "Moderate health score";
  let summary = "";

  if (healthScore >= 85) {
    severity = "positive";
    title = "Excellent overall health score";
    summary = `Your composite score of ${healthScore}/100 reflects strong performance across all health domains.`;
  } else if (healthScore >= 70) {
    severity = "info";
    title = "Good health score — areas to optimize";
    summary = `Composite score of ${healthScore}/100. Solid foundation with room for improvement in key areas.`;
  } else if (healthScore >= 50) {
    severity = "warning";
    title = "Health score needs attention";
    summary = `Composite score of ${healthScore}/100. Several areas need focused improvement.`;
  } else {
    severity = "critical";
    title = "Low health score — action needed";
    summary = `Composite score of ${healthScore}/100. Multiple health areas need immediate attention.`;
  }

  // Find weakest area
  const scores = [
    { name: "Glucose", score: glucoseScore },
    { name: "Sleep", score: sleepScore },
    { name: "Activity", score: activityScore },
    { name: "Supplements", score: supplementScore },
    { name: "Check-in", score: checkinScore },
  ];
  const sorted = scores.sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const detail = `Strongest area: ${strongest.name} (${strongest.score}/100). Area needing most attention: ${weakest.name} (${weakest.score}/100). Focusing on your weakest area typically yields the largest overall improvement.`;

  insights.push(makeInsight({
    category: "composite",
    severity,
    title,
    summary,
    detail,
    dataPoints: scores.map((s) => dp(s.name, s.score, "/100")),
    tags: ["composite", "overview"],
  }));

  // Trend
  if (priorWeekHealthScore !== undefined) {
    const change = healthScore - priorWeekHealthScore;
    if (Math.abs(change) >= 3) {
      insights.push(makeInsight({
        category: "composite",
        severity: change > 0 ? "positive" : "warning",
        title: change > 0 ? "Health score improving" : "Health score declining",
        summary: `Score ${change > 0 ? "up" : "down"} ${Math.abs(change)} points from last week (${priorWeekHealthScore} → ${healthScore}).`,
        detail: change > 0
          ? "Positive momentum — your recent changes are reflected in an improving overall health trajectory."
          : "A declining score suggests recent disruptions. Review which specific domains dropped and address the most impactful one first.",
        dataPoints: [dp("Change", change, "points")],
        tags: ["composite", "trend"],
        actions: change < 0
          ? [action("review_data", "Identify decline source", "Check which domain score dropped the most this week", 2)]
          : [],
      }));
    }
  }

  return insights;
}

// ─── Weekly Report Generator ─────────────────────────────────────────────────

export function generateWeeklyReport(params: {
  weekStart: string;
  weekEnd: string;
  glucose?: GlucoseAnalysisInput;
  sleep?: SleepAnalysisInput;
  nutrition?: NutritionAnalysisInput;
  activity?: ActivityAnalysisInput;
  supplements?: SupplementAnalysisInput;
  fasting?: FastingAnalysisInput;
  composite: CompositeAnalysisInput;
}): WeeklyHealthReport {
  const allInsights: HealthInsight[] = [];

  if (params.glucose) allInsights.push(...analyzeGlucose(params.glucose));
  if (params.sleep) allInsights.push(...analyzeSleep(params.sleep));
  if (params.nutrition) allInsights.push(...analyzeNutrition(params.nutrition));
  if (params.activity) allInsights.push(...analyzeActivity(params.activity));
  if (params.supplements) allInsights.push(...analyzeSupplements(params.supplements));
  if (params.fasting) allInsights.push(...analyzeFasting(params.fasting));
  allInsights.push(...analyzeComposite(params.composite));

  // Sort by severity: critical > warning > info > positive
  const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const topWins = allInsights
    .filter((i) => i.severity === "positive")
    .slice(0, 3)
    .map((i) => i.summary);

  const areasToImprove = allInsights
    .filter((i) => i.severity === "warning" || i.severity === "critical")
    .slice(0, 3)
    .map((i) => i.summary);

  return {
    weekStart: params.weekStart,
    weekEnd: params.weekEnd,
    overallScore: params.composite.healthScore,
    scoreChange: params.composite.priorWeekHealthScore !== undefined
      ? params.composite.healthScore - params.composite.priorWeekHealthScore
      : 0,
    insights: allInsights,
    topWins,
    areasToImprove,
    generatedAt: new Date().toISOString(),
  };
}
