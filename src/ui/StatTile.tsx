import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * STATTILE — GAS canonical KPI surface (mock-aligned, compact).
 *
 * Visual contract — GAS canonical KPI surface specification:
 *   • 88px fixed height (h-[88px]) — matches mock .st-inner py-[14px].
 *   • Left accent strip 3px — violet gradient.
 *   • 36px icon badge top-right — gradient violet/indigo, 8px radius.
 *   • Hero figure: Inter Tight 28px/800/tracking-[-0.04em].
 *   • Label: JetBrains Mono 8.5px/500/tracking-[0.12em]/uppercase.
 *   • Primary tile: violet wash background + deeper badge + violet label.
 *   • Standard/neutral: white bg, shared badge gradient, slate label.
 *   • Top-right corner warmth: rgba(237,233,254,0.42) blur-xl on std/neu tiles.
 *   • shadow-tile token: 0 1px 2px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.06),
 *                        0 0 0 1px rgba(0,0,0,.04)
 *
 * Scroll-shrink (compact prop): collapses to 40px inline pill.
 *
 * All hero values use 20px (.st-val.sm) for consistent tile weight.
 */

type Emphasis = "primary" | "standard" | "neutral";
type Status   = "healthy" | "attention" | "risk" | "info";

interface Props {
  label: string;
  value: React.ReactNode;
  delta?: string;
  trend?: "up" | "down" | "flat";
  sublabel?: string;
  className?: string;
  /** 16-18px lucide icon rendered in the 36px badge. */
  icon?: React.ReactNode;
  emphasis?: Emphasis;
  status?: Status;
  compact?: boolean;
}

// ── Card backgrounds ────────────────────────────────────────────────
const CARD_CLS: Record<Emphasis, string> = {
  // Primary: violet wash — matches mock .st.primary gradient exactly.
  primary:  "[background:linear-gradient(135deg,#ede9fe_0%,rgba(237,233,254,.45)_50%,#fff_100%)]",
  standard: "bg-white",
  neutral:  "bg-white",
};

// ── Shadows + border ────────────────────────────────────────────────
// ALL shadow values use the inline [shadow:...] form so Tailwind JIT
// always generates them regardless of how the class string is assembled.
// shadow-tile *token* is intentionally NOT used here — it lives inside
// an object-property string literal that some JIT configs miss.
const SHADOW_CLS: Record<Emphasis, string> = {
  // Primary: violet-tinged shadow + violet ring — matches mock .st.primary box-shadow.
  primary:  "shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(109,40,217,.10),0_0_0_1px_#e9d5ff]",
  // Standard/neutral: exact mock .st box-shadow (inline, reliable) +
  // hairline border so the card edge is always crisp on any background.
  standard: "shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(0,0,0,.06),0_0_0_1px_rgba(0,0,0,.04)] border border-slate-200",
  neutral:  "shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(0,0,0,.06),0_0_0_1px_rgba(0,0,0,.04)] border border-slate-200",
};

// ── Left accent strip ────────────────────────────────────────────────
// Primary: deeper violet (mock .st-bar.violet).
// Standard/neutral: lighter violet (mock .st-bar.slate).
const ACCENT_CLS: Record<Emphasis, string> = {
  primary:  "bg-gradient-to-b from-[#a78bfa] via-[#7c3aed] to-[#5b21b6]",
  standard: "bg-gradient-to-b from-[#c4b5fd] via-[#a78bfa] to-[#8b5cf6]",
  neutral:  "bg-gradient-to-b from-[#c4b5fd] via-[#a78bfa] to-[#8b5cf6]",
};

// ── Label (overline) colour ──────────────────────────────────────────
const LABEL_CLS: Record<Emphasis, string> = {
  primary:  "text-[#7c3aed]",   // mock .st-lbl.v
  standard: "text-[#64748B]",   // mock .st-lbl (default)
  neutral:  "text-[#64748B]",
};

// ── Hero value colour ────────────────────────────────────────────────
const VALUE_CLS: Record<Emphasis, string> = {
  primary:  "text-[#0F172A]",
  standard: "text-[#0F172A]",
  neutral:  "text-[#0F172A]",
};

// ── Icon badge background ────────────────────────────────────────────
// Primary: deeper gradient + glow — matches mock .st-ico.violet.
// Standard/neutral: lighter violet/indigo gradient — mock .st-ico.
const BADGE_CLS: Record<Emphasis, string> = {
  primary:  "[background:linear-gradient(135deg,#7c3aed,#6366f1)] shadow-[0_4px_10px_-4px_rgba(124,58,237,.45)]",
  standard: "[background:linear-gradient(135deg,#8b5cf6,#6366f1)]",
  neutral:  "[background:linear-gradient(135deg,#8b5cf6,#6366f1)]",
};

