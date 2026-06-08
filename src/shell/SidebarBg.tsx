import { useEffect, useRef } from "react";

/**
 * SidebarBg — the full GAS login-screen background ported into the sidebar column.
 *
 * Five layers (back to front), verbatim from GasLoginBackground:
 *   A.1  /BG.png — slow 24s drift animation
 *   A.2  Top black deepener
 *   A.3  Lower-centre purple bloom  (mix-blend: screen)
 *   A.4  Upper-right purple bloom   (mix-blend: screen)
 *   A.5  Canvas — 38 drifting particles + 7 vertical filaments + pulsing glow
 *
 * Sidebar-specific adaptations vs GasLoginBackground:
 *   • absolute inset-0 wrapper only — no min-h-screen, no children slot
 *   • Canvas uses ResizeObserver so it tracks the 248px ↔ 88px morph without
 *     a window resize event being required
 *   • Particle reset is SEPARATED from canvas resize — the 320ms collapse
 *     transition fires dozens of ResizeObserver callbacks; only canvas.width/
 *     height are updated on each, so particles never jump position mid-morph
 *   • Keyframes named "sidebar-bg-drift" — avoids collision with
 *     GasLoginBackground's "gas-bg-shift" if both are briefly in the DOM
 */
export function SidebarBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    type Line = { x: number; y: number; len: number; speed: number; width: number; offset: number };

    let particles: Particle[] = [];
    let lines: Line[] = [];

    // ── Canvas resize ─────────────────────────────────────────────────────────
    // Updates canvas dimensions only — does NOT reset particle positions.
    // Called by ResizeObserver on every frame of the sidebar width morph so
    // the clip region stays accurate without destroying ongoing animation.
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width  = rect.width;
      height = rect.height;
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ── Particle / line init ──────────────────────────────────────────────────
    // Positions particles relative to current width × height.
    // Only called on mount and on true window resize (orientation change etc.).
    // Deliberately NOT called by ResizeObserver — see note above.
    const initParticles = () => {
      particles = Array.from({ length: 38 }, () => ({
        x:  Math.random() * width,
        y:  Math.random() * height,
        r:  Math.random() * 1.4 + 0.3,
        vy: -(Math.random() * 0.18 + 0.05),
        a:  Math.random() * 0.6 + 0.2,
      }));

      lines = Array.from({ length: 7 }, () => ({
        x:      Math.random() * width,
        y:      Math.random() * height,
        len:    Math.random() * 180 + 80,
        speed:  Math.random() * 0.25 + 0.1,
        width:  Math.random() * 0.6 + 0.2,
        offset: Math.random() * 1000,
      }));
    };

    // Initial setup
    resizeCanvas();
    initParticles();

    // True window resize (orientation change, desktop window drag) — full reinit
    const onWindowResize = () => { resizeCanvas(); initParticles(); };
    window.addEventListener("resize", onWindowResize);

    // ResizeObserver — tracks the sidebar width morph without resetting particles
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    // ── Draw loop ─────────────────────────────────────────────────────────────
    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Soft pulsing glow anchored near the bottom (matches login screen A.5)
      const glowY = height * 0.85 + Math.sin(t) * 18;
      const glow  = ctx.createRadialGradient(
        width / 2, glowY, 0,
        width / 2, glowY, Math.max(width, height) * 0.55,
      );
      glow.addColorStop(0,   "rgba(168, 85, 247, 0.35)");
      glow.addColorStop(0.4, "rgba(124, 58, 237, 0.12)");
      glow.addColorStop(1,   "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Vertical circuit filaments
      lines.forEach((l) => {
        const y    = (l.y + t * l.speed * 60) % (height + l.len);
        const grad = ctx.createLinearGradient(l.x, y - l.len, l.x, y);
        grad.addColorStop(0,   "rgba(196, 181, 253, 0)");
        grad.addColorStop(0.5, "rgba(196, 181, 253, 0.35)");
        grad.addColorStop(1,   "rgba(255, 255, 255, 0.0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth   = l.width;
        ctx.beginPath();
        ctx.moveTo(l.x, y - l.len);
        ctx.lineTo(l.x, y);
        ctx.stroke();
      });

      // Drifting particles
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
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Keyframes scoped here — renamed to avoid collision with
          GasLoginBackground's gas-bg-shift during route transitions */}
      <style>{`
        @keyframes sidebar-bg-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.02); }
          50%       { transform: translate3d(-1.5%, -1%, 0) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-bg-anim { animation: none !important; transform: none !important; }
        }
      `}</style>

      {/* A.1 — BG.png, slow 24s drift (same asset as login screen) */}
      <div
        className="sidebar-bg-anim absolute inset-0 will-change-transform"
        style={{
          backgroundImage:    "url(/BG.png)",
          backgroundSize:     "cover",
          backgroundPosition: "center",
          animation:          "sidebar-bg-drift 24s ease-in-out infinite",
        }}
      />

      {/* A.2 — Top black deepener — fades BG.png toward black at the top
          so the logo area reads as dark and grounded */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 28%, rgba(0,0,0,0) 55%)",
        }}
      />

      {/* A.3 — Lower-centre purple bloom (additive screen blend) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 38% 78%, rgba(168,85,247,0.38) 0%, rgba(124,58,237,0.16) 38%, rgba(0,0,0,0) 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* A.4 — Upper-right bloom (additive screen blend) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 82% 35%, rgba(139,92,246,0.18) 0%, rgba(0,0,0,0) 65%)",
          mixBlendMode: "screen",
        }}
      />

      {/* A.5 — Animated canvas: particles + filaments + bottom glow */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
