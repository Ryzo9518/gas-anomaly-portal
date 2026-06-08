import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BUTTON — GAS canonical action control.
 *
 * SYSTEM LOCK (DO NOT BYPASS):
 *   • Every action control in the portal MUST route through <Button>.
 *     No page may invent its own <button> with bespoke colour / radius /
 *     shadow.  IconButton handles icon-only; small inline utility controls
 *     (table pagers, segmented toggles) may render a plain <button> ONLY
 *     at h-7 or smaller and ONLY in neutral slate.
 *   • Variants are fixed:  primary | secondary | ghost | danger.
 *   • Sizes are fixed:     sm (h-8) | md (h-9) | lg (h-10).
 *   • Primary visual contract (immutable):
 *        – gradient    180deg #8B5CF6 → #6D28D9 → #4C1D95
 *        – border      1px rgba(255,255,255,0.14)
 *        – shadow      0 4px 12px rgba(76,29,149,0.18)
 *        – radius      rounded-xl
 *        – text        #FFFFFF (inline — see NOTE below)
 *   • Secondary / ghost / danger are rounded-lg.  The one-step difference
 *     between primary (xl) and supporting actions (lg) is intentional:
 *     primary reads as the single prominent action on a band; supporting
 *     actions stay neutral.
 *
 * NOTE on inline style:
 *   tailwind-merge (used by cn()) does not know about the project's custom
 *   font-size utilities (text-body, text-support, text-caption, text-kpi).
 *   It therefore treats `text-white` (colour) and `text-body` (size) as
 *   the same `text-*` conflict group and drops `text-white` — leaving the
 *   button to inherit near-black body `text-foreground`.  Moving colour +
 *   gradient + border + shadow to inline style makes the primary visual
 *   tailwind-merge-independent and guarantees white text every render.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const PRIMARY_STYLE: React.CSSProperties = {
  // Matches the NextBestActionCard "open overlay" CTA gradient exactly:
  // violet-700 → #6837DC → indigo-600.  Applied to every primary button
  // so all call-to-action controls share one coherent colour identity.
  background:
    "linear-gradient(180deg, #6D28D9 0%, #6837DC 55%, #4F46E5 100%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  // Layered shadow: ambient glow matches NBA card depth, scaled to smaller button sizes.
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.16) inset, 0 4px 14px rgba(109,40,217,0.32), 0 1px 3px rgba(79,70,229,0.18)",
  color: "#FFFFFF",
};

// motion-reduce:transition-none + motion-reduce:hover:translate-y-0 neutralizes
// the lift + transitions for users who request reduced motion. Brightness/colour
// hover states remain (those are state cues, not motion).
const MOTION_REDUCE = "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0";

const variants: Record<Variant, string> = {
  // Primary: subtle hover lift + brightness pop, sharper press-in.
  primary:
    "rounded-xl hover:brightness-110 active:brightness-95 hover:-translate-y-px active:translate-y-0 transition-[transform,filter] duration-200 ease-out-expo " + MOTION_REDUCE,
  // Secondary: card-style shadow, brand-tinted hover ring.
  secondary:
    "rounded-lg bg-white text-slate-800 ring-1 ring-slate-200 shadow-card hover:ring-violet-300 hover:bg-white hover:shadow-card-hover hover:-translate-y-px active:translate-y-0 active:bg-slate-50 transition-all duration-200 ease-out-expo " + MOTION_REDUCE,
  // Ghost: cleaner hover wash.
  ghost:
    "rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors duration-150 motion-reduce:transition-none",
  // Danger: layered shadow that tints rose.
  danger:
    "rounded-lg bg-rose-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_4px_12px_rgba(159,18,57,0.25),0_1px_2px_rgba(159,18,57,0.15)] hover:bg-rose-700 hover:-translate-y-px active:translate-y-0 active:bg-rose-800 transition-all duration-200 ease-out-expo " + MOTION_REDUCE,
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-support",
  md: "h-9 px-3.5 text-body",
  lg: "h-10 px-4 text-body",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  style,
  title,
  disabled,
  ...rest
}: Props) {
  const mergedStyle =
    variant === "primary" ? { ...PRIMARY_STYLE, ...style } : style;

  // Disabled + title needs special handling. Native disabled <button>
  // elements suppress mouseenter (HTML spec), and our base class adds
  // `disabled:pointer-events-none` — both block the OS title tooltip
  // from ever opening on the button itself. We auto-wrap the disabled
  // button in a <span> that owns the title attribute so the span
  // receives hover and the tooltip fires correctly. When the button
  // is enabled, or has no title, we render exactly as before.
  const button = (
    <button
      {...rest}
      disabled={disabled}
      // Title belongs to the wrapper span when wrapping; otherwise the
      // button keeps it. Avoids a redundant duplicate tooltip.
      title={disabled && title ? undefined : title}
      style={mergedStyle}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );

  if (disabled && title) {
    return (
      <span title={title} className={className}>
        {button}
      </span>
    );
  }
  return button;
}

/**
 * IconButton — icon-only affordance for toolbars and row ends.
 * Fixed h-8 w-8, rounded-md, slate neutral.  NOT a variant of Button —
 * different visual species on purpose (no primary / danger icon buttons).
 */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton({ className, children, title, disabled, ...rest }, ref) {
  // Same disabled+title wrap-in-span pattern as Button above —
  // a disabled native <button> swallows mouseenter so the title
  // tooltip never opens. The wrapping span receives hover and
  // owns the title; the button keeps its disabled state.
  const button = (
    <button
      ref={ref}
      {...rest}
      disabled={disabled}
      title={disabled && title ? undefined : title}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );

  if (disabled && title) {
    return (
      <span title={title} className={className}>
        {button}
      </span>
    );
  }
  return button;
});
