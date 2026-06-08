import { GasOrbHalo } from "@/components/GasOrbHalo";

// ─── MobileHero ───────────────────────────────────────────────
// Compact header block shown ABOVE the LoginCard on phones and
// tablet-portrait (< 1024 px). Renders ONLY on mobile via the
// `lg:hidden` wrapper applied by login.route.tsx — the desktop
// <Hero> component remains the sole source of truth at lg+ and
// has NOT been modified.
//
// Contents (top → bottom):
//   1. Small GasOrbHalo (size 104, 22 orbiting particles + its
//      own breathing halo + dashed rings + rotating ticks). Same
//      verbatim extract used on desktop, just smaller.
//   2. Two-line gradient headline with the locked-in chrome
//      shimmer treatment — identical gradients, identical timing,
//      identical reveal sequence as desktop. Only the responsive
//      font sizes differ (mobile tuned).
//
// NOT included on mobile (intentional):
//   - TypeStrip / pipeline flow (too wide for narrow viewports)
//   - particle bridge + ripple (target landing point is the
//     TypeStrip, which doesn't exist here)
//   - Premium divider + body copy paragraph (kept lean)
//
// Reveal cinematics on mobile match the desktop arc but trimmed:
//   - orb materializes at 0ms (orb-reveal 800ms ease-out)
//   - headline catches light at 600ms (sb-rise 480ms)
// No bridge to delay, so no further offsets.
//
// ─── Keyframe note ───
// The chrome-shimmer + sb-rise + orb-reveal @keyframes live in
// Hero.tsx's <style> block, which doesn't render at mobile (Hero
// is hidden via `hidden lg:flex` at the route level). So this
// file embeds its own copy of those keyframes. Identical names +
// definitions = safe to coexist if both ever rendered together
// at the same breakpoint (they won't — MobileHero is lg:hidden
// and Hero is hidden lg:flex).

export function MobileHero() {
  return (
    <div className="relative flex w-full flex-col items-center text-center">
      <style>{`
        @keyframes mh-sb-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes mh-orb-reveal {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes mh-chrome-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mh-anim,
          .mh-orb-reveal     { animation: none !important; opacity: 1 !important; transform: none !important; }
          .mh-chrome-shimmer { animation: none !important; background-position: 0% 50% !important; }
        }
      `}</style>

      {/* ─── Small orb ───
          size=140 — orb upsized for stronger mobile presence. The
          halo ring extends 1.7× beyond the orb radius (~119 px clear
          space all sides), still well within the mobile column
          padding from the route's px-5 / md:px-10.

          particleCount=22 — the verbatim source default, ideal density
          at this size per the GasOrbHalo INTEGRATION notes
          (recommended 22 at size ≤ 140).

          Wrapper HEIGHT is intentionally smaller than size (110 vs
          140) so the layout slot stays compact. The orb image and
          its particle ring spill outside the wrapper via
          overflow:visible — combined with the headline's tight
          mt-4, the bottom of the particle ring slips BEHIND the
          top of the headline (DOM order: orb wrapper renders before
          headline, so headline paints on top). This grows the orb
          without growing total header height.
      */}
      <div
        className="mh-orb-reveal relative flex items-center justify-center"
        style={{
          height: 110,
          width: 140,
          overflow: "visible",
          animation: "mh-orb-reveal 800ms ease-out both",
        }}
      >
        {/*
          Inner translateY(14px) drops the orb downward WITHOUT
          changing the wrapper's layout slot (height 110 stays put,
          headline position below is unchanged). The visual effect:
          more of the orb + particle ring slips behind the top of
          the headline. Adjust the px value to taste — higher = orb
          sinks further behind text, but watch for the orb's bottom
          half being cropped if it goes too far (it won't be — the
          parent wrapper is overflow:visible and so are all of its
          ancestors up the route layout).
        */}
        <div style={{ transform: "translateY(14px)" }}>
          <GasOrbHalo size={140} particleCount={22} />
        </div>
      </div>

      {/* ─── Headline ───
          Same two-line composition + same chrome-shimmer gradients +
          same 30s shimmer cycle as desktop. Only the responsive font
          sizes are tuned for mobile (text-2xl base, sm:text-3xl).
          mt-4 pulls the headline up close enough that the bottom of
          the particle ring overlaps behind it (orb spills via
          overflow:visible). z-index is left at auto — DOM order
          handles it: this h1 comes AFTER the orb wrapper, so it
          paints on top.
      */}
      <h1
        className="mh-anim relative mt-4 font-display font-black tracking-tighter text-white leading-[1.05] text-2xl sm:text-3xl"
        style={{
          animation: "mh-sb-rise 480ms 600ms ease-out both",
          filter:
            "drop-shadow(0 0 32px rgba(167,139,250,0.20)) drop-shadow(0 0 12px rgba(196,181,253,0.18))",
        }}
      >
        <span
          className="mh-chrome-shimmer block bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(110deg, #5b3f8e 0%, #7c5bb8 12%, #b09bea 25%, #f5e9ff 40%, #e9d5ff 50%, #c4b5fd 60%, #8e6bd0 72%, #5b3f8e 82%, #ddd6fe 92%, #5b3f8e 100%)",
            backgroundSize: "250% 100%",
            backgroundPosition: "0% 50%",
            animation: "mh-chrome-shimmer 30s ease-in-out infinite",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FROM RISK TO REVELATION.
        </span>
        <span
          className="mh-chrome-shimmer block bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(110deg, #4a4d7e 0%, #6e6ea8 12%, #a8a8e0 25%, #f0eaff 40%, #ddd6fe 50%, #c7d2fe 60%, #7e6ec0 72%, #4a4d7e 82%, #c7c4f0 92%, #4a4d7e 100%)",
            backgroundSize: "250% 100%",
            backgroundPosition: "0% 50%",
            animation: "mh-chrome-shimmer 30s ease-in-out 2.5s infinite",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FULLY AUTONOMOUS.
        </span>
      </h1>
    </div>
  );
}
