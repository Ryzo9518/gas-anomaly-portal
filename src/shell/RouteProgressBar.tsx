import * as React from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * RouteProgressBar — top-of-viewport, 2px violet bar that animates
 * whenever the user is between routes OR there is in-flight react-query
 * activity (any fetch or mutation). Visible across every route, sits
 * directly above the TopBar so it reads as a global system signal.
 *
 * Behavior:
 *   • activity = react-query fetching/mutating count > 0
 *               OR brief 220ms pulse on every route change
 *   • Indeterminate animation while active (~1.1s loop)
 *   • Snap to 100% + fade out on completion (no abrupt disappearance)
 *   • aria-hidden — purely visual; status is also surfaced by individual
 *     loading states (skeletons, button spinners) to AT users.
 *   • motion-reduce: bar still appears but without the sliding marquee,
 *     replaced by a static violet bar at 30% width so users get the same
 *     "something is happening" signal without movement.
 *
 * Render is positioned `fixed top-0 inset-x-0 z-[60]` so it floats over
 * the TopBar (which is z-30) without being clipped by main's overflow.
 */
export function RouteProgressBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const { pathname } = useLocation();

  // Brief route-change pulse — 220ms even if no react-query activity
  // accompanies the route change, so the user always sees a hint of
  // motion when navigating.
  const [routePulse, setRoutePulse] = React.useState(false);
  React.useEffect(() => {
    setRoutePulse(true);
    const t = window.setTimeout(() => setRoutePulse(false), 220);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const active = fetching > 0 || mutating > 0 || routePulse;

  // Keep the bar visible for one more frame after `active` flips to
  // false so the fade-out + snap-to-100% animation can play out.
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(false), 280);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 inset-x-0 z-[60] h-[2px] overflow-hidden"
    >
      {/* Track is transparent; the bar itself is the only visible
          element. Active state plays an indeterminate marquee; the
          fade-out tier (active=false, visible=true) snaps to full width
          and gently fades to 0 opacity so the disappearance doesn't pop. */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 rounded-r-full",
          "bg-gradient-to-r from-violet-400 via-violet-500 to-fuchsia-500",
          "shadow-[0_0_8px_rgba(139,92,246,0.55)]",
          "transition-[opacity,width] duration-300 ease-out",
          active
            // While active: animated marquee. The custom keyframe
            // "route-progress" lives in tailwind config; if that token
            // is unavailable the inline style below provides a safe
            // fallback by animating width on a CSS keyframes block
            // declared at module scope (see <style> below).
            ? "w-1/3 opacity-90 animate-[route-progress_1.1s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:w-1/3"
            : "w-full opacity-0",
        )}
      />
      <style>{`
        @keyframes route-progress {
          0%   { transform: translateX(-110%); width: 24%; }
          50%  { transform: translateX(40%);   width: 48%; }
          100% { transform: translateX(220%);  width: 30%; }
        }
      `}</style>
    </div>
  );
}
