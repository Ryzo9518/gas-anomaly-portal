import * as React from "react";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/brand/logo.png";

/**
 * SPLASHSCREEN — first-load "G" mark over a violet → slate gradient.
 *
 * Behaviour:
 *   • Only renders once per browser session (sessionStorage flag) so
 *     subsequent route changes don't re-trigger it.
 *   • Total stage time: ~900ms — 200ms hold, 500ms fade-out.
 *   • motion-reduce skips it entirely (no flash for users who opted out).
 *   • Pointer-events disabled at all times so it never blocks interaction.
 *
 * The mark itself reuses the sidebar's gradient G recipe so the user
 * recognises it the moment the shell paints behind.
 */
export function SplashScreen() {
  const [show, setShow] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return false;
    if (sessionStorage.getItem("gas-splash-shown") === "1") return false;
    return true;
  });
  const [fadingOut, setFadingOut] = React.useState(false);

  React.useEffect(() => {
    if (!show) return;
    sessionStorage.setItem("gas-splash-shown", "1");
    // Hold for 250ms, then fade for 500ms, then unmount.
    const t1 = window.setTimeout(() => setFadingOut(true), 250);
    const t2 = window.setTimeout(() => setShow(false), 850);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[100] flex items-center justify-center",
        "bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-950",
        "transition-opacity duration-500 ease-out",
        fadingOut ? "opacity-0" : "opacity-100",
      )}
    >
      {/* Atmospheric violet glow */}
      <div
        aria-hidden="true"
        className="absolute h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[120px]"
      />
      {/* The brand mark — full PNG logo, scaled to 112px. The atmospheric
          violet glow behind sits underneath naturally; no chrome needed
          since the logo carries its own sphere + circuit-trace mark. */}
      <img
        src={logoUrl}
        alt=""
        className={cn(
          "relative h-28 w-28 object-contain",
          "drop-shadow-[0_8px_32px_rgba(124,58,237,0.55)]",
          "animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-1 duration-500",
          "[animation-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        )}
      />
      <div className={cn(
        "absolute bottom-1/3 mt-4 text-[12px] uppercase tracking-[0.25em] font-semibold text-violet-200/80",
        "animate-in fade-in-0 duration-500 delay-150",
      )} style={{ transform: "translateY(80px)" }}>
        GAS Anomaly
      </div>
    </div>
  );
}
