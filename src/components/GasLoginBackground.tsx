/**
 * GasLoginBackground.tsx
 *
 * Layered login-screen background effect.
 *
 * The five layers (rendered back-to-front):
 *   A.1  Background image (gas-bg.png) with slow 24s drift
 *   A.2  Top black deepener (linear gradient)
 *   A.3  Lower-center purple bloom (radial gradient, mix-blend: screen)
 *   A.4  Upper-right purple bloom (radial gradient, mix-blend: screen)
 *   A.5  <canvas> with 38 drifting particles, 7 vertical filaments,
 *        and a soft pulsing radial glow at the bottom
 *
 * Reduced motion: if the user prefers reduced motion, the canvas loop
 * is skipped entirely and the keyframe drift is disabled via CSS.
 *
 * Wrap the foreground content as children. Foreground is auto-placed
 * at z-10 so the layer order cannot be broken by the consumer.
 *
 *   <GasLoginBackground>
 *     <YourLoginForm />
 *   </GasLoginBackground>
 *
 * The default bgImageUrl is "/BG.png" — that asset must exist in the
 * public/ folder at runtime.
 */

import { useEffect, useRef, type ReactNode } from "react";

type GasLoginBackgroundProps = {
  /**
   * Public URL of the background image. Must be reachable from the
   * browser at runtime. Defaults to "/BG.png" which is the asset
   * already present in this project's public/ folder.
   */
  bgImageUrl?: string;
  children?: ReactNode;
  /**
   * Optional className applied to the outermost wrapper. Use only for
   * sizing/positioning of the wrapper itself — do NOT use this to
   * change background colour, overflow, or position.
   */
  className?: string;
};

export function GasLoginBackground({
  bgImageUrl = "/BG.png",
  children,
  className,
}: GasLoginBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ============================================================
  // SECTION A.5 — Canvas loop. Verbatim from source Login.tsx
  // lines 106-221. DO NOT MODIFY constants, rgba values, particle
  // count, line count, or timing. Visual fidelity depends on these.
  // ============================================================
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Particle = { x: number; y: number; r: number; vy: number; a: number };
    type Line = {
      x: number;
      y: number;
      len: number;
      speed: number;
      width: number;
      offset: number;
    };

    let particles: Particle[] = [];
    let lines: Line[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = Array.from({ length: 38 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.3,
        vy: -(Math.random() * 0.18 + 0.05),
        a: Math.random() * 0.6 + 0.2,
      }));

      lines = Array.from({ length: 7 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: Math.random() * 180 + 80,
        speed: Math.random() * 0.25 + 0.1,
        width: Math.random() * 0.6 + 0.2,
        offset: Math.random() * 1000,
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Soft moving glow at the bottom
      const glowY = height * 0.85 + Math.sin(t) * 18;
      const glow = ctx.createRadialGradient(
        width / 2,
        glowY,
        0,
        width / 2,
        glowY,
        Math.max(width, height) * 0.55
      );
      glow.addColorStop(0, "rgba(168, 85, 247, 0.35)");
      glow.addColorStop(0.4, "rgba(124, 58, 237, 0.12)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Subtle drifting circuit lines (vertical filament feel)
      lines.forEach((l) => {
        const y = (l.y + t * l.speed * 60) % (height + l.len);
        const grad = ctx.createLinearGradient(l.x, y - l.len, l.x, y);
        grad.addColorStop(0, "rgba(196, 181, 253, 0)");
        grad.addColorStop(0.5, "rgba(196, 181, 253, 0.35)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = l.width;
        ctx.beginPath();
        ctx.moveTo(l.x, y - l.len);
        ctx.lineTo(l.x, y);
        ctx.stroke();
      });

      // Particles drifting up
      particles.forEach((p) => {
        p.y += p.vy;
        if (p.y < -5) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(216, 180, 254, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className={
        "relative min-h-screen w-full overflow-hidden bg-black text-white" +
        (className ? " " + className : "")
      }
    >
      {/* Local keyframes — scoped via <style> so the component is fully
          self-contained and does not require an index.css edit. The
          @media block disables the drift for reduced-motion users. */}
      <style>{`
        @keyframes gas-bg-shift {
          0%, 100% { transform: translate3d(0,0,0) scale(1.02); }
          50%      { transform: translate3d(-1.5%, -1%, 0) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gas-bg-anim { animation: none !important; transform: none !important; }
        }
      `}</style>

      {/* ============================================================ */}
      {/* A.1 — Background image, slow drift                           */}
      {/* ============================================================ */}
      <div
        aria-hidden
        className="gas-bg-anim absolute inset-0 will-change-transform"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "gas-bg-shift 24s ease-in-out infinite",
        }}
      />

      {/* ============================================================ */}
      {/* A.2 — Top black deepener                                     */}
      {/* ============================================================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 28%, rgba(0,0,0,0) 55%)",
        }}
      />

      {/* ============================================================ */}
      {/* A.3 — Lower-center purple bloom (additive, screen blend)     */}
      {/* ============================================================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 38% 78%, rgba(168,85,247,0.38) 0%, rgba(124,58,237,0.16) 38%, rgba(0,0,0,0) 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* ============================================================ */}
      {/* A.4 — Upper-right secondary bloom (additive, screen blend)   */}
      {/* ============================================================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 82% 35%, rgba(139,92,246,0.18) 0%, rgba(0,0,0,0) 65%)",
          mixBlendMode: "screen",
        }}
      />

      {/* ============================================================ */}
      {/* A.5 — Animated canvas (particles + filaments + bottom glow)  */}
      {/* ============================================================ */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* ============================================================ */}
      {/* Foreground — auto-elevated above all background layers       */}
      {/* ============================================================ */}
      <div className="relative z-10 min-h-screen w-full">{children}</div>
    </div>
  );
}

export default GasLoginBackground;
