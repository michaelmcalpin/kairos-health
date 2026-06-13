/**
 * Sparkline — Tiny inline SVG trend chart for metric cards.
 *
 * Draws a smooth polyline with optional filled area and end-dot.
 */

import React from "react";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";

import { Colors } from "@/lib/constants";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({
  data,
  width = 64,
  height = 24,
  color = Colors.gold,
  fill = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * plotW;
    const y = pad + plotH - ((v - min) / range) * plotH;
    return { x, y };
  });

  const linePath =
    "M" + points.map((p) => `${p.x},${p.y}`).join(" L");
  const fillPath = `${linePath} L${pad + plotW},${pad + plotH} L${pad},${pad + plotH} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      {fill && (
        <Path d={fillPath} fill={color} opacity={0.15} />
      )}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle cx={lastPoint.x} cy={lastPoint.y} r={2} fill={color} />
    </Svg>
  );
}
