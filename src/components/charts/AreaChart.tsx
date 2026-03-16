"use client";

/**
 * Lightweight SVG area chart for time-series data.
 * Supports gradient fills, grid lines, and axis labels.
 */

interface AreaChartPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartPoint[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  yAxisLabel?: string;
  className?: string;
}

export function AreaChart({
  data,
  width = 400,
  height = 200,
  strokeColor = "#D4AF37",
  fillColor = "#D4AF37",
  showGrid = true,
  showLabels = true,
  showValues = false,
  className = "",
}: AreaChartProps) {
  if (data.length < 2) return null;

  const padding = { top: 16, right: 12, bottom: showLabels ? 32 : 12, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
    value: d.value,
    label: d.label,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const gradientId = `area-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {showGrid && [0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartHeight * (1 - pct)}
          stroke="#1E2A5A"
          strokeWidth={0.5}
          strokeDasharray={pct === 0 ? "0" : "4 4"}
        />
      ))}

      {/* Filled area */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={strokeColor}>
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
          {showValues && (
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#E0E0E0"
              fontFamily="Open Sans, sans-serif"
            >
              {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value}
            </text>
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {showLabels && points.filter((_, i) => {
        // Show every Nth label to avoid overlap
        const step = Math.ceil(data.length / 8);
        return i % step === 0 || i === data.length - 1;
      }).map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 8}
          textAnchor="middle"
          fontSize={9}
          fill="#9E9E9E"
          fontFamily="Open Sans, sans-serif"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
