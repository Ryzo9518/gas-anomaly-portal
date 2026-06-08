/**
 * GasOrbHalo.tsx
 *
 * Verbatim port of the GAS orb + magnetic particle ring effect.
 *
 * Source of truth:
 *   Execution-Mode/artifacts/gas-portal/src/pages/LoginScreen.tsx
 *     lines 347-478  →  OrbParticleRing  (the magnetic ring)
 *     lines 573-597  →  Orb breathing halo (drop-shadow pulse)
 *
 * What this renders, back-to-front:
 *   1. Two faint structural circuit rings (static SVG)
 *   2. A counter-rotating tick ring (36 ticks, 80s linear)
 *   3. 22 orbiting glow particles at varied radii/speeds/tints/dirs
 *   4. The GAS orb image with a breathing drop-shadow halo
 *
 * Two important deviations from source — both visually neutral:
 *   - Source used framer-motion. The target build does not have
 *     framer-motion installed. All motion has been re-expressed as
 *     CSS @keyframes (linear/easeInOut, infinite). Identical look.
 *   - Source loaded the orb via `import orbImage from "@assets/..."`.
 *     This component takes a public URL prop instead, defaulting to
 *     "/gas-mark.png" — which already exists in the target's public
 *     folder, byte-identical to the source asset (MD5 verified).
 *
 * Reduced motion: every animation is wrapped in a
 * `prefers-reduced-motion: reduce` override that freezes movement
 * but preserves the static composition (rings, orb, halo at rest).
 *
 * Usage:
 *   <GasOrbHalo />
 *   <GasOrbHalo size={240} imageUrl="/gas-mark.png" />
 *
 * The component is `position: relative` and sized exactly to the orb
 * footprint (size × size). The particle ring extends 1.7× beyond
 * that via overflow-visible. Place it inside a parent that allows
 * overflow (do not stick it inside `overflow: hidden`).
 */

import { useId, useMemo } from "react";

type GasOrbHaloProps = {
  /** Public URL of the orb image. Default = "/gas-mark.png" (already in public/). */
  imageUrl?: string;
  /** Width and height of the orb in px. Default 288 (matches source). */
  size?: number;
  /**
   * Number of orbiting particles around the orb. Default 22 (matches source).
   * The ring band area scales with size², so at larger sizes the default 22
   * particles can read as sparse. Suggested values:
   *   - size 124  → 22  (default — original density)
   *   - size 186  → 27–30
   *   - size 288  → 32–40
   *   - size 340  → 40–48
   * Particle positions are deterministic (seed-based) and per-particle
   * attributes only depend on the particle's index, so increasing the count
   * adds NEW particles without disturbing the existing ones. Decreasing
   * the count removes particles from the end of the seed sequence.
   */
  particleCount?: number;
  /** Optional className applied to the outer wrapper for positioning. */
  className?: string;
};

// ============================================================
// Stable pseudo-random seed — verbatim from source line 358-360.
// Using the same seed function with the same input integers produces
// the same orbit definitions across renders and across machines.
// ============================================================
const seed = (n: number) => {
  const s = Math.sin(n * 13.13) * 43758.5453;
  return s - Math.floor(s);
};

const TINTS = ["#C084FC", "#7C5CFF", "#A855F7", "#E0AAFF"] as const;