// ── Status dot ──────────────────────────────────────────────────────
const DOT_CLS: Record<Status, string> = {
  healthy:   "bg-[#22c55e] animate-status-pulse",
  attention: "bg-[#f59e0b]",
  risk:      "bg-rose-500",
  info:      "bg-[#cbd5e1]",
};

// Clones the icon at compact size (14px) for the 28px pill badge.
function compactIcon(icon: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(icon)) return icon;
  return React.cloneElement(
    icon as React.ReactElement<{ className?: string }>,
    { className: "h-3.5 w-3.5" },
  );
}

export function StatTile({
  label, value, delta, trend = "flat", sublabel, className, icon,
  emphasis = "standard", status, compact = false,
}: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl",
        // Height morphs between compact pill (40px) and editorial (88px).
        compact ? "h-10" : "h-[88px]",
        "transition-[height,box-shadow] duration-200 ease-out-expo",
        SHADOW_CLS[emphasis],
        CARD_CLS[emphasis],
        className,
      )}
    >
      {/* Left accent strip — 3px, full height, rounded left corners. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",
          ACCENT_CLS[emphasis],
        )}
      />

      {/* Top-right corner warmth — standard/neutral tiles only.
          Matches mock .st:not(.primary)::after violet-100/42 blur. */}
      {emphasis !== "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 h-52 w-52 rounded-full blur-xl bg-[rgba(237,233,254,0.42)]"
        />
      )}

      {/* ── FULL LAYOUT (visible when not compact) ─────────────────── */}
      <div
        className={cn(
          "absolute inset-0 z-10 pl-5 pr-4 py-[14px] flex flex-col justify-center",
          "transition-opacity duration-200",
          compact ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {/* Label — JetBrains Mono 8.5px/500/tracking-[0.12em]/uppercase.
                mock: .st-lbl { font-family: var(--f-mono); font-size: 8.5px;
                                font-weight: 500; letter-spacing: 0.12em; } */}
            <div className={cn(
              "font-mono text-[8.5px] font-medium tracking-[0.12em] uppercase leading-none mb-1",
              LABEL_CLS[emphasis],
            )}>
              {label}
            </div>
            {/* Hero figure — Inter Tight 20px/800/tracking-[-0.04em].
                All values use 20px (.st-val.sm) for visual consistency
                across all tiles. mock: .st-val.sm { font-size: 20px;
                padding-top: 2px } */}
            <div className={cn(
              "font-display text-[20px] pt-0.5 font-extrabold tracking-[-0.04em] leading-none tabular-nums",
              VALUE_CLS[emphasis],
            )}>
              {value}
            </div>
          </div>

          {icon && (
            <div className="relative shrink-0">
              {/* Badge — 36×36px, 8px radius. mock: .st-ico { width:36px; height:36px;
                  border-radius:8px; } */}
              <div className={cn(
                "h-9 w-9 rounded-[8px] flex items-center justify-center text-white",
                BADGE_CLS[emphasis],
              )}>
                {icon}
              </div>
              {status && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white",
                    DOT_CLS[status],
                  )}
                />
              )}
            </div>
          )}
        </div>

        {/* Trend pill + sublabel row. */}
        {(delta || sublabel) && (
          <div className="mt-2 flex items-center gap-1.5">
            {delta && (
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-none ring-1",
                trend === "up"   && "bg-emerald-50 text-emerald-700 ring-emerald-100",
                trend === "down" && "bg-rose-50 text-rose-700 ring-rose-100",
                trend === "flat" && "bg-slate-100 text-slate-600 ring-slate-200/70",
              )}>
                {trend === "up"   && <TrendingUp   className="h-2.5 w-2.5" />}
                {trend === "down" && <TrendingDown className="h-2.5 w-2.5" />}
                {trend === "flat" && <Minus        className="h-2.5 w-2.5" />}
                {delta}
              </span>
            )}
            {sublabel && (
              <span className="text-[10.5px] text-[#64748B] leading-none truncate">
                {sublabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── COMPACT LAYOUT (visible when compact) ──────────────────── */}
      {/* Inline pill: 28px badge · LABEL · value (right-aligned). */}
      <div
        className={cn(
          "absolute inset-0 z-10 pl-3 pr-3 flex items-center gap-2.5",
          "transition-opacity duration-200",
          compact ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {icon && (
          <div className={cn(
            "relative h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-white",
            BADGE_CLS[emphasis],
          )}>
            {compactIcon(icon)}
            {status && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border-2 border-white",
                  DOT_CLS[status],
                )}
              />
            )}
          </div>
        )}
        <div className={cn(
          "font-mono text-[8.5px] font-medium tracking-[0.12em] uppercase leading-none truncate flex-1 min-w-0",
          LABEL_CLS[emphasis],
        )}>
          {label}
        </div>
        <div className={cn(
          "font-display text-base font-bold tabular-nums leading-none shrink-0",
          VALUE_CLS[emphasis],
        )}>
          {value}
        </div>
      </div>
    </div>
  );
}
