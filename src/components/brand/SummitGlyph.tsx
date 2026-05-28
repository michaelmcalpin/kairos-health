"use client";

/**
 * Summit Glyph — EVERIST.ai brand mark
 *
 * A stylized mountain-summit icon with the "E" monogram.
 * Uses Summit theme colors: Glacial Navy + Ice Blue.
 * Renders as an inline SVG so it inherits the active theme via CSS vars.
 */
export function SummitGlyph({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EVERIST.ai"
    >
      <defs>
        <linearGradient id="summit-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(var(--k-primary))" />
          <stop offset="100%" stopColor="rgb(var(--k-primary-light))" />
        </linearGradient>
        <linearGradient id="summit-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(var(--k-accent-light))" />
          <stop offset="100%" stopColor="rgb(var(--k-accent))" />
        </linearGradient>
      </defs>

      {/* Base shape — rounded square */}
      <rect width="64" height="64" rx="14" fill="url(#summit-bg)" />

      {/* Mountain summit silhouette */}
      <path
        d="M12 48 L32 16 L52 48 Z"
        fill="none"
        stroke="rgb(var(--k-accent))"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.3"
      />
      <path
        d="M22 48 L32 28 L42 48 Z"
        fill="rgb(var(--k-accent))"
        opacity="0.15"
      />

      {/* E monogram */}
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontFamily="Montserrat, system-ui, sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="url(#summit-accent)"
      >
        E
      </text>

      {/* Summit dot */}
      <circle
        cx="48"
        cy="18"
        r="3"
        fill="rgb(var(--k-accent))"
        opacity="0.8"
      />
    </svg>
  );
}
