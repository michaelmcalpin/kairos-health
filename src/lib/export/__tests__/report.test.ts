import { describe, it, expect } from "vitest";
import { buildWeeklyReport, buildHTMLReport } from "../report";
import { generateWeeklyReport } from "@/lib/ai/engine";

describe("buildWeeklyReport", () => {
  const report = generateWeeklyReport({
    weekStart: "2024-03-11",
    weekEnd: "2024-03-17",
    glucose: {
      readings: [], avgGlucose: 98, timeInRange: 0.85,
      gmi: 5.3, cv: 22, minGlucose: 70, maxGlucose: 150,
    },
    sleep: {
      sessions: [], avgScore: 76, avgDuration: 430, consistency: 70,
    },
    composite: {
      healthScore: 74, glucoseScore: 82, sleepScore: 76,
      activityScore: 72, supplementScore: 78, checkinScore: 65,
    },
  });

  it("generates a structured report", () => {
    const generated = buildWeeklyReport(report);
    expect(generated.title).toBe("KAIROS Weekly Health Report");
    expect(generated.subtitle).toContain("2024-03-11");
    expect(generated.sections.length).toBeGreaterThan(0);
  });

  it("includes executive summary", () => {
    const generated = buildWeeklyReport(report);
    const summary = generated.sections.find((s) => s.title === "Executive Summary");
    expect(summary).toBeDefined();
    expect(summary!.content).toContain("74/100");
  });

  it("includes metadata", () => {
    const generated = buildWeeklyReport(report);
    expect(generated.metadata.overallScore).toBe("74");
    expect(generated.metadata.insightCount).toBeTruthy();
  });
});

describe("buildHTMLReport", () => {
  it("generates valid HTML", () => {
    const report = generateWeeklyReport({
      weekStart: "2024-03-11",
      weekEnd: "2024-03-17",
      composite: {
        healthScore: 74, glucoseScore: 82, sleepScore: 76,
        activityScore: 72, supplementScore: 78, checkinScore: 65,
      },
    });
    const generated = buildWeeklyReport(report);
    const html = buildHTMLReport(generated);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("KAIROS Weekly Health Report");
    expect(html).toContain("74");
    expect(html).toContain("</html>");
  });

  it("escapes HTML entities", () => {
    const generated = {
      title: "Test <script>alert('xss')</script>",
      subtitle: "Sub",
      generatedAt: new Date().toISOString(),
      sections: [],
      metadata: {},
    };
    const html = buildHTMLReport(generated);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
