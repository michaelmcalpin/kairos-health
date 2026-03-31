"use client";

/**
 * Live Glucose Monitor — Real-time CGM data display
 *
 * Connects to /api/realtime/glucose SSE stream and displays:
 * - Current glucose reading with trend arrow
 * - Mini sparkline of recent readings
 * - Alert banner for out-of-range values
 */

import React, { useMemo } from "react";
import { useSSE } from "@/hooks/useSSE";

interface GlucoseReading {
  readingId: string;
  value: number;
  unit: string;
  trend: string;
  source: string;
}

interface GlucoseAlert {
  readingId: string;
  value: number;
  threshold: number;
  direction: "high" | "low";
  severity: "warning" | "critical";
}

const TREND_ARROWS: Record<string, string> = {
  rising_fast: "\u2191\u2191",
  rising: "\u2191",
  stable: "\u2192",
  falling: "\u2193",
  falling_fast: "\u2193\u2193",
};

function getGlucoseColor(value: number): string {
  if (value < 70) return "#ef4444"; // Red — low
  if (value < 80) return "#f59e0b"; // Amber — low warning
  if (value <= 140) return "#22c55e"; // Green — in range
  if (value <= 160) return "#f59e0b"; // Amber — high warning
  return "#ef4444"; // Red — high
}

function MiniSparkline({ readings }: { readings: number[] }) {
  if (readings.length < 2) return null;

  const min = Math.min(...readings);
  const max = Math.max(...readings);
  const range = max - min || 1;
  const width = 160;
  const height = 40;
  const padding = 2;

  const points = readings.map((v, i) => {
    const x = padding + (i / (readings.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const lastValue = readings[readings.length - 1];
  const color = getGlucoseColor(lastValue);

  return (
    <svg width={width} height={height} className="block">
      {/* Target range band */}
      <rect
        x={padding}
        y={height - padding - ((140 - min) / range) * (height - padding * 2)}
        width={width - padding * 2}
        height={Math.max(0, ((140 - 70) / range) * (height - padding * 2))}
        fill="#22c55e"
        opacity={0.1}
        rx={2}
      />
      {/* Sparkline */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill={color}
      />
    </svg>
  );
}

export function LiveGlucoseMonitor() {
  const glucoseSSE = useSSE<GlucoseReading>({
    url: "/api/realtime/glucose",
    eventTypes: ["glucose:reading"],
    maxBuffer: 60,
  });

  const alertSSE = useSSE<GlucoseAlert>({
    url: "/api/realtime/glucose",
    eventTypes: ["glucose:alert"],
    maxBuffer: 5,
  });

  const recentValues = useMemo(
    () => glucoseSSE.messages.map((m) => m.data.value),
    [glucoseSSE.messages]
  );

  const current = glucoseSSE.latest?.data;
  const latestAlert = alertSSE.latest?.data;

  return (
    <div className="kairos-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-semibold text-kairos-royal uppercase tracking-wider">
          Live Glucose
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              glucoseSSE.status === "connected"
                ? "bg-green-500 animate-pulse"
                : glucoseSSE.status === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-400">
            {glucoseSSE.status === "connected"
              ? "LIVE"
              : glucoseSSE.status === "connecting"
              ? "Connecting..."
              : "Offline"}
          </span>
        </div>
      </div>

      {current ? (
        <>
          <div className="flex items-end gap-3 mb-2">
            <span
              className="text-4xl font-bold font-heading"
              style={{ color: getGlucoseColor(current.value) }}
            >
              {current.value}
            </span>
            <span className="text-lg text-gray-400 mb-1">{current.unit}</span>
            <span
              className="text-2xl mb-1"
              style={{ color: getGlucoseColor(current.value) }}
              title={current.trend.replace("_", " ")}
            >
              {TREND_ARROWS[current.trend] || "?"}
            </span>
          </div>

          <MiniSparkline readings={recentValues} />

          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Target: 70–140 mg/dL</span>
            <span>{glucoseSSE.messages.length} readings</span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
          {glucoseSSE.status === "connected"
            ? "Waiting for readings..."
            : "Connecting to CGM..."}
        </div>
      )}

      {/* Alert Banner */}
      {latestAlert && (
        <div
          className={`mt-3 p-2 rounded-lg text-xs font-medium ${
            latestAlert.severity === "critical"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {latestAlert.direction === "high" ? "\u26a0\ufe0f" : "\u26a0\ufe0f"}{" "}
          Glucose {latestAlert.direction === "high" ? "above" : "below"}{" "}
          {latestAlert.threshold} {current?.unit} — {latestAlert.value}{" "}
          {current?.unit}
        </div>
      )}
    </div>
  );
}
