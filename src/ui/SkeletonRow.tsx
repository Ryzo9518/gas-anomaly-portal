import * as React from "react";
import { cn } from "@/lib/utils";

interface Props { rows?: number; className?: string; }

export function SkeletonRow({ rows = 5, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-md bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("h-24 rounded-xl bg-slate-100 animate-pulse", className)} />;
}

/**
 * SkeletonTile — placeholder dimensioned to match StatTile so a KPI strip
 * does not jump in height the moment data arrives. Renders the accent
 * strip + stub blocks that mirror the real tile's hierarchy (label / kpi
 * / sub-row), all in slate-100, with a slow shimmer for premium feel.
 */
export function SkeletonTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white border border-slate-200/70 shadow-card",
        "h-[104px] pl-5 pr-4 py-4",
        className,
      )}
    >
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-slate-100" />
      <div className="space-y-2">
        <div className="h-2 w-16 rounded bg-slate-100" />
        <div className="h-7 w-20 rounded bg-slate-100" />
        <div className="h-2.5 w-32 rounded bg-slate-100" />
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full",
          "bg-gradient-to-r from-transparent via-white/60 to-transparent",
          "animate-[shimmer_2.6s_linear_infinite] motion-reduce:animate-none",
        )}
        style={{ backgroundSize: "200% 100%" }}
      />
    </div>
  );
}

/**
 * SkeletonCompactRow — single CompactProspectRow-shaped placeholder for
 * the qualification stream. Mirrors zone widths so the list never reflows
 * on data swap. Uses the same shimmer treatment as SkeletonTile.
 */
export function SkeletonCompactRow({ className }: { className?: string }) {
  return (
    <li className={cn("py-2 px-2 -mx-2 flex items-center gap-3", className)}>
      <div className="shrink-0 flex items-center gap-1.5 w-[140px]">
        <div className="h-2 w-2 rounded-full bg-slate-200" />
        <div className="h-4 w-[88px] rounded bg-slate-100" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-[55%] rounded bg-slate-100" />
        <div className="h-2.5 w-[35%] rounded bg-slate-100/80" />
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="h-2.5 w-12 rounded bg-slate-100" />
        <div className="h-7 w-16 rounded bg-slate-100" />
        <div className="h-7 w-7 rounded bg-slate-100" />
      </div>
    </li>
  );
}
