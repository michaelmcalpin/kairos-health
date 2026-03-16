import { describe, it, expect } from "vitest";
import {
  analyzeGlucose,
  analyzeSleep,
  analyzeNutrition,
  analyzeActivity,
  analyzeSupplements,
  analyzeFasting,
  analyzeComposite,
  generateWeeklyReport,
} from "../engine";
import type {
  GlucoseAnalysisInput,
  SleepAnalysisInput,
  NutritionAnalysisInput,
  ActivityAnalysisInput,
  SupplementAnalysisInput,
  FastingAnalysisInput,
  CompositeAnalysisInput,
} from "../types";

// ─── Glucose ─────────────────────────────────────────────────────────────────

describe("analyzeGlucose", () => {
  it("returns positive insight for excellent TIR", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 95, timeInRange: 0.92,
      gmi: 5.2, cv: 20, minGlucose: 72, maxGlucose: 135,
    };
    const insights = analyzeGlucose(input);
    expect(insights.length).toBeGreaterThan(0);
    const tirInsight = insights.find((i) => i.title.includes("Excellent"));
    expect(tirInsight).toBeDefined();
    expect(tirInsight!.severity).toBe("positive");
  });

  it("returns warning for low TIR", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 145, timeInRange: 0.55,
      gmi: 6.8, cv: 38, minGlucose: 55, maxGlucose: 220,
    };
    const insights = analyzeGlucose(input);
    const warning = insights.find((i) => i.severity === "warning" || i.severity === "critical");
    expect(warning).toBeDefined();
  });

  it("flags high glucose variability", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 100, timeInRange: 0.75,
      gmi: 5.5, cv: 40, minGlucose: 60, maxGlucose: 200,
    };
    const insights = analyzeGlucose(input);
    const cvInsight = insights.find((i) => i.title.includes("variability"));
    expect(cvInsight).toBeDefined();
    expect(cvInsight!.severity).toBe("critical");
  });

  it("detects improving trend", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 90, timeInRange: 0.88,
      gmi: 5.1, cv: 18, minGlucose: 70, maxGlucose: 130,
      priorWeekAvg: 105,
    };
    const insights = analyzeGlucose(input);
    const trend = insights.find((i) => i.title.includes("trending down"));
    expect(trend).toBeDefined();
    expect(trend!.severity).toBe("positive");
  });

  it("flags elevated GMI", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 160, timeInRange: 0.45,
      gmi: 7.0, cv: 30, minGlucose: 65, maxGlucose: 250,
    };
    const insights = analyzeGlucose(input);
    const gmiInsight = insights.find((i) => i.title.includes("GMI"));
    expect(gmiInsight).toBeDefined();
    expect(gmiInsight!.severity).toBe("critical");
  });

  it("each insight has required fields", () => {
    const input: GlucoseAnalysisInput = {
      readings: [], avgGlucose: 100, timeInRange: 0.80,
      gmi: 5.4, cv: 24, minGlucose: 70, maxGlucose: 150,
    };
    const insights = analyzeGlucose(input);
    for (const i of insights) {
      expect(i.id).toBeTruthy();
      expect(i.category).toBe("glucose");
      expect(i.title).toBeTruthy();
      expect(i.summary).toBeTruthy();
      expect(i.generatedAt).toBeTruthy();
      expect(i.confidence).toBeGreaterThan(0);
    }
  });
});

// ─── Sleep ───────────────────────────────────────────────────────────────────

describe("analyzeSleep", () => {
  it("flags severely insufficient sleep", () => {
    const input: SleepAnalysisInput = {
      sessions: [], avgScore: 40, avgDuration: 300, consistency: 50,
    };
    const insights = analyzeSleep(input);
    const critical = insights.find((i) => i.severity === "critical");
    expect(critical).toBeDefined();
    expect(critical!.title).toContain("Severely");
  });

  it("returns positive for optimal duration", () => {
    const input: SleepAnalysisInput = {
      sessions: [], avgScore: 85, avgDuration: 480, consistency: 85,
    };
    const insights = analyzeSleep(input);
    const positive = insights.find((i) => i.title.includes("optimal range"));
    expect(positive).toBeDefined();
  });

  it("warns about inconsistency", () => {
    const input: SleepAnalysisInput = {
      sessions: [], avgScore: 70, avgDuration: 450, consistency: 40,
    };
    const insights = analyzeSleep(input);
    const inconsistent = insights.find((i) => i.title.includes("Inconsistent"));
    expect(inconsistent).toBeDefined();
  });

  it("detects improving score", () => {
    const input: SleepAnalysisInput = {
      sessions: [], avgScore: 82, avgDuration: 460, consistency: 75,
      priorWeekAvgScore: 72,
    };
    const insights = analyzeSleep(input);
    const improving = insights.find((i) => i.title.includes("improving"));
    expect(improving).toBeDefined();
  });
});

