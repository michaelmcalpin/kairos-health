"use client";

import { useThemeColors } from "@/lib/theme";

/**
 * Cohort retention heat map.
 * Displays a grid of cells colored by retention percentage.
 */

interface HeatMapRow {
  label: string;
  values: number[];
}

interface HeatMapProps {
  rows: HeatMapRow[];
  columnLabels: string[];
  title?: string;
  className?: string;
}

function getCellColor(value: number): string {
  if (value >= 80) return "#10b981"; // emerald
  if (value >= 60) return "#34d399";
  if (value >= 40) return "#fbbf24"; // amber
  if (value >= 20) return "#f59e0b";
  if (value > 0) return "#ef4444";  // red
  return "#1E2A5A";
}

function getCellOpacity(value: number): number {
  if (value === 0) return 0.3;
  return 0.4 + (value / 100) * 0.6;
}

export function HeatMap({
  rows,
  columnLabels,
  title,
  className = "",
}: HeatMapProps) {
  const tc = useThemeColors();
  if (rows.length === 0) return null;

  const cellSize = 48;
  const labelWidth = 72;
  const headerHeight = 32;

  return (
    <div className={className}>
      {title && (
        <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-3">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th
                className="text-left text-xs font-medium text-kairos-silver-dark"
                style={{ width: labelWidth, minWidth: labelWidth }}
              >
                Cohort
              </th>
              {columnLabels.map((col, i) => (
                <th
                  key={i}
                  className="text-center text-xs font-medium text-kairos-silver-dark"
                  style={{ width: cellSize, minWidth: cellSize, height: headerHeight }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="text-xs font-medium text-kairos-silver pr-2">
                  {row.label}
                </td>
                {columnLabels.map((_, colIdx) => {
                  const value = row.values[colIdx];
                  if (value === undefined) {
                    return (
                      <td key={colIdx}>
                        <div
                          className="rounded"
                          style={{
                            width: cellSize - 4,
                            height: cellSize - 12,
                            backgroundColor: tc.bg,
                          }}
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={colIdx}>
                      <div
                        className="rounded flex items-center justify-center text-xs font-medium"
                        style={{
                          width: cellSize - 4,
                          height: cellSize - 12,
                          backgroundColor: getCellColor(value),
                          opacity: getCellOpacity(value),
                          color: value >= 40 ? tc.bg : tc.text,
                        }}
                        title={`${row.label} — ${columnLabels[colIdx]}: ${value}%`}
                      >
                        {value}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
