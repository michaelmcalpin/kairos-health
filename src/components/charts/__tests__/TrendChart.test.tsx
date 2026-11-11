import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TrendChart } from "../TrendChart";
import { RangeBar, LabStatus } from "@/components/labs/RangeBar";
import { bucketSeries } from "@/lib/charts/trend";

const END = "2026-11-11";
const html = (el: React.ReactElement) => {
  const div = document.createElement("div");
  div.innerHTML = renderToStaticMarkup(el);
  return div;
};

describe("TrendChart", () => {
  it("shows the empty state instead of axes or zeros when there is no data", () => {
    const buckets = bucketSeries([], "day", END);
    const root = html(
      <TrendChart series={[{ key: "glucose", label: "Glucose", color: "#E879A6", buckets }]}
        formatValue={(v) => `${v} mg/dL`} ariaSummary="Glucose: no data" empty={<p>No data yet — log a reading.</p>} />,
    );
    expect(root.textContent).toContain("No data yet — log a reading.");
    expect(root.querySelector("svg")).toBeNull();
  });

  it("breaks the line at missing days and draws no point for them", () => {
    const buckets = bucketSeries([
      { date: "2026-11-09", value: 100 }, { date: "2026-11-10", value: 110 }, { date: END, value: null },
      { date: "2026-11-01", value: 90 },
    ], "day", END);
    const root = html(
      <TrendChart series={[{ key: "glucose", label: "Glucose", color: "#E879A6", buckets }]}
        baseline={{ low: 95, high: 105 }} targets={[{ low: 70, high: 105 }]}
        formatValue={(v) => `${v} mg/dL`} ariaSummary="Glucose trend" />,
    );
    const path = root.querySelector("path")!.getAttribute("d")!;
    expect(path.match(/M/g)).toHaveLength(2); // two segments: Nov 1, and Nov 9–10
    expect(root.querySelectorAll("circle")).toHaveLength(3);
    expect(root.querySelector("svg")!.getAttribute("aria-label")).toBe("Glucose trend");
  });
});

describe("RangeBar / LabStatus", () => {
  it("says there is no range instead of guessing", () => {
    const root = html(<><RangeBar value={30} refLow={null} refHigh={null} /><LabStatus status={null} /></>);
    expect(root.textContent).toContain("No reference range on this report");
    expect(root.textContent).toContain("No range");
  });

  it("labels the position in words", () => {
    const root = html(<RangeBar value={120} refLow={0} refHigh={100} unit="mg/dL" previous={140} />);
    expect(root.querySelector("[role=img]")!.getAttribute("aria-label")).toBe("120 mg/dL — above range (reference 0–100 mg/dL); previous 140");
  });
});
