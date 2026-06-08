import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CARD — GAS canonical surface container.
 *
 * SYSTEM LOCK (DO NOT BYPASS):
 *   • Every content surface in a page body MUST render inside <Card>.
 *     Pages MUST NOT reach for the raw `.gas-card` class with custom
 *     padding — use the `padding` prop instead.
 *   • Visual contract (from .gas-card in index.css):
 *        – bg          hsl(var(--card))   → white
 *        – radius      rounded-xl
 *        – border      ring-1 ring-border → slate-200
 *        – shadow      none  (shadow is reserved for Button.primary
 *                             and popovers; flat surface for body)
 *   • Padding variants (fixed):
 *        – none  (p-0)  — DataTable / list host; the inner element owns
 *                        its own rhythm.
 *        – sm    (p-3)  — dev HUDs and compact overlays only.
 *        – md    (p-5)  — DEFAULT.  Feature cards, dashboard widgets.
 *        – lg    (p-6)  — page-level emphasis: login, modal-like blocks.
 *   • Pages MAY add `className` to extend (e.g. accent ring, min-height)
 *     but MAY NOT override radius, background, or padding through it.
 */

type Padding = "none" | "sm" | "md" | "lg";

const PADDING: Record<Padding, string> = {
  none: "p-0",
  sm:   "p-3",
  // md: mock .cb { padding: 16px 18px } — asymmetric (16px vertical, 18px horizontal)
  // was p-5 (20px all sides — 4px too much and wrong axis ratio)
  md:   "py-4 px-[18px]",
  lg:   "p-6",
};

interface Props {
  padding?: Padding;
  className?: string;
  children: React.ReactNode;
}

export function Card({ padding = "md", className, children }: Props) {
  return (
    <div className={cn("gas-card relative overflow-hidden", PADDING[padding], className)}>
      {/* S-4: 1px gradient top edge — violet→indigo shimmer, rounds with card corners.
          Distinguishes GAS surfaces from stock Tailwind white cards at a glance. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-px z-10"
        style={{
          background:
            "linear-gradient(90deg,transparent 0%,rgba(139,92,246,0.4) 25%,rgba(99,102,241,0.55) 50%,rgba(139,92,246,0.4) 75%,transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}
