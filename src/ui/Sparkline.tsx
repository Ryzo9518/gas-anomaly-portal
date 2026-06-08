import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SPARKLINE — tiny inline trend chart for KPI tiles.
 *
 * Pure SVG, no library. Deterministic from `seed` so each KPI gets a
 * stable shape across renders, with overall direction biased by `trend`.
 *
 * Visual contract:
 *   • 60×16 viewport (matches StatTile right-rail spacing).
 *   • Soft area fill in violet-500/12 + 1.25px line in violet-500.
 *   • End-point dot in violet-600 with a soft glow ring.
 *   • Negative trend → rose-500 line + rose-50 area.
 *   • Flat trend → slate-400 line + slate-100 area.
 */

type Trend = "up" | "down" | "flat";

interface SparklineProps {
  seed: string;
  trend: Trend;
  width?: number;
  height?: number;
  className?: string;
}

// Mulberry32 — small, fast, deterministic PRNG.
function mulberry32(seedNum: number): () => number {
  let a = seedNum;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function buildSeries(seed: string, trend: Trend, n: number): number[] {
  const rng = mulberry32(hash(seed));
  const points: number[] = [];
  // Walk: combine drift (from trend) + small random noise.
  const drift = trend === "up" ? 0.06 : trend === "down" ? -0.06 : 0;
  let v = 0.5;
  for (let i = 0; i < n; i++) {
    v += drift + (rng() - 0.5) * 0.18;
    // Soft clamp so the line never escapes the box.
    if (v < 0.08) v = 0.08 + rng() * 0.05;
    if (v > 0.92) v = 0.92 - rng() * 0.05;
    points.push(v);
  }
  return points;
}

export function Sparkline({
  seed, trend, width = 60, height = 16, className,
}: SparklineProps) {
  const N = 14;
  const data = React.useMemo(() => buildSeries(seed, trend, N), [seed, trend]);

  const stroke =
    trend === "down" ? "rgb(244 63 94)"      // rose-500
    : trend === "flat" ? "rgb(148 163 184)"  // slate-400
    : "rgb(124 58 237)";                     // violet-600

  const fill =
    trend === "down" ? "rgba(244,63,94,0.10)"
    : trend === "flat" ? "rgba(148,163,184,0.12)"
    : "rgba(124,58,237,0.12)";

  // Map to coordinates — leave 1.5px breathing for the stroke.
  const stepX = (width - 3) / (N - 1);
  const coords = data.map((y, i) => ({
    x: 1.5 + i * stepX,
    y: 1.5 + (1 - y) * (height - 3),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      role="img"
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={1.75} fill={stroke} />
      <circle cx={last.x} cy={last.y} r={3.25} fill={stroke} fillOpacity={0.18} />
    </svg>
  );
}
