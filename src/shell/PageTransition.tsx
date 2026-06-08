import * as React from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * PAGETRANSITION — wraps the routed <Outlet/> so navigations get a quick,
 * coherent fade-up rather than a hard swap.
 *
 * Implementation:
 *   • Re-keys its child by location.pathname so React tears down + remounts
 *     the previous route. We don't try to overlap (no FLIP, no AnimatePresence)
 *     because the page is the scrollport — keeping two trees mounted would
 *     cause double-scrollbars and break query-cache placeholderData behavior.
 *   • The wrapper uses a CSS keyframe (fade-in + 6px translateY) over 220ms
 *     with the GAS ease-out-expo timing. motion-reduce kills the animation
 *     so screen-reader users don't get layout jitter.
 *
 * The animation leans on tailwindcss-animate utilities already present on
 * dialog/sheet so we don't introduce new bespoke keyframes.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div
      key={pathname}
      className={cn(
        // Premium fade-in: longer 380ms duration with a subtle scale
        // (0.985 → 1) instead of a translate so content can't push a
        // scrollbar mid-animation. The scale is so small it reads as
        // "settling in" rather than zooming. Pairs with a bezier curve
        // (cubic-bezier(0.22, 1, 0.36, 1) — Apple-style ease-out-quint)
        // that decelerates aggressively at the end so the page lands
        // softly instead of arriving abruptly.
        "animate-in fade-in-0 zoom-in-[0.985] duration-[380ms]",
        "[animation-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        // GPU compositing hint — keeps the animation silky on lower-end
        // hardware by lifting the element to its own compositor layer.
        "will-change-[transform,opacity] [transform-origin:center_top]",
        "motion-reduce:animate-none motion-reduce:transform-none",
      )}
    >
      {children}
    </div>
  );
}