// ─── Nutrition ───────────────────────────────────────────────────────────────

describe("analyzeNutrition", () => {
  it("warns about low protein", () => {
    const input: NutritionAnalysisInput = {
      dailyLogs: Array.from({ length: 7 }, (_, i) => ({
        date: `2024-03-${10 + i}`, calories: 2000, protein: 60,
        carbs: 280, fat: 70, fiber: 20,
      })),
      avgCalories: 2000, avgProtein: 60, avgCarbs: 280, avgFat: 70,
    };
    const insights = analyzeNutrition(input);
    const protein = insights.find((i) => i.title.includes("protein"));
    expect(protein).toBeDefined();
    expect(protein!.severity).toBe("warning");
  });

  it("notes incomplete tracking", () => {
    const input: NutritionAnalysisInput = {
      dailyLogs: [{ date: "2024-03-10", calories: 2100, protein: 130, carbs: 200, fat: 80, fiber: 30 }],
      avgCalories: 2100, avgProtein: 130, avgCarbs: 200, avgFat: 80,
    };
    const insights = analyzeNutrition(input);
    const tracking = insights.find((i) => i.title.includes("tracking"));
    expect(tracking).toBeDefined();
  });
});

// ─── Activity ────────────────────────────────────────────────────────────────

describe("analyzeActivity", () => {
  it("flags no workouts", () => {
    const input: ActivityAnalysisInput = {
      workouts: [], totalWorkouts: 0, avgDurationMinutes: 0,
      activeDays: 0, totalDaysInRange: 7,
    };
    const insights = analyzeActivity(input);
    const critical = insights.find((i) => i.severity === "critical");
    expect(critical).toBeDefined();
  });

  it("recognizes strong consistency", () => {
    const input: ActivityAnalysisInput = {
      workouts: [], totalWorkouts: 5, avgDurationMinutes: 45,
      activeDays: 5, totalDaysInRange: 7,
    };
    const insights = analyzeActivity(input);
    const positive = insights.find((i) => i.severity === "positive");
    expect(positive).toBeDefined();
  });
});

// ─── Supplements ─────────────────────────────────────────────────────────────

describe("analyzeSupplements", () => {
  it("celebrates high adherence", () => {
    const input: SupplementAnalysisInput = {
      adherenceRate: 0.95, missedItems: [], streakDays: 21, totalProtocolItems: 8,
    };
    const insights = analyzeSupplements(input);
    expect(insights[0].severity).toBe("positive");
  });

  it("warns about low adherence", () => {
    const input: SupplementAnalysisInput = {
      adherenceRate: 0.45, missedItems: ["Vitamin D", "Omega-3", "Magnesium"],
      streakDays: 0, totalProtocolItems: 8,
    };
    const insights = analyzeSupplements(input);
    expect(insights[0].severity).toBe("warning");
  });
});

// ─── Fasting ─────────────────────────────────────────────────────────────────

describe("analyzeFasting", () => {
  it("returns info for no logs", () => {
    const input: FastingAnalysisInput = {
      logs: [], avgDurationHours: 0, completionRate: 0, protocolTargetHours: 16,
    };
    const insights = analyzeFasting(input);
    expect(insights).toHaveLength(1);
    expect(insights[0].severity).toBe("info");
  });

  it("positive for high completion", () => {
    const input: FastingAnalysisInput = {
      logs: [
        { date: "2024-03-11", durationHours: 16, completed: true },
        { date: "2024-03-12", durationHours: 16.5, completed: true },
      ],
      avgDurationHours: 16.25, completionRate: 0.9, protocolTargetHours: 16,
    };
    const insights = analyzeFasting(input);
    const positive = insights.find((i) => i.severity === "positive");
    expect(positive).toBeDefined();
  });
});

