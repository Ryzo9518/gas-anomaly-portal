import * as React from "react";

/**
 * useScrollCompact — returns true once the app's scroll container has
 * scrolled past `enterThreshold` px, and stays true until the user
 * scrolls back ABOVE `exitThreshold`. Throttled via rAF so layout
 * transitions driven off the value stay cheap regardless of scroll velocity.
 *
 * Hysteresis — why two thresholds (enter 32 / exit 8):
 *   • Without a dead-zone, tiny mouse-wheel ticks or trackpad inertia at
 *     the boundary flip the value true → false → true repeatedly causing
 *     a visible KPI-row shake.
 *   • enterThreshold = 32: This hook sets `overflow-anchor: none` directly on
 *     the <main> scroll container, which tells the browser not to adjust
 *     scrollTop when the sticky header's height snaps (88px→40px per tile,
 *     ~96px total across 2 rows). Without suppressing scroll anchoring on the
 *     scroll container itself, the threshold had to exceed the height snap
 *     (104px + 8 + 48 = 160) to avoid oscillation. With anchoring disabled
 *     on <main>, scrollTop is unaffected by the height change so 32px is safe
 *     and the KPIs retract almost immediately on scroll.
 *   • exitThreshold = 8: once compact, stays compact until the user scrolls
 *     back nearly to the top — one clean morph per direction, no re-trigger.
 *
 * Scroll-container resolution:
 *   • The app shell (AppLayout) is `h-screen overflow-hidden` with the
 *     inner <main> as the actual scroller — `window` itself never
 *     scrolls in this app. We therefore listen to <main> when present
 *     and fall back to `window` so the hook still works in unit tests
 *     or any future shell that scrolls the document instead.
 *
 * Intended use: page routes wire a single instance of this hook and
 * pass the result down to the KPI strip components, which forward
 * `compact` to each <StatTile />. The tile then morphs from its full
 * editorial layout to a thin inline pill while the user scrolls into
 * page content — KPIs stay visible inside the sticky page band,
 * they just shrink instead of disappearing.
 */
export function useScrollCompact(
  enterThreshold = 32,
  exitThreshold = 8,
): boolean {
  const [compact, setCompact] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Resolve the actual scroll container. <main> is committed to the
    // DOM by the time effects run, but guard with a fallback anyway.
    const target = (document.querySelector("main") as HTMLElement | null);
    const scroller: HTMLElement | Window = target ?? window;

    // Suppress browser scroll-anchoring on the scroll container so that the
    // instant height snap when compact fires (88px→40px per tile, ~96px total)
    // does NOT cause the browser to adjust scrollTop to compensate. Without
    // this, any enterThreshold below ~160px oscillates: compact fires → height
    // snaps → browser pushes scrollTop under exitThreshold → compact unfires →
    // repeat. Setting it on <main> (the scroller) is the only place it works;
    // setting it on a child element does nothing for scroll-anchoring suppression.
    const prevAnchor = target?.style.overflowAnchor ?? "";
    if (target) target.style.overflowAnchor = "none";

    const getScrollY = (): number =>
      target ? target.scrollTop : window.scrollY;

    let rafId = 0;
    let pending = false;

    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        const y = getScrollY();
        // Functional setter so the compare reads the *current* compact
        // state, not a stale closure value. This is what enforces the
        // hysteresis: once true, only fall back to false past the lower
        // exit threshold; once false, only flip true past the higher
        // enter threshold. Anywhere between the two — do nothing.
        setCompact((prev) => (prev ? y > exitThreshold : y > enterThreshold));
      });
    };

    // Sync once in case the route mounted mid-scroll (back-nav, hash jump).
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
      if (target) target.style.overflowAnchor = prevAnchor;
    };
  }, [enterThreshold, exitThreshold]);

  return compact;
}
