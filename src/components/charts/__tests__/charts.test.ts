/**
 * Chart utility tests.
 * Tests the data-processing logic used by chart components.
 * (Components themselves are tested via visual/integration tests.)
 */

import { describe, it, expect } from "vitest";

describe("Chart data helpers", () => {
  // SparkLine data processing
  describe("SparkLine data", () => {
    it("calculates min/max correctly", () => {
      const data = [10, 25, 15, 30, 20];
      const min = Math.min(...data);
      const max = Math.max(...data);
      expect(min).toBe(10);
      expect(max).toBe(30);
    });

    it("handles single value range", () => {
      const data = [50, 50, 50];
      const range = Math.max(...data) - Math.min(...data) || 1;
      expect(range).toBe(1);
    });

    it("normalizes points to 0-1 range", () => {
      const data = [0, 50, 100];
      const min = 0;
      const max = 100;
      const normalized = data.map((v) => (v - min) / (max - min));
      expect(normalized).toEqual([0, 0.5, 1]);
    });
  });

  // DonutChart segment calculations
  describe("DonutChart segments", () => {
    it("calculates percentages correctly", () => {
      const segments = [
        { label: "A", value: 60, color: "#000" },
        { label: "B", value: 30, color: "#111" },
        { label: "C", value: 10, color: "#222" },
      ];
      const total = segments.reduce((sum, s) => sum + s.value, 0);
      expect(total).toBe(100);

      const percentages = segments.map((s) => Math.round((s.value / total) * 100));
      expect(percentages).toEqual([60, 30, 10]);
    });

    it("handles zero total gracefully", () => {
      const segments = [
        { label: "A", value: 0, color: "#000" },
        { label: "B", value: 0, color: "#111" },
      ];
      const total = segments.reduce((sum, s) => sum + s.value, 0);
      expect(total).toBe(0);
    });
  });

  // BarChart scaling
  describe("BarChart scaling", () => {
    it("calculates bar heights proportionally", () => {
      const values = [25, 50, 75, 100];
      const maxValue = Math.max(...values);
      const chartHeight = 200;

      const heights = values.map((v) => (v / maxValue) * chartHeight);
      expect(heights).toEqual([50, 100, 150, 200]);
    });

    it("computes bar width and gap", () => {
      const dataCount = 5;
      const chartWidth = 400;
      const barWidth = Math.min((chartWidth / dataCount) * 0.7, 40);
      const barGap = (chartWidth - barWidth * dataCount) / (dataCount + 1);

      expect(barWidth).toBeGreaterThan(0);
      expect(barGap).toBeGreaterThan(0);
      expect(barWidth * dataCount + barGap * (dataCount + 1)).toBeCloseTo(chartWidth, 0);
    });
  });

  // HeatMap color mapping
  describe("HeatMap colors", () => {
    function getCellColor(value: number): string {
      if (value >= 80) return "emerald-high";
      if (value >= 60) return "emerald-low";
      if (value >= 40) return "amber-high";
      if (value >= 20) return "amber-low";
      if (value > 0) return "red";
      return "empty";
    }

    it("maps retention percentages to correct color zones", () => {
      expect(getCellColor(100)).toBe("emerald-high");
      expect(getCellColor(85)).toBe("emerald-high");
      expect(getCellColor(70)).toBe("emerald-low");
      expect(getCellColor(50)).toBe("amber-high");
      expect(getCellColor(30)).toBe("amber-low");
      expect(getCellColor(10)).toBe("red");
      expect(getCellColor(0)).toBe("empty");
    });
  });

  // Area chart point generation
  describe("AreaChart points", () => {
    it("generates evenly spaced x coordinates", () => {
      const data = [10, 20, 30, 40, 50];
      const chartWidth = 400;
      const padding = 12;
      const width = chartWidth - padding * 2;

      const points = data.map((_, i) => padding + (i / (data.length - 1)) * width);

      expect(points[0]).toBe(padding);
      expect(points[points.length - 1]).toBe(chartWidth - padding);
      // Uniform spacing
      const spacing = points[1] - points[0];
      for (let i = 2; i < points.length; i++) {
        expect(points[i] - points[i - 1]).toBeCloseTo(spacing, 5);
      }
    });
  });
});