// ─── Composite ───────────────────────────────────────────────────────────────

describe("analyzeComposite", () => {
  it("returns excellent for high score", () => {
    const input: CompositeAnalysisInput = {
      healthScore: 88, glucoseScore: 90, sleepScore: 85,
      activityScore: 88, supplementScore: 92, checkinScore: 80,
    };
    const insights = analyzeComposite(input);
    expect(insights[0].title).toContain("Excellent");
  });

  it("returns warning for low score", () => {
    const input: CompositeAnalysisInput = {
      healthScore: 55, glucoseScore: 50, sleepScore: 60,
      activityScore: 45, supplementScore: 65, checkinScore: 50,
    };
    const insights = analyzeComposite(input);
    expect(insights[0].severity).toBe("warning");
  });

  it("detects score trend", () => {
    const input: CompositeAnalysisInput = {
      healthScore: 75, glucoseScore: 80, sleepScore: 70,
      activityScore: 72, supplementScore: 78, checkinScore: 65,
      priorWeekHealthScore: 68,
    };
    const insights = analyzeComposite(input);
    const trend = insights.find((i) => i.title.includes("improving"));
    expect(trend).toBeDefined();
  });
});

// ─── Weekly Report ───────────────────────────────────────────────────────────

describe("generateWeeklyReport", () => {
  it("generates a complete report with all data", () => {
    const report = generateWeeklyReport({
      weekStart: "2024-03-11",
      weekEnd: "2024-03-17",
      glucose: {
        readings: [], avgGlucose: 98, timeInRange: 0.85,
        gmi: 5.3, cv: 22, minGlucose: 70, maxGlucose: 150, priorWeekAvg: 102,
      },
      sleep: {
        sessions: [], avgScore: 76, avgDuration: 430, consistency: 70, priorWeekAvgScore: 72,
      },
      activity: {
        workouts: [], totalWorkouts: 4, avgDurationMinutes: 40,
        activeDays: 4, totalDaysInRange: 7,
      },
      composite: {
        healthScore: 74, glucoseScore: 82, sleepScore: 76,
        activityScore: 72, supplementScore: 78, checkinScore: 65, priorWeekHealthScore: 70,
      },
    });

    expect(report.weekStart).toBe("2024-03-11");
    expect(report.weekEnd).toBe("2024-03-17");
    expect(report.overallScore).toBe(74);
    expect(report.scoreChange).toBe(4);
    expect(report.insights.length).toBeGreaterThan(0);
    expect(report.generatedAt).toBeTruthy();
  });

  it("generates report with minimal data", () => {
    const report = generateWeeklyReport({
      weekStart: "2024-03-11",
      weekEnd: "2024-03-17",
      composite: {
        healthScore: 50, glucoseScore: 50, sleepScore: 50,
        activityScore: 50, supplementScore: 50, checkinScore: 50,
      },
    });

    expect(report.insights.length).toBeGreaterThan(0);
    expect(report.overallScore).toBe(50);
  });

  it("sorts insights by severity", () => {
    const report = generateWeeklyReport({
      weekStart: "2024-03-11",
      weekEnd: "2024-03-17",
      glucose: {
        readings: [], avgGlucose: 160, timeInRange: 0.40,
        gmi: 7.2, cv: 42, minGlucose: 50, maxGlucose: 280,
      },
      sleep: {
        sessions: [], avgScore: 85, avgDuration: 480, consistency: 90,
      },
      composite: {
        healthScore: 55, glucoseScore: 40, sleepScore: 85,
        activityScore: 50, supplementScore: 50, checkinScore: 50,
      },
    });

    // Critical/warning should come before positive
    const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
    for (let i = 1; i < report.insights.length; i++) {
      expect(severityOrder[report.insights[i].severity])
        .toBeGreaterThanOrEqual(severityOrder[report.insights[i - 1].severity]);
    }
  });
});