export function GasOrbHalo({
  imageUrl = "/gas-mark.png",
  size = 288,
  particleCount = 22,
  className,
}: GasOrbHaloProps) {
  // Unique id suffix so multiple instances on one page don't clash on
  // the keyframe names. The keyframes are scoped inside this component's
  // <style> block but their NAMES live in the global keyframe registry,
  // so we suffix them per instance.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const baseR = size / 2;
  const ringBox = baseR * 3.4; // matches source: width: baseR * 3.4

  // ============================================================
  // Orbiting particles — same per-particle attributes as source
  // lines 357-374 (seed function, radii distribution, speed range,
  // colour palette). Count is configurable via the `particleCount`
  // prop (default 22 = source). Because every attribute is derived
  // from the particle's index `i`, adding particles APPENDS to the
  // sequence without disturbing existing positions.
  // ============================================================
  const orbits = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const r = baseR * (1.04 + seed(i + 1) * 0.55);
      const speed = 14 + seed(i + 100) * 26; // seconds per full revolution
      const dir = seed(i + 200) > 0.5 ? 1 : -1;
      const startAngle = seed(i + 300) * 360;
      const sz = 1.2 + seed(i + 400) * 2.2;
      const opacity = 0.5 + seed(i + 500) * 0.5;
      const tint = TINTS[Math.floor(seed(i + 600) * 4)];
      return { r, speed, dir, startAngle, size: sz, opacity, tint };
    });
  }, [baseR, particleCount]);

  return (
    <div
      className={
        "relative pointer-events-none" + (className ? " " + className : "")
      }
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* ============================================================ */}
      {/* Scoped keyframes. Names suffixed with `uid` so multiple        */}
      {/* instances on one page do not collide.                          */}
      {/* ============================================================ */}
      <style>{`
        @keyframes orb-spin-${uid} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orb-breathe-${uid} {
          0%, 100% {
            filter:
              drop-shadow(0 0 50px rgba(168,85,247,0.45))
              drop-shadow(0 0 14px rgba(124,92,255,0.55));
          }
          50% {
            filter:
              drop-shadow(0 0 80px rgba(168,85,247,0.70))
              drop-shadow(0 0 22px rgba(124,92,255,0.75));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .gas-orb-anim-${uid},
          .gas-orb-tick-${uid},
          .gas-orb-particle-${uid} {
            animation: none !important;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* Particle ring container — sized 3.4× the orb radius and       */}
      {/* centred on the orb. pointer-events: none everywhere.          */}
      {/* ============================================================ */}
      <div
        className="absolute"
        style={{
          left: baseR - ringBox / 2,
          top: baseR - ringBox / 2,
          width: ringBox,
          height: ringBox,
        }}
      >
        {/* ---- Two faint structural circuit rings (static) ---- */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${ringBox} ${ringBox}`}
          className="absolute inset-0"
        >
          <circle
            cx={ringBox / 2}
            cy={ringBox / 2}
            r={baseR * 1.15}
            fill="none"
            stroke="rgba(168,85,247,0.18)"
            strokeWidth="0.6"
            strokeDasharray="2 6"
          />
          <circle
            cx={ringBox / 2}
            cy={ringBox / 2}
            r={baseR * 1.4}
            fill="none"
            stroke="rgba(168,85,247,0.10)"
            strokeWidth="0.6"
            strokeDasharray="1 9"
          />
        </svg>

        {/* ---- Counter-rotating tick ring (36 ticks, 80s linear) ---- */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${ringBox} ${ringBox}`}
          className={`absolute inset-0 gas-orb-tick-${uid}`}
          style={{
            animation: `orb-spin-${uid} 80s linear infinite`,
            transformOrigin: "center center",
          }}
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const r1 = baseR * 1.25;
            const r2 = baseR * 1.32;
            const cx = ringBox / 2;
            const cy = ringBox / 2;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cy + Math.sin(a) * r2}
                stroke="rgba(192,132,252,0.35)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* ---- 22 orbiting glow particles ----
            Two nested wrappers:
              outer = static `rotate(startAngle)` — defines the start
                      phase via composition. Survives reduced-motion.
              inner = the `0deg → 360deg` spin animation, with
                      animation-direction handling clockwise vs
                      counter-clockwise.
            When prefers-reduced-motion: reduce kills the inner
            animation, the outer's static rotation remains, so the
            particles freeze SCATTERED at their startAngle positions
            (NOT bunched at the same angle).
        */}
        {orbits.map((o, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              width: 0,
              height: 0,
              transform: `rotate(${o.startAngle}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div
              className={`gas-orb-particle-${uid}`}
              style={{
                width: 0,
                height: 0,
                animation: `orb-spin-${uid} ${o.speed}s linear infinite`,
                animationDirection: o.dir === 1 ? "normal" : "reverse",
                transformOrigin: "center center",
                willChange: "transform",
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  left: o.r,
                  top: -o.size / 2,
                  width: o.size,
                  height: o.size,
                  background: o.tint,
                  opacity: o.opacity,
                  boxShadow: `0 0 ${o.size * 3}px ${o.tint}, 0 0 ${o.size * 6}px ${o.tint}80`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* The orb itself, sitting on top of the ring with a breathing  */}
      {/* drop-shadow halo. 5.5s easeInOut, infinite.                  */}
      {/* ============================================================ */}
      <div
        className={`absolute inset-0 gas-orb-anim-${uid}`}
        style={{
          animation: `orb-breathe-${uid} 5.5s ease-in-out infinite`,
          willChange: "filter",
        }}
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="select-none w-full h-full"
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

export default GasOrbHalo;
