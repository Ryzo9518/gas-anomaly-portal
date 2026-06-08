import * as React from "react";
import {
  Layout,
  Sparkles,
  Filter,
  SlidersHorizontal,
  FileText,
  PackageCheck,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { GasOrbHalo } from "@/components/GasOrbHalo";

// /sandbox/login hero — Pipeline Sweep (Concept A) — refined.
//
// SINGLE TIMELINE. ONE rAF loop. ZERO randomness.
//
// Refinements over the prior pass:
//  • Rail spans chip-0 centre → chip-6 centre EXACTLY. The head
//    cannot start before Canvas or overshoot Kickoff.
//  • Stage progression is strictly left→right; once a stage is
//    activated it stays on until the global reset.
//  • Labels are static white. They never fade, dim, or pulse.
//  • Inactive icons stay visible but muted; active icons paint
//    through a violet → indigo → blue SVG gradient and gain a
//    tight glow ring. Cross-fade only — no scale, no flicker.
//  • Logo is larger and crisper: tighter drop-shadow, no foggy
//    radial halo. Ambient drift particles around the logo only.
//  • Vertical hero spacing reduced ~20% (gap-9 → gap-7) and the
//    flow rail is pulled flush against the headline.
//
//  Phase            Range (ms)       Behaviour
//  ──────────────  ──────────────   ───────────────────────────────
//  Sweep            0 –  6000        Head Canvas → Kickoff via
//                                    ease-out-cubic. Stages ignite
//                                    in order as the leading edge
//                                    crosses each chip centre.
//  Hold             6000 –  9000     All 7 stages lit. Rail at full
//                                    saturation. No motion.
//  Reset            9000 –  9800     800 ms ease-in-out global fade
//                                    of every lit stage back to idle.
//  Rest             9800 – 12000     Idle. Cycle restarts at 12000.

const CYCLE_MS = 12000;
const SWEEP_END = 6000;
const HOLD_END = 9000;
const RESET_DURATION = 800;
// Segmented sweep — line is hidden behind each chip during a
// PAUSE window, then SHOOTS at constant speed to the next chip.
//   PAUSE = 600 ms  (chip is lit, line invisible behind it)
//   SHOOT = 400 ms  (line travels chip-i → chip-(i+1) linearly)
//   PAUSE + SHOOT   = 1000 ms × 6 segments = 6000 ms = SWEEP_END
const NODE_PAUSE_MS = 600;
const SEGMENT_TRAVEL_MS = 400;

// ─── Timer-ring hand-off sequence (FEATURE FLAG) ──────────────
// While USE_TIMER_RING_SEQUENCE = false, the existing segment-
// based sweep + uniform-ignition system runs unchanged. Setting
// the flag to true activates the new sequence (timer ring →
// glow pop → line shoot → next stage). Rollback = single line.
//
// Per-icon timings:
//   RING_MS         =  750   (clockwise ring, linear progress —
//                              tightened from 1000 for a
//                              snappier per-stage cadence)
//   POP_MS          =  350   (glow pop, intensity > 1 snap —
//                              tightened from 500)
//   SHOOT_MS        =  400   (line chip-i → chip-(i+1) for
//                              stages 0-5)
//   STAGE_TOTAL_MS  = 1500   (stages 0-5: 750 + 350 + 400)
//
// Final-stage (Kickoff) override — rocket launch only:
//   ROCKET_LAUNCH_MS = 1000  (unchanged — rocket has
//                              substantial visual glide;
//                              spatial travel unchanged)
//
// Cycle math:
//   RING_CYCLE_MS  = STAGE_TOTAL_MS × 6
//                    + RING_MS + POP_MS + ROCKET_LAUNCH_MS
//                  =  9 000 + 2 100
//                  = 11 100 ms
//   (Per-stage cadence tighter again for stages 0-5; final
//    Kickoff stage unchanged at 2100 ms; net cycle length
//    dropped from 13 900 ms → 11 100 ms.)
const USE_TIMER_RING_SEQUENCE = true;
const RING_MS = 750;
const POP_MS = 350;
const SHOOT_MS = 400;
// Final-stage launch override — applies to chip-6 (Kickoff)
// ONLY. Stages 0-5 still use SHOOT_MS = 400 ms for their
// line-shoot. The 1000 ms launch window gives the rocket
// 2.5× the prior glide time so the launch has visibly more
// travel time across the screen. RING + POP on chip-6
// unchanged. Renamed from ROCKET_SHOOT_MS — the rocket is
// a distinct launch event with its own duration, not the
// SHOOT phase of stage 6.
const ROCKET_LAUNCH_MS = 1000;
// Icon-colour cascade — runs as a NEW phase between chip-6's POP
// and the rocket's SHOOT/launch. Each chip's grey slate-300 icon
// snaps to its stage colour in turn, 200 ms apart, ending with
// the rocket. Behaviour spec:
//   • CASCADE_STEP_MS — gap between successive chip-icon snaps.
//   • CASCADE_TOTAL_MS = CASCADE_STEP_MS × 7 — full cascade window
//     (chip 0 fires at t = 0; chip 6 fires at t = 1200; cascade
//     window itself ends at t = 1400, leaving chip 6 lit for
//     200 ms before the rocket SHOOT phase begins).
const CASCADE_STEP_MS = 200;
const CASCADE_TOTAL_MS = CASCADE_STEP_MS * 7;
const STAGE_TOTAL_MS = RING_MS + POP_MS + SHOOT_MS;
// RING_CYCLE_MS sums the 6 standard-length stages (0-5)
// plus the final stage's total (RING + POP + CASCADE +
// ROCKET_LAUNCH_MS). The cycle wraps the moment the
// rocket's launch window ends → reset starts cleanly
// from Canvas with no visible rocket lingering on screen
// and the icon cascade collapses back to all-grey.
const RING_CYCLE_MS =
  STAGE_TOTAL_MS * 6 + RING_MS + POP_MS + CASCADE_TOTAL_MS + ROCKET_LAUNCH_MS;
// Final-stage handoff — Kickoff doesn't shoot a line past
// itself. Instead the Rocket icon "launches" off chip-6
// toward the login panel during chip-6's SHOOT phase. The
// final stage uses ROCKET_LAUNCH_MS (defined above) — now
// 2.5× SHOOT_MS so the rocket has substantial glide time.
// Spatial travel (ROCKET_TRAVEL_VW × ROCKET_RISE_VW) is
// unchanged — only the duration grew.
const FINAL_STAGE_INDEX = 6;
const ROCKET_TRAVEL_VW = 30;
// Vertical rise component (vw, matched to TRAVEL_VW for a true
// 45° trajectory) so the rocket's motion vector aligns with the
// lucide Rocket icon's natural up-right tip axis. Tunable
// independently — lowering this gives a shallower climb.
const ROCKET_RISE_VW = 30;

interface Stage {
  label: string;
  Icon: LucideIcon;
  // Active-state colour identity per stage. `color` drives the
  // active icon's stroke (via currentColor on the lucide SVG)
  // and `glowRgb` (decimal "r,g,b" string) drives the chip's
  // border + box-shadow halo. Inactive icons stay slate-300
  // regardless — only the LIT state takes on stage colour.
  color: string;
  glowRgb: string;
}

const STAGES: Stage[] = [
  // Visual progression: multi-spectrum neon ramp that reads
  // as a deliberate journey rather than a single-hue ramp.
  // Cool spectrum (violet → cyan → blue → green) for the
  // first four stages, then a triple-Kickoff-green run on
  // stages 4-6 so the last three chips converge into the
  // Kickoff peak event. Each `color` drives the chip's
  // active-state colour (border alpha, inset shadows, timer
  // ring stroke, inner core radial). The Kickoff entry
  // additionally drives the rocket-glyph glow stack and the
  // launch-trail gradient. `glowRgb` is the decimal triple
  // for the same hex; all references read STAGES dynamically,
  // so a colour change propagates everywhere automatically.
  // Violet ramp from saturated → pale lavender across stages 0-5,
  // then a single emerald accent for Kickoff to mark "completion /
  // launch". This replaces the previous 7-colour rainbow which fought
  // the orb's monochrome focus. Animation timing carries the stage
  // progression — colour no longer needs to.
  // Path A v2: violet ramp dropped — pale icons read as "washed out"
  // not "lit". Every stage now lights to the orb's signature violet
  // (#A855F7). The motion timing tells the stage progression. The
  // SINGLE colour shift to emerald-400 on Kickoff becomes the visual
  // payoff: "violet pulse moves through stages → emerald lights up
  // at the win." One narrative beat, maximum impact.
  { label: "Expose",    Icon: Layout,            color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600 (orb peak — uniform across pipeline)
  { label: "Extract",   Icon: Sparkles,          color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600
  { label: "Diagnose",  Icon: Filter,            color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600
  { label: "Calibrate", Icon: SlidersHorizontal, color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600
  { label: "Verdict",   Icon: FileText,          color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600
  { label: "Remediate", Icon: PackageCheck,      color: "#A855F7", glowRgb: "168,85,247"  }, // violet-600
  { label: "Ascend",    Icon: Rocket,            color: "#34D399", glowRgb: "52,211,153"  }, // emerald-400 (final / win — single accent)
];

// Easing helpers — analytic, no library.
// NOTE: the sweep line moves at strictly LINEAR velocity inside
// every shoot window. easeOutQuad is retained in case future
// passes want a per-stage ignition curve again. easeInOut is
// the global hold→idle reset fade. Neither affects sweep
// velocity.
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
// Premium-feel curves applied to DERIVED visual progress only —
// no underlying timing constant changes. easeOutCubic is the
// "clean handoff" curve (fast departure, soft landing).
// easeOutExpo is the "powerful but controlled" curve (very fast
// departure, settled finish) — kept because easeRingFill below
// composes against it.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
// Symmetric S-curve — slow start, fast middle, slow finish.
// Used for the line shoot so the handoff reads as "energy
// gathered → released → absorbed by the next chip" rather
// than the asymmetric "rocket fired" character of plain
// easeOutCubic.
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// Slightly less aggressive than easeOutExpo — preserves the
// rocket's powerful initial burst but holds visible glide
// through a longer trailing arc. Used for the rocket
// translateX/Y only (wall-clock derivations like the final
// flash window still consume the linear rocketProgress).
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
// Custom hybrid for the timer-ring fill:
//   first 85 % of time → 85 % of the arc via easeOutExpo
//                        (keeps the "current" fast initial
//                         sweep character)
//   last  15 % of time → final 15 % of the arc via
//                        easeInOutCubic (perceptible
//                        "click into place" finish)
// Both segments approach zero velocity at the seam (t = 0.85),
// so the curve is C1-continuous — no jarring kink, but the
// ring visibly "settles" into completion rather than just
// asymptoting toward 1. Always returns exactly 1.0 at t = 1
// so the ring still closes at exactly RING_MS = 1500 ms.
function easeRingFill(t: number): number {
  if (t >= 1) return 1;
  if (t < 0.85) return 0.85 * easeOutExpo(t / 0.85);
  const settle = (t - 0.85) / 0.15;
  return 0.85 + 0.15 * easeInOutCubic(settle);
}

// Pure helper — given a cycleMs in [0, SWEEP_END] returns the
// current segment (0..5), the phase the segment is in
// ("pause" | "shoot" | "done"), and the [0..1] progress within
// the shoot window. Used by the renderer to derive the line's
// position and visibility WITHOUT introducing extra state.
type SegmentState = {
  segmentIndex: number;        // 0..5 = which chip-pair is active
  phase: "pause" | "shoot" | "done";
  shootProgress: number;       // 0..1 — only meaningful in "shoot"
};
function getSegmentState(cycleMs: number): SegmentState {
  if (cycleMs >= SWEEP_END) {
    return { segmentIndex: 5, phase: "done", shootProgress: 1 };
  }
  const segmentMs = NODE_PAUSE_MS + SEGMENT_TRAVEL_MS; // 1000
  const segmentIndex = Math.min(5, Math.floor(cycleMs / segmentMs));
  const intoSegment = cycleMs - segmentIndex * segmentMs;
  if (intoSegment < NODE_PAUSE_MS) {
    return { segmentIndex, phase: "pause", shootProgress: 0 };
  }
  return {
    segmentIndex,
    phase: "shoot",
    shootProgress: Math.min(1, (intoSegment - NODE_PAUSE_MS) / SEGMENT_TRAVEL_MS),
  };
}

// Pure helper for the NEW timer-ring sequence. Maps a ringMs
// in [0, RING_CYCLE_MS) to { currentStage 0..6, phase, and
// per-phase progress 0..1 }. Linear progression in every phase
// — no easing — per the locked build plan.
//
// Per-stage timeline:
//   Stages 0-5 (1500 ms total):
//      0  →  750 ms   RING   ringProgress  : 0 → 1
//    750  → 1100 ms   POP    popProgress   : 0 → 1
//   1100  → 1500 ms   SHOOT  shootProgress : 0 → 1
//   Stage 6 / Kickoff (2100 ms total — extended SHOOT for
//                      the rocket launch glide):
//      0  →  750 ms   RING   ringProgress  : 0 → 1
//    750  → 1100 ms   POP    popProgress   : 0 → 1
//   1100  → 2100 ms   SHOOT  shootProgress : 0 → 1
//                       (rocket launch — uses ROCKET_LAUNCH_MS)
type TimerRingState = {
  currentStage: number;            // 0..6 (Canvas..Kickoff)
  phase: "ring" | "pop" | "shoot" | "cascade";
  ringProgress: number;            // 0..1, only meaningful in "ring"
  popProgress: number;             // 0..1, only meaningful in "pop"
  shootProgress: number;           // 0..1, only meaningful in "shoot"
  // ms into the icon-colour cascade window. 0 outside the cascade
  // phase. CASCADE_TOTAL_MS at the moment the cascade ends and the
  // rocket SHOOT phase begins. Drives the per-chip iconLit array.
  cascadeMs: number;
};
function getTimerRingState(ringMs: number): TimerRingState {
  // Stages 0-5 share STAGE_TOTAL_MS (750 + 350 + 400 = 1500).
  // Stage 6 (Kickoff) is the only stage that includes the new
  // icon-colour CASCADE phase — it sits AFTER chip-6's POP and
  // BEFORE the rocket SHOOT, lighting one icon every CASCADE_STEP_MS
  // until all seven are lit. The SHOOT phase (rocket launch)
  // begins as soon as the cascade window closes.
  // Stage-6 lifecycle:
  //   ring  → pop  → cascade  → shoot
  //   750ms   350ms   1400ms     1000ms   = 3500 ms
  // Stages 0-5 lifecycle (unchanged):
  //   ring  → pop  → shoot
  //   750ms   350ms   400ms              = 1500 ms
  const stage6Start = STAGE_TOTAL_MS * 6;
  let stage: number;
  let intoStage: number;
  if (ringMs < stage6Start) {
    stage = Math.floor(ringMs / STAGE_TOTAL_MS);
    intoStage = ringMs - stage * STAGE_TOTAL_MS;
  } else {
    stage = 6;
    intoStage = ringMs - stage6Start;
  }

  // RING and POP boundaries are identical for all stages.
  if (intoStage < RING_MS) {
    return {
      currentStage: stage,
      phase: "ring",
      ringProgress: intoStage / RING_MS,
      popProgress: 0,
      shootProgress: 0,
      cascadeMs: 0,
    };
  }
  if (intoStage < RING_MS + POP_MS) {
    return {
      currentStage: stage,
      phase: "pop",
      ringProgress: 1,
      popProgress: (intoStage - RING_MS) / POP_MS,
      shootProgress: 0,
      cascadeMs: 0,
    };
  }

  // Stages 0-5: SHOOT phase as before (line shoots toward next chip).
  if (stage !== FINAL_STAGE_INDEX) {
    return {
      currentStage: stage,
      phase: "shoot",
      ringProgress: 1,
      popProgress: 1,
      shootProgress: Math.min(
        1,
        (intoStage - RING_MS - POP_MS) / SHOOT_MS
      ),
      cascadeMs: 0,
    };
  }

  // Stage 6 (Kickoff) post-pop: CASCADE first, then SHOOT (launch).
  const cascadeStart = RING_MS + POP_MS;
  const launchStart = cascadeStart + CASCADE_TOTAL_MS;
  if (intoStage < launchStart) {
    return {
      currentStage: 6,
      phase: "cascade",
      ringProgress: 1,
      popProgress: 1,
      shootProgress: 0,
      cascadeMs: intoStage - cascadeStart,
    };
  }
  return {
    currentStage: 6,
    phase: "shoot",
    ringProgress: 1,
    popProgress: 1,
    shootProgress: Math.min(
      1,
      (intoStage - launchStart) / ROCKET_LAUNCH_MS
    ),
    // Cascade has fully completed — pin to its terminal value so any
    // downstream consumer reading cascadeMs sees the "all chips lit"
    // state through the entire rocket launch window.
    cascadeMs: CASCADE_TOTAL_MS,
  };
}

// Rail starts at chip-0 centre and ends at chip-6 centre.
// In rail-progress space [0..1] each chip i sits at i/6.
const STAGE_PROGRESS = Array.from({ length: 7 }, (_, i) => i / 6);

// Ignition times — derived from a CONSTANT-SPEED sweep.
// At linear motion, the head reaches each chip exactly when
// cycleMs / SWEEP_END = i / 6. Distribution is therefore
// perfectly uniform: 1000 ms between every adjacent stage.
//   → [ 0, 1000, 2000, 3000, 4000, 5000, 6000 ] ms
const STAGE_IGNITE_MS = STAGE_PROGRESS.map((p) =>
  Math.round(SWEEP_END * p)
);

function useReducedMotion() {
  const [reduce, setReduce] = React.useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduce(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

export function Hero() {
  const reduceMotion = useReducedMotion();

  // ─── Particle bridge anchoring refs ─────────────────────────
  // The dropping particle + ripple flash MUST land on the
  // TypeStrip top regardless of viewport / zoom / breakpoint.
  // Earlier the drop distance was a hard-coded 370 px, which
  // matched the headline's lg-breakpoint font size. When the
  // browser zooms out the layout often crosses into xl / 2xl
  // where the headline grows to 2.75rem / 3.5rem (taller), the
  // TypeStrip slides further down, but the particle still
  // dropped 370 px and missed. Same problem when the user opens
  // DevTools, rotates a tablet, or any other resize.
  //
  // Fix: measure TypeStrip top relative to the Hero outer at
  // mount + on resize + on font-load, expose it as the CSS
  // custom property `--strip-top` on the Hero outer. The
  // particle and ripple read that variable for their `top`
  // values. Impact location is therefore the TypeStrip top by
  // construction, on every screen size and every zoom level.
  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const stripRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const hero = heroRef.current;
    const strip = stripRef.current;
    if (!hero || !strip) return;

    const measure = () => {
      const heroRect = hero.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      const stripTop = stripRect.top - heroRect.top;
      // Round to whole px to avoid sub-pixel jitter on retina.
      hero.style.setProperty("--strip-top", `${Math.round(stripTop)}px`);
    };

    measure();

    // Re-measure on viewport resize (covers zoom-driven layout
    // shifts and orientation changes).
    window.addEventListener("resize", measure);

    // Re-measure once webfonts have loaded — the headline's
    // metrics shift slightly when the display font swaps in
    // from the system fallback. Without this, the first paint
    // can lock in a stripTop based on the fallback font.
    if (typeof document !== "undefined" && (document as Document).fonts) {
      (document as Document).fonts.ready.then(measure).catch(() => {});
    }

    // Re-measure when the strip's sb-rise reveal animation
    // finishes.  CRITICAL FIX (2026-05-11):
    //   The TypeStrip wrapper has `animation: sb-rise 520ms
    //   1100ms ease-out both`.  The `both` fill-mode means that
    //   BEFORE the animation runs (during the 1100ms delay) the
    //   strip is held at its `from` state: translateY(8px).
    //   useLayoutEffect runs synchronously on mount, BEFORE the
    //   animation has had a chance to run; getBoundingClientRect
    //   includes transforms, so the measured top reflects the
    //   8px-low from-state, not the resting position.  Once the
    //   animation finishes, the strip rises to its true position
    //   but nothing fires another measurement (animations don't
    //   trigger ResizeObserver).  Result: --strip-top stays 8px
    //   low for the rest of the session and the particle/ripple
    //   land 8px BELOW the divider on bigger screens (where the
    //   offset is most visible).
    //   This handler waits for the sb-rise animation to actually
    //   end on the strip wrapper and re-measures — pinning the
    //   final --strip-top to the resting position.
    //   `animationName === "sb-rise"` filter prevents collateral
    //   re-measurement from any other keyframe (chrome-shimmer
    //   on inner spans never bubbles up here, but the filter
    //   keeps it safe).
    const onAnimEnd = (e: AnimationEvent) => {
      if (e.animationName === "sb-rise") measure();
    };
    strip.addEventListener("animationend", onAnimEnd);

    // Safety net: even if animationend never fires (e.g. user
    // pauses tab during the delay, browser drops the event,
    // reduced-motion mode never runs the animation), force a
    // re-measure at 1800 ms — comfortably past the strip's
    // 1100 ms delay + 520 ms duration end (1620 ms total).
    const settleTimer = window.setTimeout(measure, 1800);

    // Re-measure when ANY ancestor / descendant box changes
    // size (e.g. user opens devtools, content reflows). The
    // ResizeObserver on the Hero outer catches everything that
    // affects the strip's position relative to the hero.
    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    ro.observe(strip);

    return () => {
      window.removeEventListener("resize", measure);
      strip.removeEventListener("animationend", onAnimEnd);
      window.clearTimeout(settleTimer);
      ro.disconnect();
    };
  }, []);

  const [cycleMs, setCycleMs] = React.useState(0);
  // ringMs runs an independent 16 800 ms cycle for the new
  // timer-ring sequence. Updated in the same rAF tick as
  // cycleMs so both clocks stay phase-locked to one wall-clock
  // start time. The OLD logic only reads cycleMs; the NEW
  // logic only reads ringMs. Each cycle wraps cleanly in its
  // own period so neither pollutes the other.
  const [ringMs, setRingMs] = React.useState(0);

  // Single rAF loop. cycleMs and ringMs are derived from the
  // same elapsed-time anchor so every visual stays in sync.
  React.useEffect(() => {
    if (reduceMotion) {
      // Reduced motion → present the engine in its fully-engaged
      // steady state. No sweep, no reset, no rest.
      setCycleMs(HOLD_END);
      setRingMs(0);
      return;
    }
    let cancelled = false;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      setCycleMs(elapsed % CYCLE_MS);
      setRingMs(elapsed % RING_CYCLE_MS);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  // ─── Head: position + opacity ─────────────────────────────────
  // ─── Segmented line: position + visibility ──────────────────
  // The line is hidden during PAUSE phases (chip is lit, line
  // is parked behind that chip with opacity 0), and visible
  // ONLY during SHOOT phases where it translates LINEARLY at
  // constant speed from chip-i centre to chip-(i+1) centre.
  // The line never appears stationary while visible.
  //
  //   lineRightX  : position (%) of the line's RIGHT edge
  //                 within the rail container [0..100]
  //   lineOpacity : 0 during pause / done, 1 during shoot —
  //                 instant on / instant off, no fade
  // Compute the timer-ring state every frame (cheap pure fn).
  // It is only consumed when USE_TIMER_RING_SEQUENCE is true.
  const timerRing = getTimerRingState(ringMs);

  // ─── ICON-COLOUR CASCADE — per-chip lit derivation ───────────
  // iconLit[i] === true → chip i renders its colour-Layer-6 icon
  // glyph (stage colour + glow). false → chip i shows the muted
  // slate-300 Layer-5 icon only.
  // Lifecycle:
  //   • All "false" during stages 0-5 (entire 9 000 ms) and during
  //     stage-6 ring + pop (1 100 ms after stages 0-5 wrap).
  //   • During the cascade phase, chip i flips to true the moment
  //     timerRing.cascadeMs crosses i × CASCADE_STEP_MS. Once true
  //     for chip i it stays true through the rest of the cascade
  //     window (chip 6 lit at cascadeMs = 1200, cascade window
  //     closes at 1400).
  //   • During the rocket SHOOT/launch phase ALL seven stay lit
  //     (cascadeMs is pinned to CASCADE_TOTAL_MS by getTimerRingState
  //     in the shoot branch, so the ≥ check stays satisfied).
  //   • At cycle wrap ringMs returns to 0 → phase becomes "ring"
  //     with currentStage = 0 → all flip back to false in one frame.
  // No extra timer / no extra rAF — derived purely from the existing
  // timerRing object every frame.
  const iconLit: boolean[] = STAGES.map((_, i) => {
    if (timerRing.currentStage !== FINAL_STAGE_INDEX) return false;
    if (timerRing.phase === "cascade") {
      return timerRing.cascadeMs >= i * CASCADE_STEP_MS;
    }
    if (timerRing.phase === "shoot") return true;
    return false;
  });

  let lineRightX = 0;
  let lineOpacity = 0;
  // Pixel offset added to the line's CSS left position to push
  // its starting point INSIDE the source chip so the tail is
  // hidden behind chip-i at the start of the shoot. Decreases
  // linearly from CHIP_HALF_PX → 0 over the shoot, so the line
  // emerges from chip-i's right edge and arrives at chip-(i+1)
  // centre by shootProgress = 1 (end logic unchanged). Only
  // used by the new timer-ring path; the old segment-based
  // path is left untouched.
  let lineOffsetPx = 0;
  // Chip half-width in px. Chip body is h-14 / w-14 = 56 px,
  // so half-width = 28 px = the offset that aligns the line's
  // RIGHT edge with chip-i's RIGHT edge at shootProgress = 0.
  // Line is 48 px wide so its left edge then sits 20 px INSIDE
  // chip-i (chip-i extends 28 px each side of its centre) →
  // line is fully hidden behind the source chip at start.
  const CHIP_HALF_PX = 28;
  if (!reduceMotion) {
    if (USE_TIMER_RING_SEQUENCE) {
      // NEW: line is visible only during the SHOOT phase of
      // each stage, translating chip-i → chip-(i+1) at constant
      // velocity over SHOOT_MS. The final stage (Kickoff)
      // does NOT shoot a line past chip-6 — instead, the
      // rocket overlay launches from chip-6, so we clamp the
      // line at chip-6 and hide it during that window.
      if (timerRing.phase === "shoot") {
        if (timerRing.currentStage === FINAL_STAGE_INDEX) {
          // Kickoff shoot phase — line clamped at chip-6,
          // invisible. The rocket overlay (rendered below)
          // is the active visual for this 500 ms window.
          // No lineOffsetPx — line isn't visible here.
          lineRightX = 100;
          lineOpacity = 0;
        } else {
          // Stages 0-5 — line travels chip-i → chip-(i+1).
          // End position (right edge at chip-(i+1) centre at
          // shootProgress = 1) is unchanged. Start position
          // is shifted by CHIP_HALF_PX so the line is fully
          // hidden behind chip-i at shootProgress = 0 and
          // emerges from chip-i's front edge as the shoot
          // progresses.
          //
          // EASING (visual-progress only, no timing change):
          // easeInOutCubic on shootProgress → the line gathers
          // energy at chip-i (slow ramp-out), accelerates
          // through the middle, and decelerates as chip-(i+1)
          // absorbs it. Reads as a continuous energy transfer
          // rather than the asymmetric "rocket fired" of plain
          // easeOutCubic. SHOOT_MS, lineRightX endpoints
          // (still 0 at shootProgress = 0, 1 at shootProgress
          // = 1), the offset-hides-behind-chip-i logic, and
          // the trail's CSS calc are all unchanged — only the
          // per-frame VALUE that fills the trajectory is
          // re-curved. The trail follows automatically because
          // it derives from lineRightX + lineOffsetPx.
          const easedShoot = easeInOutCubic(timerRing.shootProgress);
          lineRightX =
            ((timerRing.currentStage + easedShoot) / 6) * 100;
          lineOpacity = 1;
          lineOffsetPx = CHIP_HALF_PX * (1 - easedShoot);
        }
      } else {
        lineRightX = (timerRing.currentStage / 6) * 100;
        lineOpacity = 0;
      }
    } else {
      // ORIGINAL (segment-based) path — preserved verbatim.
      const seg = getSegmentState(cycleMs);
      if (seg.phase === "shoot") {
        // (i + shootProgress) / 6 — converts segment + progress
        // to a fraction of the rail span. × 100 for percent.
        lineRightX = ((seg.segmentIndex + seg.shootProgress) / 6) * 100;
        lineOpacity = 1;
      } else {
        // pause: parked at source chip centre (line invisible)
        // done : parked at chip-6 centre (line invisible)
        lineRightX =
          (seg.phase === "pause"
            ? seg.segmentIndex / 6
            : 1) * 100;
        lineOpacity = 0;
      }
    }
  }

  // ─── Final-stage rocket launch derived values ────────────────
  // Active only when the timer-ring sequence is on, motion is
  // allowed, and we are in the SHOOT phase of the final stage
  // (Kickoff). Auto-resets the moment any of these conditions
  // flips false — no manual reset logic needed.
  const isRocketLaunching =
    USE_TIMER_RING_SEQUENCE &&
    !reduceMotion &&
    timerRing.currentStage === FINAL_STAGE_INDEX &&
    timerRing.phase === "shoot";
  // Linear progress (kept) — drives wall-clock-accurate
  // computations like the final-flash window timing below.
  const rocketProgress = isRocketLaunching ? timerRing.shootProgress : 0;
  // Eased motion progress — drives ONLY the rocket overlay's
  // visual translateX/Y, so the launch reads as a powerful
  // initial burst that settles into a controlled glide.
  // easeOutQuart preserves the strong-launch character of
  // the prior easeOutExpo but holds visible motion through
  // a longer trailing arc — the rocket no longer "freezes"
  // at near-end position; the glide off-screen stays
  // perceptible all the way to the cycle wrap.
  // ROCKET_LAUNCH_MS, ROCKET_TRAVEL_VW, ROCKET_RISE_VW, the
  // wrapper geometry, and every wall-clock derivation
  // (rocketProgress, finalFlashProgress) stay byte-identical.
  const rocketMotionProgress = isRocketLaunching
    ? easeOutQuart(timerRing.shootProgress)
    : 0;

  // ─── Loop reset signal — global dip ──────────────────────────
  // Last 130 ms of every cycle: the entire chip grid dims by up
  // to 12 % opacity, then snaps back at ringMs = 0 when the
  // cycle wraps. Reads as a quiet "system resetting" beat
  // rather than a hard cut. Pure CSS opacity multiplier — no
  // animation timing change, no extra rAF state.
  const RESET_DIP_MS = 130;
  const RESET_DIP_DEPTH = 0.12;
  const dipStart = RING_CYCLE_MS - RESET_DIP_MS;
  const dipAmount =
    !reduceMotion && ringMs >= dipStart
      ? (ringMs - dipStart) / RESET_DIP_MS
      : 0;
  const cycleDipOpacity = 1 - dipAmount * RESET_DIP_DEPTH;

  // ─── Final-stage completion flash — chip-6 only ─────────────
  // During the LAST 100 ms of the rocket launch (measured
  // against ROCKET_LAUNCH_MS so the trigger window scales with
  // the launch duration), chip-6's border alpha gets a small
  // additional boost so the moment of launch reads as a
  // discrete "lock-in" event. Decays back to the steady
  // completed state automatically when the cycle wraps.
  const FINAL_FLASH_MS = 100;
  const rocketElapsedMs = rocketProgress * ROCKET_LAUNCH_MS;
  const finalFlashProgress =
    isRocketLaunching &&
    rocketElapsedMs >= ROCKET_LAUNCH_MS - FINAL_FLASH_MS
      ? Math.min(
          1,
          (rocketElapsedMs - (ROCKET_LAUNCH_MS - FINAL_FLASH_MS)) /
            FINAL_FLASH_MS
        )
      : 0;

  // ─── Stage intensities (0..1 each) ───────────────────────────
  // Driven by the same cycleMs. INSTANT activation: when the
  // line crosses a stage, intensity hard-steps from 0 → 1. No
  // ease-out ramp, no "settling-in" glow that would visually
  // drag at each node. The label-glow overlay reads the same
  // intensity value, so labels also activate instantly in sync.
  //
  // The global hold→idle reset (final 800 ms of the cycle)
  // still uses easeInOut — that's the all-stages-fade-out at
  // the end of one cycle, not part of the sweep itself, so
  // its smoothness is intentional and unrelated to the
  // perceived sweep velocity.
  const stageIntensities = STAGES.map((_, i) => {
    if (reduceMotion) return 1;
    if (USE_TIMER_RING_SEQUENCE) {
      // Cumulative cycle: every stage that has finished its
      // RING + POP + SHOOT in the current cycle stays lit at
      // intensity 1 until the cycle wraps. The CURRENT stage
      // depends on phase:
      //   • i  < currentStage : already completed → 1.0 (steady)
      //   • i  > currentStage : not reached yet  → 0   (dark)
      //   • i === currentStage:
      //       - RING  phase → 0   (the ring SVG is the visual)
      //       - POP   phase → 0 → 1.5 (peak) → 1.0 (settles)
      //       - SHOOT phase → 1.0 (settled, line shoots out)
      // Timer ring still renders only on currentStage / RING
      // phase, so exactly one ring is visible at a time.
      if (i < timerRing.currentStage) return 1;
      if (i > timerRing.currentStage) return 0;
      if (timerRing.phase === "ring") return 0;
      if (timerRing.phase === "pop") {
        // Pop: quick attack (100 ms) to peak 1.5, then decay
        // (400 ms) to a steady 1.0. After pop, intensity
        // never returns to 0 — it carries forward through
        // SHOOT and into the chip's "completed" state.
        // EASING: easeOutCubic on the attack — softer than
        // easeOutExpo so the peak feels controlled and
        // premium rather than game-like (expo's near-instant
        // ramp had a slight "video-game pop" character).
        // Decay unchanged (still easeOutCubic). Peak (1.5)
        // and settled value (1.0) are byte-identical, so
        // every downstream consumer (intensity-driven glow,
        // border alpha, inner core, drop-shadow stack)
        // reaches the same extremes — only the in-between
        // shape becomes more polished.
        const t = timerRing.popProgress;
        if (t < 0.2) return 1.5 * easeOutCubic(t / 0.2);
        return 1.5 - 0.5 * easeOutCubic((t - 0.2) / 0.8);
      }
      // SHOOT phase: chip stays at 1.0 (just popped), line
      // is the active visual moving toward the next chip.
      return 1;
    }
    // ORIGINAL path — preserved verbatim.
    const igniteAt = STAGE_IGNITE_MS[i];
    if (cycleMs < igniteAt) return 0;
    if (cycleMs < HOLD_END) {
      // Hard step — chip is fully lit the moment the line
      // reaches it.
      return 1;
    }
    if (cycleMs < HOLD_END + RESET_DURATION) {
      return 1 - easeInOut((cycleMs - HOLD_END) / RESET_DURATION);
    }
    return 0;
  });

  return (
    <div
      ref={heroRef}
      className="relative w-full max-w-[760px] mx-auto flex flex-col items-center text-center"
      // Per-element spacing is applied via marginTop on each child so the
      // rhythm differs between adjacent pairs:
      //   logo → pill        : generous   (anchor logo, separate brand zone)
      //   pill → headline    : tight      (label introduces the title)
      //   headline → flow    : generous   (separate message from diagram)
      //   flow → subtext     : generous   (separate diagram from copy)
    >
      <style>{`
        @keyframes sb-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        /* ─── First-load reveal cinematics ───
           Choreographed entrance: the orb materializes first (presence),
           then the headline catches light, then the pipeline ignites,
           then the divider and body copy settle in. The card is faded
           in by the route-level animate-slide-up. Total reveal arc
           ~2.4s; the particle bridge first cycle is held until 2500ms
           so the choreography completes before the loop begins.

           orb-reveal: scale-and-fade in. 0.88 → 1.0 with opacity 0 → 1
           over 800ms ease-out. The slight upscale gives "presence"
           rather than a flat fade.

           Existing sb-rise delays are extended so each element lands
           after the previous one has settled, instead of all four
           rising together. */
        @keyframes orb-reveal {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        /* ─── Particle bridge — Option B: straight drop + ripple ───
           Every 8s, a single violet particle spawns directly above
           the centre of the TypeStrip (around above CONFIGURE),
           drops STRAIGHT DOWN onto the strip, then triggers a
           horizontal violet ripple wave that washes through the
           TypeStrip text and fades. The narrative: orb energy
           drops onto the pipeline and ripples outward through it.

           The particle is centred on the column (left:50%, top:100px,
           transform translateX(-50%)). The ripple is a horizontal
           gradient strip that spawns at the impact point and grows
           horizontally outward via scaleX. */
        @keyframes particle-drop {
          /* SMOOTH MOTION via dense keyframe sampling along a
             precise sine curve (1.5 oscillations during the fall)
             with LINEAR timing — no per-segment easing means no
             stop-go between adjacent keyframes. With keyframes
             every 3% of the timeline, the position interpolates
             linearly across micro-steps and the visible motion
             appears as a continuous smooth curve. */

          /* spawn invisible at top of orb's particle ring */
          0%, 3%   { transform: translate(-50%, 0) scale(0.9); opacity: 0; }
          /* fade in */
          5%       { transform: translate(-50%, 0) scale(1); opacity: 1; }
          /* Dense sine-wave fall samples (every 3% of cycle).
             All Y values scaled down ~6% from previous so the
             impact lands at y=370 (was 395) — that puts the flash
             ~25 px higher, just above the flow text labels instead
             of slightly below their centre. */
          8%       { transform: translate(calc(-50% + 5px),  19px) scale(1.02); opacity: 1; }
          11%      { transform: translate(calc(-50% + 10px), 37px) scale(1.03); opacity: 1; }
          14%      { transform: translate(calc(-50% + 12px), 55px) scale(1.04); opacity: 1; }
          17%      { transform: translate(calc(-50% + 11px), 74px) scale(1.05); opacity: 1; }
          20%      { transform: translate(calc(-50% + 9px),  93px) scale(1.06); opacity: 1; }
          23%      { transform: translate(calc(-50% + 4px), 111px) scale(1.07); opacity: 1; }
          26%      { transform: translate(calc(-50% - 2px), 129px) scale(1.08); opacity: 1; }
          29%      { transform: translate(calc(-50% - 7px), 148px) scale(1.09); opacity: 1; }
          32%      { transform: translate(calc(-50% - 11px), 167px) scale(1.10); opacity: 1; }
          35%      { transform: translate(calc(-50% - 12px), 186px) scale(1.12); opacity: 1; }
          38%      { transform: translate(calc(-50% - 11px), 204px) scale(1.14); opacity: 1; }
          41%      { transform: translate(calc(-50% - 7px), 222px) scale(1.16); opacity: 1; }
          44%      { transform: translate(calc(-50% - 2px), 241px) scale(1.19); opacity: 1; }
          47%      { transform: translate(calc(-50% + 4px), 260px) scale(1.22); opacity: 1; }
          50%      { transform: translate(calc(-50% + 9px), 277px) scale(1.25); opacity: 1; }
          53%      { transform: translate(calc(-50% + 11px), 296px) scale(1.29); opacity: 1; }
          56%      { transform: translate(calc(-50% + 12px), 315px) scale(1.34); opacity: 1; }
          59%      { transform: translate(calc(-50% + 9px), 334px) scale(1.40); opacity: 1; }
          62%      { transform: translate(calc(-50% + 5px), 352px) scale(1.46); opacity: 1; }
          /* settle to centre at impact, peak size */
          65%      { transform: translate(-50%, 370px) scale(1.5); opacity: 1; }
          /* impact: shrink + fade as ripple takes over */
          68%      { transform: translate(-50%, 370px) scale(0.3); opacity: 0; }
          /* hold invisible until next cycle */
          100%     { transform: translate(-50%, 370px) scale(0.3); opacity: 0; }
        }
        /* Ripple wave — spawns at the impact point on the TypeStrip
           and grows horizontally outward. ScaleX from 0 (collapsed)
           through 1.1 (overshoot beyond the TypeStrip text width)
           with a fade. Sync'd to the 8s particle cycle so impact and
           ripple peak together. */
        @keyframes typestrip-ripple {
          /* invisible until particle is about to hit */
          0%, 64%  { transform: translateX(-50%) scaleX(0); opacity: 0; }
          /* burst at impact (synced to particle's 68% scale-down frame) */
          68%      { transform: translateX(-50%) scaleX(0.4); opacity: 1; }
          /* expand outward, washing through the TypeStrip */
          78%      { transform: translateX(-50%) scaleX(1); opacity: 0.65; }
          /* fade as the wave dissipates */
          88%      { transform: translateX(-50%) scaleX(1.1); opacity: 0; }
          /* hold invisible until next cycle */
          100%     { transform: translateX(-50%) scaleX(1.1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-particle-bridge { animation: none !important; opacity: 0 !important; }
          .typestrip-ripple    { animation: none !important; opacity: 0 !important; }
        }
        /* Chrome shimmer — slow polished sweep across the headline.
           Background-position animation works with bg-clip: text by
           sliding a bright highlight band across each line. 7s total
           cycle with the bright band passing through ~midcycle. The
           ease-in-out curve gives the highlight a natural "polish"
           feel rather than a constant slide. */
        @keyframes chrome-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-anim         { animation: none !important; }
          .chrome-shimmer  { animation: none !important; background-position: 0% 50% !important; }
        }
      `}</style>

      {/* Particle bridge — Option B: drop + ripple.
          Particle drops straight down from above the orb area (top
          centre) onto the TypeStrip. On impact, a horizontal violet
          ripple wave bursts outward and washes through the strip
          text, then fades. Two synchronised animations on a single
          8s cycle. */}
      {/*
        Particle + ripple `top` values are now driven by the CSS
        custom property `--strip-top`, set on the Hero outer by
        the useLayoutEffect above. The particle's keyframe travels
        a fixed 370 px (top + 370 = strip top), so we set
          particle top: calc(var(--strip-top) - 370px)
          ripple   top: var(--strip-top)
        Fallback values (320 / -50) match the previous hard-coded
        layout for the lg breakpoint, so the very first paint
        (before useLayoutEffect runs) is identical to the old
        behaviour; once measured (synchronously, before browser
        paint), the variable updates and impact is locked to the
        strip top at every zoom / breakpoint.
      */}
      <div
        aria-hidden
        className="orb-particle-bridge absolute pointer-events-none rounded-full"
        style={{
          left: "50%",
          top: "calc(var(--strip-top, 320px) - 370px)",
          width: 5,
          height: 5,
          background: "#A855F7",
          boxShadow:
            "0 0 10px rgba(168,85,247,0.95), 0 0 20px rgba(168,85,247,0.55)",
          transform: "translate(-50%, 0)",
          opacity: 0,
          animation: "particle-drop 8s linear 2500ms infinite",
        }}
      />
      <div
        aria-hidden
        className="typestrip-ripple absolute pointer-events-none rounded-full"
        style={{
          left: "50%",
          top: "var(--strip-top, 320px)",
          width: 600,
          height: 2,
          transform: "translateX(-50%) scaleX(0)",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.78) 25%, rgba(216,180,254,1) 50%, rgba(168,85,247,0.78) 75%, transparent 100%)",
          boxShadow:
            "0 0 6px rgba(216,180,254,0.85), 0 0 16px rgba(168,85,247,0.75), 0 0 34px rgba(168,85,247,0.45)",
          opacity: 0,
          animation: "typestrip-ripple 8s ease-out 2500ms infinite",
        }}
      />

      {/*
        ─── Logo — GAS Orb + Magnetic Particle Halo ───

        Renders the GasOrbHalo composite: orb image + breathing purple
        halo + 2 dashed structural rings + 36 rotating ticks + 22
        orbiting glow particles. See src/components/GasOrbHalo.tsx for
        the locked component contract.

        size=124 preserves the original Hero orb footprint (the
        previous wrapper was clamp(100px, 13.5vh, 124px); 124 is the
        upper bound). The particle ring extends 1.7× beyond the orb
        radius — at size=124 that is ~105 px on every side, well
        within the surrounding empty space inside the lg:col-span-7
        Hero column.

        Parents in the overflow chain:
          Hero outer (<div className="relative w-full max-w-[760px] …">)
            — no overflow-hidden ✓
          login.route.tsx <div lg:col-span-7 …>      — no overflow-hidden ✓
          login.route.tsx grid container             — no overflow-hidden ✓
          GasLoginBackground                          — overflow-hidden,
            but page-wide so particles render freely inside the viewport.
      */}
      {/*
        The orb image has ~50% transparent padding around the artwork,
        so a size=288 box reserves more vertical space than the visible
        orb needs. The 200px wrapper compresses the layout footprint to
        roughly the visible orb height, while overflow:visible lets the
        halo, rings, and particles render outside the wrapper without
        being clipped. Adjust the height value (200) up or down to taste:
          - lower = headline pulls closer to the orb
          - higher = more clear space below the orb
        Do not remove the overflow:visible — clipping breaks the ring.
      */}
      <div
        className="orb-reveal relative flex items-center justify-center"
        style={{
          height: 200,
          width: 288,
          overflow: "visible",
          // First-load cinematic: orb materializes first (0ms),
          // then headline / pipeline / divider / body follow in
          // sequence. See the orb-reveal keyframe in the <style>
          // block above.
          animation: "orb-reveal 800ms ease-out both",
        }}
      >
        <GasOrbHalo size={288} particleCount={36} />
      </div>

      {/* ─── Headline ─── */}
      {/*
        ─── Headline — 2 visible lines ───
        Two block-level children of the <h1>:
          line 1 — white preamble  ("FROM CANVAS TO EXECUTION.")
          line 2 — gradient line   ("FULLY AUTONOMOUS.")
        The gradient wrapper (white → soft violet → light
        indigo) is unchanged in colour and direction; it now
        applies to a single line. The previous invisible
        spacer span was removed in this pass — the headline
        now naturally occupies 2 line-heights and everything
        below it shifts up by exactly that amount, restoring
        the original headline → flow visual gap.
      */}
      <h1
        // Orb → Headline (hierarchy bump): mt-5 lg / mt-4 xl+
        // (20 px lg / 16 px xl+). Slightly more than the baseline
        // section gap (16 lg / 13 xl+) so the orb gets visual breathing
        // room as the column's anchor element. Never exceeds the cap.
        className="sb-anim relative mt-5 xl:mt-4 font-display font-black tracking-tighter text-white leading-[1.05] whitespace-nowrap text-[1.5rem] sm:text-[1.9rem] lg:text-[2.5rem] xl:text-[3rem] 2xl:text-[3.4rem]"
        style={{
          animation: "sb-rise 480ms 600ms ease-out both",
          // Ambient violet glow — makes the headline feel lit by
          // the orb above it instead of floating disconnected.
          // Two-layer drop-shadow: a wider soft halo + a tight
          // inner bloom. rgba values match the orb's particle
          // tint family so the effect reads as "same light source".
          filter:
            "drop-shadow(0 0 32px rgba(167,139,250,0.20)) drop-shadow(0 0 12px rgba(196,181,253,0.18))",
        }}
      >
        {/*
          Both lines now use the chrome metallic gradient + animated
          shimmer for unified award-tier headline treatment. The
          gradient has multiple bright "highlight spikes" mimicking
          polished chrome, and background-size: 250% combined with
          the chrome-shimmer keyframe slides the highlights across
          each line on a 7s cycle. WebkitBackgroundClip + Webkit
          TextFillColor forced inline for cross-browser consistency
          (see prior comment for rationale).
        */}
        {/*
          Option C v2 — Liquid Metal Violet (orb-tinted, contemplative pace).
          The peak highlights are no longer pure white — they have been
          shifted toward pale violet (#f5e9ff / #e9d5ff for line 1, slightly
          cooler #f0eaff / #ddd6fe for line 2). This makes the bright
          moments read as "the orb is the light source" rather than
          "a spotlight from outside the scene". On-brand luminance.
          Animation slowed to 30s — roughly the slowest orb particles'
          orbit pace, giving the shimmer the same contemplative drift
          rhythm as the rest of the scene. Line 2 offset 2.5s to keep
          the proportional gap at the new tempo.
        */}
        <span
          className="chrome-shimmer block bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(110deg, #5b3f8e 0%, #7c5bb8 12%, #b09bea 25%, #f5e9ff 40%, #e9d5ff 50%, #c4b5fd 60%, #8e6bd0 72%, #5b3f8e 82%, #ddd6fe 92%, #5b3f8e 100%)",
            backgroundSize: "250% 100%",
            backgroundPosition: "0% 50%",
            animation: "chrome-shimmer 30s ease-in-out infinite",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FROM RISK TO REVELATION.
        </span>
        <span
          className="chrome-shimmer block bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(110deg, #4a4d7e 0%, #6e6ea8 12%, #a8a8e0 25%, #f0eaff 40%, #ddd6fe 50%, #c7d2fe 60%, #7e6ec0 72%, #4a4d7e 82%, #c7c4f0 92%, #4a4d7e 100%)",
            backgroundSize: "250% 100%",
            backgroundPosition: "0% 50%",
            animation: "chrome-shimmer 30s ease-in-out 2.5s infinite",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FULLY AUTONOMOUS.
        </span>
      </h1>

      {/* ─── Stage flow — Pipeline Sweep ───
          PATH B PREVIEW: this entire animated chip pipeline JSX block
          is wrapped below in `{false && (...)}` to render-disable it
          without deleting any code. The full implementation is also
          backed up byte-for-byte at:
            gas-chip-pipeline-extract/Hero.with-pipeline.backup.tsx
          To restore the chip pipeline: change `false` → `true` on
          the next line. The Path B replacement type strip is rendered
          immediately after the closing `)}` of this block.
      */}
      {false && (
      <div
        className="sb-anim relative w-full px-[4%]"
        style={{
          animation: "sb-rise 520ms 1100ms ease-out both",
          // headline → flow : fixed 2rem (32 px). Constant across
          // every breakpoint — no vh scaling.
          marginTop: "2rem",
        }}
        aria-label="GAS engine pipeline sweep"
      >
        {/*
          Connector rail — geometry FIXED to start at chip-0 centre and
          end at chip-6 centre. With a 7-column grid, each chip centre
          sits at (2i+1)/14 of the row width, so chip-0 is at 100/14%
          from the left and chip-6 is at 100/14% from the right.
          Head positions are computed against this rail's [0..1] span,
          so the head physically cannot start before Canvas or pass
          beyond Kickoff.
        */}
        <div
          className="absolute h-[2px] overflow-visible rounded-full"
          style={{
            // RESTORED to chip centre: top:27 with h-[2px] →
            // rail centre at y=28 = h-14 chip centre (56 / 2).
            // The sweep head runs ON THIS LINE BEHIND THE ICONS,
            // exactly as before — no duplicate moving lights
            // anywhere else in the composition.
            //
            // Horizontal endpoints unchanged (10.5714 % each
            // side at the px-[4%] flow div), so the head still
            // spans chip-0 → chip-6 in pixel-perfect sync with
            // each stage's igniteAt time.
            top: "27px",
            left: "10.5714%",
            right: "10.5714%",
          }}
          aria-hidden
        >
          {/* The static base line that used to sit behind the icons
              has been REMOVED. The flow rail container is invisible
              by itself — only the segmented sweep below shows. */}

          {/* Persistent accumulating dashed trail — drawn BY the
              moving sweep line as it hops from chip to chip, and
              KEPT visible until the cycle resets.

              Behaviour across one cycle:
                • Stage 0 ring + pop: trail empty (right edge sits
                  inside chip-0, fully masked by chip-0's z-stack).
                • Stage 0 shoot: right edge grows with the sweep,
                  drawing dashes from chip-0's right edge toward
                  chip-1.
                • Stage 1 ring + pop: sweep is parked at chip-1,
                  trail right edge stays at chip-1 (12 px past
                  chip-1's centre, hidden inside chip-1). The
                  chip-0 → chip-1 segment remains visible.
                • Stage 1 shoot: right edge grows again, extending
                  the trail toward chip-2. The chip-0 → chip-1
                  segment is still there.
                • ...repeat through stages 2, 3, 4, 5...
                • Stage 6 (Kickoff) ring + pop + rocket launch:
                  full trail visible end-to-end (chip-0 → chip-6).
                • Cycle reset (timer-ring jumps back to stage 0
                  ring): right edge collapses back inside chip-0
                  → trail visually clears for the next cycle.

              Geometry — left edge is permanent, right edge tracks
              the sweep:
                trail_left  = chip-0 LEFT edge = -28 px from rail
                              left (chip-0 centre is at 0 % of
                              rail width, chips are 56 px ⌀, so
                              their left edge sits 28 px left of
                              centre). Anchoring left here lets
                              the trail accumulate from chip-0
                              outward; chip-0's own z-stacking
                              masks the portion behind it.
                trail_right = line_right − 12 px (during shoot →
                              dashes meet the sweep's transparent-
                              left gradient with no visual seam)
                              OR chip-N centre − 12 px (during
                              ring/pop → tail dash sits inside
                              chip-N, hidden by chip-N's z-stack).
                              Both forms are produced by the
                              SAME formula because lineOffsetPx
                              is 0 outside the shoot phase.

              No render guard on phase or stage: visible whenever
              the timer-ring sequence is on and motion is allowed.
              The visual emptiness during stage-0 ring + pop is
              produced naturally by the geometry (right edge sits
              inside chip-0 → masked → invisible). */}
          {USE_TIMER_RING_SEQUENCE && !reduceMotion && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                // 3 px thick, centred on the conceptual rail
                // axis (top: -1.5 px so the 3 px element
                // straddles the line evenly above and below).
                top: "-1.5px",
                height: "3px",
                // Permanent LEFT anchor at chip-0's left edge
                // (centre 0 % − 28 px). The trail is allowed to
                // extend behind chip-0; chip-0's z-stacking
                // hides the portion behind it. This anchoring
                // is what makes the trail ACCUMULATE from
                // chip-0 outward across the whole cycle.
                left: "-28px",
                // RIGHT edge: 12 px to the LEFT of the sweep
                // line's right edge. During shoot the sweep is
                // moving (lineRightX growing, lineOffsetPx
                // shrinking from 28 → 0) so the dashes extend
                // continuously. During ring/pop, lineOffsetPx
                // is 0 and lineRightX is parked at chip-N's
                // centre — the right edge becomes
                // (chip-N centre − 12 px), 12 px inside chip-N,
                // hidden by chip-N's own z-stacking. Net visual
                // effect: the trail terminates AT chip-N's
                // edge for the duration of the parked window.
                right: `calc(${100 - lineRightX}% + ${
                  12 - lineOffsetPx
                }px)`,
                // Slate-300 (rgb 203, 213, 225) at 0.80 alpha —
                // the same colour the resting icon glyphs carry
                // (Layer 5 is `text-slate-300`). 6 px dash,
                // 6 px gap → even, restrained rhythm. No
                // box-shadow / glow — the trail is the "course
                // has been run" mark, not an active light.
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(203,213,225,0.80) 0px, rgba(203,213,225,0.80) 6px, transparent 6px, transparent 12px)",
                pointerEvents: "none",
                willChange: "right",
              }}
            />
          )}

          {/* Sweep line — segmented, node-to-node energy hand-off.
              • Pill-shaped (border-radius 9999) — soft rounded
                leading edge.
              • SHORTER than before: 48 px wide so the line FITS
                BEHIND each chip (h-14 = 56 px diameter) at
                end-of-shoot, achieving the "disappears behind
                the icon" effect.
              • Gradient: transparent left → bright white tip on
                the right; the leading edge reads as the front
                of the energy bullet.
              • TIGHTENED 4-layer halo (max 28 px outer radius,
                down from 48 px) so the line's glow doesn't
                bleed past the next chip and ruin the
                hidden-behind-chip illusion.
              • lineOpacity is INSTANT 0/1 — line either shoots
                visibly or is invisible, never fades while
                stationary. */}
          {lineOpacity > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-1.5px",
                height: "5px",
                width: "48px",
                // `lineOffsetPx` shifts the line's right edge
                // INSIDE the source chip at shootProgress = 0
                // (line fully hidden behind chip-i) and
                // decreases linearly to 0 by shootProgress = 1
                // (line right edge at chip-(i+1) centre, end
                // logic unchanged).
                left: `calc(${lineRightX}% + ${lineOffsetPx}px)`,
                transform: "translateX(-100%)",
                borderRadius: "9999px",
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(196,181,253,0.18) 40%, rgba(221,214,254,0.55) 70%, rgba(245,243,255,0.92) 88%, rgba(255,255,255,1) 100%)",
                // Outer two halo radii tightened (18→14, 28→22)
                // to sharpen the line's leading edge — reads as
                // forward momentum rather than soft drift.
                boxShadow:
                  "0 0 4px rgba(255,255,255,0.60)" +
                  ", 0 0 10px rgba(196,181,253,0.50)" +
                  ", 0 0 14px rgba(139,92,246,0.30)" +
                  ", 0 0 22px rgba(139,92,246,0.14)",
                opacity: lineOpacity,
                pointerEvents: "none",
                willChange: "left, opacity",
              }}
            />
          )}

          {/* ─── Final-stage rocket-launch overlay ──────────────
              Renders ONLY during chip-6's SHOOT phase. The
              wrapper sits at the rail's right end (left:100%
              = chip-6 centre) and is centred vertically on the
              rail (top:50% + translateY(-50%)). Horizontal
              motion comes from translateX(rocketProgress ×
              ROCKET_TRAVEL_VW vw). The Rocket icon inside
              uses the EXACT same active-glow style stack as
              the in-chip Layer 6 active icon (color from
              STAGES[6], strokeWidth 2, 5-layer drop-shadow at
              intensity 1, glowRgb from STAGES[6]) — no glow
              values introduced or modified. Trail is a small
              gradient pill behind the rocket, contained
              entirely inside this overlay. */}
          {isRocketLaunching && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: "100%",
                top: "50%",
                width: "36px",
                height: "36px",
                // Diagonal motion: translateX moves right,
                // translateY (negative) moves up. With both
                // components scaled by the SAME progress and
                // matched magnitudes (TRAVEL_VW = RISE_VW),
                // the resulting motion vector is a true 45°
                // up-right diagonal — co-linear with the
                // lucide Rocket icon's natural tip axis.
                // Uses rocketMotionProgress (eased) — the
                // rocket bursts off chip-6 quickly then
                // settles into a controlled glide. Every
                // other rocket value (overlay anchor, trail
                // dimensions, drop-shadow stack, ROCKET_*
                // constants) is unchanged.
                transform: `translate(-50%, -50%) translateX(${
                  rocketMotionProgress * ROCKET_TRAVEL_VW
                }vw) translateY(-${
                  rocketMotionProgress * ROCKET_RISE_VW
                }vw)`,
                pointerEvents: "none",
                willChange: "transform",
              }}
            >
              {/* Rocket icon — same lucide component, same
                  active-glow style as Layer 6 active icon.
                  intensity is hard-coded at 1 here (Kickoff
                  is at full ignition during its shoot).
                  Glow stack matches the in-chip Layer 6
                  exactly — compact 3-layer (1/3/20 px) after
                  the glow-tightening pass.

                  NO TRAIL on the rocket — trails belong on
                  the chip-to-chip SWEEP LINE, never on the
                  rocket. */}
              <Rocket
                aria-hidden
                className="h-9 w-9"
                style={{
                  color: STAGES[FINAL_STAGE_INDEX].color,
                  strokeWidth: 2,
                  opacity: 1,
                  // Rocket head brightness bumped further in
                  // the launch-refinement pass (0.98/0.94/0.88
                  // → 1.0/0.97/0.92) so the head reads as a
                  // stronger launch event paired with the
                  // strengthened trail. Stack structure
                  // unchanged (3 layers, same blur radii). The
                  // boost is on the rocket overlay only — the
                  // in-chip Layer 6 active-icon glow on chips
                  // 0-5 is untouched.
                  filter: `drop-shadow(0 0 1px rgba(${
                    STAGES[FINAL_STAGE_INDEX].glowRgb
                  }, 1)) drop-shadow(0 0 3px rgba(${
                    STAGES[FINAL_STAGE_INDEX].glowRgb
                  }, 0.97)) drop-shadow(0 0 20px rgba(${
                    STAGES[FINAL_STAGE_INDEX].glowRgb
                  }, 0.92))`,
                }}
              />
            </div>
          )}

          {/* Launch line was MOVED out of the rail container
              in the reconciliation pass. It now lives inside
              the chip <ul> (the true chip coordinate system),
              anchored explicitly to chip-6 via grid percentages
              derived from grid-cols-7. See the JSX inside the
              ul below the STAGES.map. */}
        </div>

        {/*
          Grid gap-0: with gap-0 each chip centre lands at exactly
          (2i+1)/14 of the ul width, which lets the rail endpoints
          (13.1429 % each side at the new px-[7%] padding) align
          *pixel-perfectly* with chip-0 and chip-6 centres. Visible
          chip-to-chip spacing is determined by ul width × cell
          fraction, so the px-[7%] tightening shrinks inter-icon
          horizontal distance by ~5 % vs the previous pass.
        */}
        <ul
          className="relative grid grid-cols-7 gap-0"
          style={{
            // Loop reset signal — entire chip grid dims briefly
            // in the last 130 ms of every cycle, then snaps
            // back. Reads as a quiet "reset" beat.
            opacity: cycleDipOpacity,
          }}
        >
          {STAGES.map(({ label, Icon, color, glowRgb }, i) => {
            const intensity = stageIntensities[i];
            // Per-chip execution-state derivations.
            // • Completed chips (already past) get the tightest
            //   outer blur (16 px) — reads as "locked in".
            // • Currently-active chip (its RING/POP/SHOOT is in
            //   flight) gets a slightly tightened outer blur
            //   (18 px) — sharper than a future state, looser
            //   than fully completed.
            // • Future / inactive chips fall through to the
            //   default 20 px (irrelevant in practice — their
            //   intensity is 0 so the drop-shadow is "none").
            const isCompletedChip =
              USE_TIMER_RING_SEQUENCE && timerRing.currentStage > i;
            const isActiveChip =
              USE_TIMER_RING_SEQUENCE && timerRing.currentStage === i;
            const outerBlur = isCompletedChip ? 16 : isActiveChip ? 18 : 20;
            // Final-stage completion flash — chip-6 only. Adds
            // a small alpha boost to the chip border during the
            // last 100 ms of the rocket SHOOT.
            const flashBoost =
              i === FINAL_STAGE_INDEX ? finalFlashProgress * 0.18 : 0;
            // Stages 0-5 keep their icon glyph permanently
            // neutral (slate-300, no neon, no drop-shadow).
            // Only Kickoff (the final stage) still runs the
            // active-icon fade-in / glow stack so the rocket
            // glyph can carry the launch energy. The chip
            // border, inset shadows, inner core, and timer
            // ring stay coloured for ALL stages — only the
            // glyph styling is suppressed for 0-5.
            const isFinalStage = i === FINAL_STAGE_INDEX;
            // Active-stage depth boost — applies ONLY to the
            // chip whose RING/POP/SHOOT is currently in flight.
            // Multiplies the inner core's alpha and adds a
            // small additional border-alpha tick so the
            // currently-animating chip reads as "alive" rather
            // than just "lit". No new layers, no new glow,
            // no extra colour — same glowRgb, same blur, same
            // structure. Reset chips and completed chips are
            // unchanged.
            const activeBoost = isActiveChip ? 1.20 : 1.0;
            const activeBorderBoost = isActiveChip ? 0.06 : 0;
            // Visual-normalization layer for stages 0-5 — the
            // chip render reads these CLAMPED inputs instead of
            // the raw intensity / activeBoost / activeBorderBoost
            // values. The animation system itself is byte-
            // identical; only the OUTPUT is normalized so all
            // chips in 0-5 reach the same lit brightness with no
            // pop-peak overshoot and no per-chip variance.
            //   visualIntensity  clamped to [0, 1] — kills the
            //                    1.5 pop spike that briefly
            //                    overrendered the active chip.
            //   stageActiveBoost forced to 1.0 — disables the
            //                    20 % inner-core depth multiplier
            //                    that lifted the active chip
            //                    above completed/future chips.
            //   stageActiveBorderBoost forced to 0 — disables
            //                    the +0.06 border-alpha tick.
            // Kickoff (isFinalStage === true) keeps the full
            // unmodified intensity / activeBoost /
            // activeBorderBoost so the launch event still reads
            // as the strongest moment in the cycle.
            const visualIntensity = isFinalStage
              ? intensity
              : Math.min(1, intensity);
            const stageActiveBoost = isFinalStage ? activeBoost : 1.0;
            const stageActiveBorderBoost = isFinalStage
              ? activeBorderBoost
              : 0;

            return (
              <li key={label} className="flex flex-col items-center gap-3">
                {/*
                  Luminous-glow stack — TIGHTENED in this pass.
                  Layout footprint stays h-14 w-14. Layers 1 (OUTER
                  BLOOM) and 2 (MID HALO) — the radial haze layers
                  that previously bled colour out to inset:-26px
                  — were REMOVED to take the haze off the chip
                  ring and concentrate the neon onto the icon.
                  The chip border + inset shadows (Layer 3) and
                  the inner core (Layer 4) still make the chip
                  read as "lit from within", and the icon's own
                  drop-shadow extends a small distance past the
                  chip edge to give a tight halo where the icon
                  glow meets the dark background.
                */}
                <div
                  className="relative h-14 w-14 flex items-center justify-center"
                  style={{ overflow: "visible" }}
                >
                  {/* Layers 1 and 2 intentionally omitted —
                      see stack header comment above. */}

                  {/* ── Layer 2.5 — TIMER RING (NEW, flag-gated) ──
                      Renders ONLY when:
                        • USE_TIMER_RING_SEQUENCE is true
                        • this chip is the timer-ring's currentStage
                        • the sequence is in its RING phase
                      During RING phase the chip's intensity is 0,
                      so bloom/halo/inset glow are all suppressed —
                      the ring is the only visual on this chip.
                      Position is via `inset:-6px` (no layout shift),
                      transform: rotate(-90deg) places progress
                      origin at 12 o'clock, stroke-dashoffset gives
                      clockwise fill. Stroke colour is the stage's
                      existing hex via glowRgb (no colour change). */}
                  {USE_TIMER_RING_SEQUENCE &&
                    !reduceMotion &&
                    timerRing.currentStage === i &&
                    timerRing.phase === "ring" && (
                      <svg
                        aria-hidden
                        className="absolute pointer-events-none"
                        style={{
                          inset: "-6px",
                          transform: "rotate(-90deg)",
                        }}
                        width="68"
                        height="68"
                        viewBox="0 0 68 68"
                      >
                        {/* Background ring — faint full circle.
                            strokeWidth tightened (2 → 1.5) so
                            the timer reads as a precise gauge
                            rather than a soft halo. */}
                        <circle
                          cx={34}
                          cy={34}
                          r={32}
                          fill="none"
                          stroke={`rgba(${glowRgb}, 0.15)`}
                          strokeWidth={1.5}
                        />
                        {/* Progress ring — clockwise. Same
                            tightened stroke width as the
                            background ring for a clean,
                            mechanical feel.
                            EASING (visual-progress only):
                            easeRingFill on ringProgress —
                            preserves the easeOutExpo "fast
                            initial sweep" character for the
                            first 85 % of time, then a soft
                            easeInOutCubic settle over the
                            last 15 % so the ring visibly
                            clicks into place. RING_MS
                            unchanged; the ring still
                            finishes at exactly 1500 ms
                            (easeRingFill(1) === 1). */}
                        <circle
                          cx={34}
                          cy={34}
                          r={32}
                          fill="none"
                          stroke={`rgba(${glowRgb}, 0.95)`}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={
                            2 * Math.PI * 32 *
                            (1 - easeRingFill(timerRing.ringProgress))
                          }
                        />
                      </svg>
                    )}

                  {/* ── Layer 3 — CHIP BODY (visible disk) ──
                      Off-centre radial backgroundImage gives the
                      chip a sense of "lit-from-upper" depth.
                      Triple inset shadow: warm core glow, top-edge
                      specular highlight, bottom-edge colour wash. */}
                  <div
                    // Idle-vs-active two-state chip system.
                    //
                    // IDLE  (visualIntensity ≤ 0.02 — covers the
                    //        whole RING phase, the period before
                    //        a chip's first activation, and the
                    //        cycle reset window):
                    //   • className provides the ORIGINAL dark
                    //     chip surface — bg-slate-900/85 +
                    //     ring-1 ring-slate-950/60 +
                    //     backdrop-blur-sm. Identical for all
                    //     seven stages including Kickoff and
                    //     Provision.
                    //   • borderColor = "transparent"  → the
                    //     2 px border is invisible. The 1 px
                    //     slate ring (ring-1 ring-slate-950/60)
                    //     defines the chip outline against the
                    //     page.
                    //   • backgroundColor inline = undefined →
                    //     the bg-slate-900/85 from className
                    //     wins. No coloured tint visible.
                    //   • boxShadow = "none". No neon glow, no
                    //     inset, no outer halo.
                    //
                    // ACTIVE (visualIntensity > 0.02 — POP /
                    //        SHOOT / completed):
                    //   • Same className stays — the dark slate
                    //     base remains underneath, the inline
                    //     overrides paint the neon system on
                    //     top of it.
                    //   • borderColor ramps to a neon stroke
                    //     in the stage colour (peak alpha 0.95
                    //     at visualIntensity = 1, plus
                    //     flashBoost / stageActiveBorderBoost
                    //     contributions for Kickoff).
                    //   • backgroundColor inline tints the
                    //     chip with the stage colour at 0.10
                    //     alpha — same rule for ALL seven
                    //     stages so Provision is byte-identical
                    //     to Canvas/Capture/Qualify/Configure/
                    //     Propose. The slate base partially
                    //     fades behind the tint; for Kickoff
                    //     the heavy outer glow makes the
                    //     remaining slate read as a green-cast
                    //     dark base ("dark base can fade away
                    //     so the green glow state appears").
                    //   • boxShadow:
                    //       Kickoff → 3 outer green halos
                    //                 (10/20/40 px) + 1 inset
                    //                 12 px (per spec).
                    //       Stages 0-5 → 3 inset-only layers
                    //                    (8/16/10 px) at the
                    //                    spec alphas. NO outer
                    //                    halo on stages 0-5.
                    //
                    // Provision (i = 5) follows the stages-0-5
                    // branch in every path — same className,
                    // same borderColor, same backgroundColor,
                    // same boxShadow. No special-case anywhere.
                    className="relative h-14 w-14 rounded-full flex items-center justify-center bg-slate-900/85 ring-1 ring-slate-950/60 backdrop-blur-sm border-2"
                    style={{
                      borderColor:
                        visualIntensity > 0.02
                          ? `rgba(${glowRgb}, ${0.95 * visualIntensity + flashBoost + stageActiveBorderBoost})`
                          : "transparent",
                      // backgroundColor inline override REMOVED.
                      // Previously the active state painted a
                      // stage-tinted rgba over the chip body,
                      // which (because inline styles beat the
                      // className) replaced the Tailwind
                      // `bg-slate-900/85` and made the dark base
                      // disappear under the tint. Dropping the
                      // inline rule lets `bg-slate-900/85` from
                      // the className be the chip's body fill
                      // at ALL times — idle AND popped. The
                      // neon character of the active state is
                      // now carried entirely by `borderColor`
                      // (the stage-coloured rim above) and the
                      // inset boxShadow stack (the stage-
                      // coloured inner glow below), both of
                      // which LAYER ON TOP of the always-on
                      // dark base instead of replacing it.
                      boxShadow:
                        visualIntensity > 0.02
                          ? (isFinalStage
                              ? [
                                  // Kickoff — wider inset glow stack
                                  // (10 / 20 / 32 px). Inset-only —
                                  // contained within the chip.
                                  `inset 0 0 10px rgba(${glowRgb}, ${0.90 * visualIntensity})`,
                                  `inset 0 0 20px rgba(${glowRgb}, ${0.45 * visualIntensity})`,
                                  `inset 0 0 32px rgba(${glowRgb}, ${0.22 * visualIntensity})`,
                                ]
                              : [
                                  // Stages 0-5 — tighter inset glow
                                  // stack (8 / 16 / 10 px).
                                  `inset 0 0 8px rgba(${glowRgb}, ${0.90 * visualIntensity})`,
                                  `inset 0 0 16px rgba(${glowRgb}, ${0.42 * visualIntensity})`,
                                  `inset 0 0 10px rgba(${glowRgb}, ${0.55 * visualIntensity})`,
                                ]
                            ).join(", ")
                          : "none",
                    }}
                    data-state={visualIntensity > 0.5 ? "lit" : "idle"}
                  >
                    {/* Layer 4 (INNER CORE) was REMOVED entirely
                        in this pass. It used to render a small
                        radial centre-dot for Kickoff and was
                        already gated off for stages 0-5. The
                        Kickoff active-icon glow (Layer 6) and
                        the rocket-launch overlay still carry
                        Kickoff's "peak" character — no centre
                        dot is needed on top of either. */}

                    {/* ── Layer 5 — ICON GLYPH (slate-300) ──
                        Always rendered as the chip's RESTING glyph.
                        Held at opacity 0.7 in slate-300 — the icon
                        stays muted/neutral until the icon-colour
                        cascade reaches it. The instant iconLit[i]
                        flips true the cascade snaps Layer 5 to
                        opacity 0 so the colour Layer 6 below
                        renders alone, with no double-glyph stack.
                        At cycle wrap iconLit collapses back to
                        false → all seven Layer 5 icons return to
                        opacity 0.7 in one frame, ready for the
                        next pass. */}
                    <Icon
                      aria-hidden
                      className="absolute h-9 w-9 text-slate-300"
                      style={{
                        strokeWidth: 1.75,
                        opacity: iconLit[i] ? 0 : 0.7,
                      }}
                    />

                    {/* ── Layer 6 — ACTIVE ICON + COMPACT NEON GLOW ──
                        RENDERED FOR EVERY CHIP whose `iconLit[i]`
                        flag is true. Drives the icon-colour cascade
                        — chip i flips to its full stage colour at
                        the moment iconLit[i] turns true (hard snap,
                        no fade). Stays lit through the rest of the
                        cascade window AND through the rocket SHOOT
                        phase. Reset is automatic at cycle wrap when
                        iconLit collapses back to all-false.
                        Glow stack (full alpha — no intensity ramp):
                          1 px  @ 0.95   ← hard sharp luminous core
                          3 px  @ 0.90   ← close inner tube-glass
                          outerBlur px (16/18/20) @ 0.85   ← aura
                        Kickoff special case: during its SHOOT phase
                        (rocket-launch overlay in flight) the in-chip
                        Layer 6 hides so the launching rocket overlay
                        carries the icon visual without two rockets
                        rendering at once. The chip's base glow
                        (border, inset shadow) stays at intensity 1
                        so the chip body still reads as lit underneath. */}
                    {iconLit[i] && (
                      <Icon
                        aria-hidden
                        className="absolute h-9 w-9"
                        style={{
                          color,
                          strokeWidth: 2,
                          opacity:
                            isFinalStage && USE_TIMER_RING_SEQUENCE && isRocketLaunching
                              ? 0
                              : 1,
                          filter: `drop-shadow(0 0 1px rgba(${glowRgb}, 0.95)) drop-shadow(0 0 3px rgba(${glowRgb}, 0.90)) drop-shadow(0 0 ${outerBlur}px rgba(${glowRgb}, 0.85))`,
                        }}
                      />
                    )}
                  </div>
                </div>
                {/*
                  Label — single white text span. The previous
                  duplicate glow overlay (a transparent-fill,
                  text-shadow-only sibling span used to paint a
                  stage-coloured neon halo behind the label) was
                  REMOVED in this pass. The wrapper is kept as
                  `relative inline-block` to preserve the exact
                  DOM/baseline structure that surrounded the
                  former overlay — no layout shift.
                */}
                <span className="relative inline-block">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white">
                    {label}
                  </span>
                </span>
              </li>
            );
          })}

          {/* Dashed launch line REMOVED entirely in this
              reconciliation pass. Multiple placement attempts
              (rail-container anchor → chip-grid anchor) did
              not visually land per spec — to avoid leaving
              broken decorative artifacts, the element is gone.
              The rocket flies cleanly with no decorative line.
              If the launch line is reintroduced later it
              should originate from a verified live-DOM
              position. */}
        </ul>
      </div>
      )}

      {/* ─── Stage type strip (Path B — pipeline replacement) ───
          Replaces the 7-chip animated pipeline above with a single
          line of refined type. The icons were doing decorative work;
          type-only lets the orb stay the unambiguous hero. The full
          chip pipeline JSX is preserved above (wrapped in
          `{false && (...)}`); change false → true to restore.
      */}
      <div
        ref={stripRef}
        // headline → flow : baseline section gap = mt-4 lg / mt-[13px] xl+
        // (16 px / 13 px). Same value as all other section margins.
        className="sb-anim relative w-full mt-4 xl:mt-[13px]"
        style={{
          animation: "sb-rise 520ms 1100ms ease-out both",
        }}
        aria-label="GAS engine stages"
      >
        {/* Thin violet rule above the type — visually centered between
            the headline and the labels. Matching margin-bottom to the
            TypeStrip wrapper's marginTop (mt-4 lg / mt-[13px] xl+) so
            the rule has EQUAL spacing on both sides. */}
        <div
          aria-hidden
          className="mx-auto mb-4 xl:mb-[13px]"
          style={{
            width: "min(420px, 60%)",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(168,85,247,0.45) 50%, transparent)",
          }}
        />
        {/* Stage labels — small caps, wide-tracked.
            Path B v3 — Option 3 (sharp white with tight halo):
            opacity bumped 0.55 → 0.78 (readable threshold for fine-
            print typography on dark UIs); text-shadow blur radius
            collapsed 8px → 3px so the bloom reads as a tight halo
            (luminosity) instead of a wide cloud (haze). Same warmth
            as before, none of the fuzziness. KICKOFF retains full
            emerald accent — still the only coloured stage. */}
        <div
          // Responsive sizing — capped at 11px / 0.24em even at 2xl.
          // Earlier 2xl variant of 12px / 0.32em pushed the strip's
          // rendered width to ~870 px, which is wider than the Hero
          // column (~807 px at 2xl with max-w-[1600px] container).
          // KICKOFF wrapped to a second line. Capping at 11/0.24
          // keeps the strip ~647 px wide, fits cleanly on one line at
          // every breakpoint from lg upward (lg col ~537 / xl ~681 /
          // 2xl ~807 / wider screens cap at the 1600px container).
          //   lg  (1024+): 10px / 0.16em — fits in ~537 px Hero col
          //   xl  (1280+): 11px / 0.20em — fits in ~681 px Hero col
          //   2xl (1536+): 11px / 0.24em — fits in ~807 px Hero col
          // The Hero column is `hidden lg:flex` per login.route.tsx, so
          // these breakpoints cover every viewport width that actually
          // renders the strip. Below lg the entire Hero is hidden.
          className="font-mono text-center text-[10px] xl:text-[11px] tracking-[0.16em] xl:tracking-[0.20em] 2xl:tracking-[0.24em]"
          style={{
            fontWeight: 500,
            color: "rgba(255,255,255,0.78)",
            textTransform: "uppercase",
            textShadow: "0 0 3px rgba(168,139,250,0.20)",
          }}
        >
          {/* Regular spaces around the dots (was &nbsp; — non-breaking
              spaces — which prevented wrapping on narrow viewports and
              caused the strip to overflow the left column and overlap
              the login card). Regular spaces let the strip wrap cleanly
              to two lines on small screens while staying on one line at
              desktop widths. */}
          Expose · Extract · Diagnose · Calibrate · Verdict · Remediate ·{" "}
          <span style={{ color: "rgba(52,211,153,1.0)", textShadow: "0 0 10px rgba(52,211,153,0.35)" }}>Ascend</span>
        </div>
      </div>

      {/* ─── Premium divider — sits between flow and subtext ───
          Thinner than the flow rail (h-px vs h-[2px]), neutral
          soft white (so it doesn't compete with the violet flow
          line above), tapered to transparent on both ends, with
          a subtle white halo via box-shadow. Centered, max-w
          smaller than the column so it reads as a contained
          element, not a horizon line. */}
      <div
        aria-hidden
        // flow → divider : baseline section gap = mt-4 lg / mt-[13px] xl+
        // (16 px / 13 px). Same value as all other section margins.
        className="sb-anim mt-4 xl:mt-[13px] w-full max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px] mx-auto rounded-full"
        style={{
          // Path B uplift v3 — height reduced 2px → 1px to match the
          // visual weight of the violet rule above the TypeStrip. The
          // boxShadow halo + tapered gradient still keep it readable
          // against the dark background. Width unchanged (still grows
          // 560 → 640 → 720 with breakpoints).
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
          boxShadow:
            "0 0 14px rgba(168,85,247,0.55), 0 0 28px rgba(168,85,247,0.30)",
          animation: "sb-rise 540ms 1500ms ease-out both",
        }}
      />

      {/* ─── Subtext paragraph (centred, premium body type) ───
          Wider than before (760 vs 640) and one tier smaller
          + thinner so the long opening sentence wraps to fewer
          lines, cleaner. font-feature-settings turns on system
          stylistic sets where available — graceful no-op
          otherwise. */}
      <p
        // Subtext spacing : baseline section gap = mt-4 lg / mt-[13px] xl+
        // (16 px / 13 px). Same value as all other section margins.
        className="sb-anim mt-4 xl:mt-[13px] font-light text-[10px] md:text-[10.5px] lg:text-[11px] xl:text-[11.5px] 2xl:text-[12px] max-w-[720px] lg:max-w-[780px] xl:max-w-[920px] 2xl:max-w-[1040px] leading-[1.5] tracking-[0.02em] antialiased line-clamp-3"
        style={{
          animation: "sb-rise 600ms 1800ms ease-out both",
          // Path A v2 — premium fine-print treatment:
          //   • size dropped 0.5px (12/13/13.5 → 11.5/12.5/13)
          //   • max-width tightened (760 → 680) for sharper rag
          //   • leading reduced (1.70 → 1.55) for a denser block
          //   • letter-spacing widened (0.005em → 0.02em) for
          //     refined "magazine fine print" rhythm
          //   • opacity 0.62 — slightly lifted from the prior
          //     0.60 so the wider tracking remains legible
          color: "rgba(255,255,255,0.62)",
          fontFeatureSettings: '"ss01", "cv11"',
        }}
      >
        Most ERP environments are failing silently. GAS-ANOMALY was built to end that.
        <br />
        A fully autonomous AI audit engine that surfaces risk, quantifies leakage and delivers an unchallengeable
        <br />
        Verdict In five hours, without disruption. Nothing like it existed, until now!
      </p>

      {/* Supporting two-line block was REMOVED in this pass.
          The paragraph above is once again the closing
          element of the hero stack; the parent layout's
          vertical centring rebalances the whole column
          automatically, so no paragraph-spacing adjustment
          was applied. */}
    </div>
  );
}
