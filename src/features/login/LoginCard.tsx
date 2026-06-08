import * as React from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";
import { auth, CURRENT_ADAPTER } from "@/adapters";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// Sandbox login card. CTA is a no-op; the real auth path is unaffected.
// Uses the project's lucide-react icon set, project Tailwind tokens,
// and self-contained styles only. No global CSS edits, no new deps.

export function LoginCard() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Email normalisation + validation. Mirrors production /login
    // (src/routes/login.route.tsx) byte-for-byte so mock and BFF
    // adapters behave identically here.
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      // Wipe any stale session before re-authenticating so a failed
      // signIn cannot leave a half-populated store behind. Same
      // pattern as production /login.
      clearSession();
      await signIn({ email: trimmedEmail, password });
      // View Transitions API: morph the login hero panel into the sidebar.
      // flushSync forces React to render the new route synchronously inside
      // the startViewTransition callback so the browser captures a valid
      // NEW-state snapshot before animating.
      // Graceful fallback: Firefox (no startViewTransition) navigates instantly.
      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(() => {
          flushSync(() => { navigate("/dashboard"); });
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasError = Boolean(error);

  const fieldShell =
    "w-full h-11 2xl:h-12 pl-10 pr-3 rounded-lg text-white text-[14px] " +
    "placeholder:text-slate-600 " +
    // Base surface — slate panel + hairline ring.
    "bg-slate-950/55 ring-1 ring-slate-700/70 " +
    // Production-grade surface depth — a top specular
    // highlight + bottom subtle darken give the input a
    // genuine "sunken into the panel" read rather than a
    // flat colour slot.
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.32)] " +
    "transition-all duration-220 ease-out-expo " +
    // Hover (pointer only) — subtle ring brightening +
    // background lift. No layout change, no glow.
    "hover:ring-slate-600/85 hover:bg-slate-950/65 " +
    // Focus — sharper indigo ring, brighter bg, and a
    // soft outer halo. Inset depth is replayed inside
    // the focus shadow stack because focus:shadow
    // replaces the entire box-shadow.
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:bg-slate-950/75 " +
    "focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.32)," +
                  "0_0_0_4px_rgba(99,102,241,0.10)," +
                  "0_8px_24px_-12px_rgba(99,102,241,0.40)] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Sign in to GAS Anomaly"
      // Keyframes scoped at form-level via inline <style> below.
      // `button-shine-flow` drives the persistent left-to-right
      // shine on the Sign In button. ease-in-out + 5.5s matches the
      // orb's breathing rhythm so the button visibly shares the
      // page's heartbeat. The shine band itself is mostly transparent
      // outside its bright centre, so the reset between cycles is
      // invisible — the user sees a soft pulse of light passing
      // across the button toward the arrow on every cycle.
      // Premium-depth shadow stack moved to Tailwind classes
      // (byte-identical values to the previous inline style)
      // so `focus-within:` variants can layer additional
      // shadow on top — inline boxShadow would have masked
      // them. Form-focus-lift behaviour:
      //   • focus-within:ring-slate-700/85 — slightly
      //     brighter hairline ring while ANY descendant
      //     (input, toggle, submit) has focus.
      //   • focus-within:shadow-[…] — same 5-layer stack
      //     with a slightly bigger ambient violet halo and
      //     a touch more mid-distance lift. Subtle, no
      //     scale, no jump. transition-shadow + ease-out-expo
      //     drives the cross-fade.
      className={
        // Violet glass body — restored from the first overhaul. Three
        // changes ONLY, all to the card body itself; inputs, button,
        // eyebrow, labels, footer are unchanged.
        //   1. bg-slate-900/55 → 3-stop violet gradient
        //      (warm violet 34,22,68 → mid 20,12,46 → near-black 10,6,28)
        //   2. ring-slate-700/60 → ring-violet-700/35
        //   3. focus-within ring + halo shifted to orb-violet
        //      (rgba 168,85,247) instead of slate/violet-700.
        // overflow-hidden previously added for internal blooms — blooms
        // were scrapped, overflow-hidden no longer needed.
        // Responsive sizing — universal compact card with 2xl bump.
        // Card stays compact at lg/xl so it fits cleanly on standard
        // laptops. At 2xl (large desktops, ≥1536px), the card grows
        // slightly so it doesn't feel cramped on 1920px+ monitors.
        // Internal spacing (mt-5 / mt-4 / mt-3) stays consistent
        // across breakpoints — only the card's WIDTH and PADDING grow.
        //   default / lg : max-w-[400px], p-6 (24 px padding)
        //   xl  (1280+)  : max-w-[420px], p-7 (28 px padding)
        //   2xl (1536+)  : max-w-[460px], p-10 (40 px padding) — bigger
        //                  presence on large monitors without going huge.
        "relative w-full max-w-[400px] xl:max-w-[420px] 2xl:max-w-[460px] rounded-2xl p-6 xl:p-7 2xl:p-10 " +
        "bg-gradient-to-br from-[rgba(34,22,68,0.80)] via-[rgba(20,12,46,0.85)] to-[rgba(10,6,28,0.90)] " +
        // Card outer ring — extremely subtle hairline as a baseline
        // fallback. The visible "edge treatment" of the card now comes
        // from the gradient hairline + top specular highlight divs
        // inserted as the first children below (premium dark-UI
        // pattern: vertical gradient border + top inset glass
        // highlight, not a solid uniform outline).
        "ring-1 ring-violet-700/20 " +
        "backdrop-blur-2xl backdrop-saturate-150 " +
        "transition-shadow duration-300 ease-out-expo " +
        "shadow-[0_32px_96px_-32px_rgba(124,58,237,0.55)," +
                "0_8px_24px_-8px_rgba(0,0,0,0.40)," +
                "0_2px_8px_rgba(0,0,0,0.45)," +
                "inset_0_1px_0_rgba(255,255,255,0.12)," +
                "inset_0_-1px_0_rgba(0,0,0,0.25)] " +
        "focus-within:ring-violet-500/35 " +
        "focus-within:shadow-[0_40px_110px_-28px_rgba(168,85,247,0.55)," +
                            "0_12px_28px_-8px_rgba(0,0,0,0.45)," +
                            "0_2px_8px_rgba(0,0,0,0.45)," +
                            "inset_0_1px_0_rgba(255,255,255,0.14)," +
                            "inset_0_-1px_0_rgba(0,0,0,0.25)]"
      }
    >
      <style>{`
        @keyframes button-shine-flow {
          0%   { background-position: -180% 50%; }
          100% { background-position: 280% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .button-shine-flow { animation: none !important; opacity: 0 !important; }
        }
      `}</style>

      {/* ─── Premium glass edge treatment ───
          Replaces the previous solid uniform ring (which read as a
          generic flat outline) with the standard award-winning dark-UI
          card edge: a gradient hairline that's brighter at the top and
          fades through violet to near-transparent at the bottom (gives
          the card a "lit from above" directional edge), PLUS a thin
          horizontal specular highlight band at the very top edge
          (gives the card the polished glass-catching-light feel).
          Both decorations sit BEHIND the form's static content via
          negative z-index and ABOVE the form's bg gradient — exactly
          where premium glass card borders live in the painting order.
          aria-hidden + pointer-events-none so they're invisible to
          screen readers and don't interfere with the form. */}

      {/* Gradient hairline border — vertical "lit from above" gradient */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          zIndex: -1,
          padding: 1,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(167,139,250,0.10) 30%, rgba(255,255,255,0.02) 100%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
        }}
      />

      {/* Top inset specular highlight — thin horizontal gradient strip */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 rounded-t-2xl pointer-events-none"
        style={{
          zIndex: -1,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.22) 50%, transparent 90%)",
        }}
      />
      {/* Brand line — subtle gradient pill + lift shadow +
          inner hairline highlight. Status dot carries a tiny
          static glow halo so the brand mark reads as a
          real lit indicator rather than a flat dot. */}
      {/* Workspace identifier pill — integrated, flat, in-the-card.
          All elevation cues removed (no drop shadow, no inset top
          highlight, no animations). Colour palette pulled from the
          shield badge in the footer (text-indigo-400, #818CF8) so
          the pill matches the same blue-indigo family as the
          "Secure access" indicator. The pill and the shield now
          read as the same visual element family — both blue-indigo
          accents on the violet card surface.
            • Ring: ring-indigo-400/45 (thin, distinct, blue-indigo)
            • Background: rgba(129, 140, 248, 0.06) (very subtle
              indigo tint — reads as a tinted region of the card
              surface, not an elevated object on top)
            • Dot: #818CF8 (indigo-400, matches the shield exactly)
            • Text: text-indigo-300/85 (bright enough for legibility,
              slightly muted for in-card integration) */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 ring-1 ring-indigo-400/45"
        style={{
          background: "rgba(129,140,248,0.06)",
        }}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#818CF8" }}
        />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-indigo-300/85">
          Client Workspace
        </span>
      </div>

      <h2 className="mt-4 font-display text-xl md:text-[26px] xl:text-[28px] 2xl:text-[32px] font-semibold tracking-tighter text-white leading-tight whitespace-nowrap">
        Welcome to GAS Anomaly
      </h2>
      <p className="mt-2 text-body xl:text-[15px] 2xl:text-[16px] text-slate-400">
        Sign in with your work account to continue.
      </p>

      {/* Staff door — Microsoft 365 SSO. The primary (and, in the live bff
          build, only) sign-in path for Jera staff. */}
      <button
        type="button"
        onClick={() => auth.startMicrosoftLogin()}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/95 px-4 py-3 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <span aria-hidden className="grid h-4 w-4 grid-cols-2 gap-px">
          <span style={{ background: "#f25022" }} />
          <span style={{ background: "#7fba00" }} />
          <span style={{ background: "#00a4ef" }} />
          <span style={{ background: "#ffb900" }} />
        </span>
        Sign in with Microsoft
      </button>

      {/* Email/password door — local mock/dev only. Hidden in the live bff
          build, where staff authenticate via Microsoft above. */}
      {CURRENT_ADAPTER !== "bff" && (
        <>
      <div className="mt-5 space-y-3">
        {/* Email */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-email"
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Email
            </label>
          </div>
          <div className="mt-1.5 relative group">
            <Mail
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-indigo-400"
            />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@bp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={fieldShell}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? "login-error" : undefined}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Password
            </label>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              // Animated underline reveal — Tailwind `after:`
              // pseudo, scaled from origin-left on hover. No
              // new DOM element, no layout shift.
              className={
                "relative text-[11px] font-medium text-indigo-300/80 " +
                "hover:text-indigo-200 transition-colors duration-220 " +
                "after:pointer-events-none after:absolute after:left-0 " +
                "after:bottom-[-2px] after:h-px after:w-full " +
                "after:origin-left after:scale-x-0 after:bg-current " +
                "after:opacity-60 after:transition-transform " +
                "after:duration-300 after:ease-out-expo " +
                "hover:after:scale-x-100 " +
                "focus-visible:outline-none focus-visible:after:scale-x-100 " +
                "focus-visible:rounded-sm focus-visible:ring-2 " +
                "focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 " +
                "focus-visible:ring-offset-slate-900"
              }
            >
              Forgot password?
            </a>
          </div>
          <div className="mt-1.5 relative group">
            <Lock
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-indigo-400"
            />
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={fieldShell + " pr-10"}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? "login-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {hasError && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 rounded-lg p-3 bg-rose-500/10 ring-1 ring-rose-500/30"
          >
            <AlertTriangle
              aria-hidden
              className="h-4 w-4 text-rose-400 shrink-0 mt-0.5"
            />
            <p className="text-[13px] text-rose-100">{error}</p>
          </div>
        )}
      </div>

      {/* CTA — execution button. Deeper base gradient, controlled inner
          highlight, hover-only glow + lift. No constant heavy halo. */}
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        // Base button shadow moved to Tailwind class
        // (byte-identical values to the previous inline
        // style) so `focus-visible:` shadow variants can
        // layer additional halos on top — inline boxShadow
        // would have masked them.
        // Focus-visible amplification (keyboard focus only):
        //   • Existing sharp ring (ring-2 ring-indigo-300/70
        //     + ring-offset-2 ring-offset-slate-900) is the
        //     PRIMARY focus indicator — kept verbatim.
        //   • SECONDARY soft halo (NEW): a wide diffused
        //     indigo outer cast (24 px blur, -8 spread,
        //     0.55 alpha) plus a soft 6 px indigo ring at
        //     0.12 alpha. Both purely cosmetic — they do
        //     not affect hover, active, or idle states.
        // Direction B — Lit Object.
        // Shadow + highlight stack reinforced for genuine "thickness":
        //   • Outer drop shadow: deeper violet halo (rgba 91,33,182 / 0.70)
        //     so the button casts a clear violet shadow on the card surface
        //   • Outer dark cast: stronger (0.40) for grounding
        //   • Inner top highlight: bumped 0.22 → 0.30 for a clearer specular
        //     edge where light catches the top
        //   • Inner bottom shadow: deepened from -1px/0.34 to -2px/0.45,
        //     giving the button a real "depth" at the bottom edge
        // Focus halos converted from indigo to violet (rgba 168,85,247)
        // so the keyboard-focus state stays in the orb's body family.
        className={
          "group relative mt-5 w-full h-12 rounded-xl text-white " +
          "font-semibold text-[14px] tracking-tight overflow-hidden " +
          "transition-all duration-220 ease-out-expo " +
          "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] " +
          "disabled:opacity-70 disabled:cursor-not-allowed " +
          "focus-visible:outline-none " +
          "focus-visible:ring-2 focus-visible:ring-violet-300/70 " +
          "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 " +
          "shadow-[0_12px_28px_-8px_rgba(91,33,182,0.70)," +
                  "0_1px_2px_rgba(0,0,0,0.40)," +
                  "inset_0_1px_0_rgba(255,255,255,0.30)," +
                  "inset_0_-2px_0_rgba(0,0,0,0.45)] " +
          "focus-visible:shadow-[0_24px_56px_-8px_rgba(168,85,247,0.55)," +
                                "0_0_0_6px_rgba(168,85,247,0.14)," +
                                "0_12px_28px_-8px_rgba(91,33,182,0.70)," +
                                "0_1px_2px_rgba(0,0,0,0.40)," +
                                "inset_0_1px_0_rgba(255,255,255,0.30)," +
                                "inset_0_-2px_0_rgba(0,0,0,0.45)]"
        }
        style={{
          // Direction now 90deg (left → right) — gradient flows toward
          // the "Sign in →" arrow, creating directional momentum.
          // Same 4-stop violet → focus-indigo palette as before:
          //   0%   #6D28D9  violet-700      deep left edge
          //   30%  #6837DC  custom blend
          //   65%  #4F46E5  indigo-600      saturated mid
          //  100%  #6366F1  indigo-500      matches input focus border
          background:
            "linear-gradient(90deg, #6D28D9 0%, #6837DC 30%, #4F46E5 65%, #6366F1 100%)",
        }}
      >
        {/* Persistent shine — a soft bright band that travels left-to-
            right across the button on a 5.5s ease-in-out cycle, in
            sync with the orb's breathing. Outside its bright centre
            the band is fully transparent, so the reset between cycles
            is invisible — the user sees a soft pulse of light passing
            across the button toward the "Sign in →" arrow. The
            background-size 250% gives the shine room to enter and
            exit fully off-screen. */}
        <span
          aria-hidden
          className="button-shine-flow absolute inset-0 pointer-events-none rounded-xl"
          style={{
            backgroundImage:
              "linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.22) 50%, transparent 62%)",
            backgroundSize: "250% 100%",
            backgroundPosition: "-180% 50%",
            animation: "button-shine-flow 5.5s ease-in-out infinite",
            mixBlendMode: "overlay",
          }}
        />
        {/* Hover-only glow layer — Direction B. Inner violet hairline
            + a deeper external orb-violet halo. Both updated from the
            previous indigo/lavender (rgba 99,102,241 / 165,180,252) to
            the orb body family (rgba 168,85,247 / 196,181,253) so the
            button's interactive states stay inside the violet identity. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-220 ease-out-expo"
          style={{
            boxShadow:
              "0 18px 44px -12px rgba(168,85,247,0.75)," +
              " 0 0 0 1px rgba(196,181,253,0.25) inset",
          }}
        />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {submitting ? "Signing in…" : "Sign in"}
          <ArrowRight className="h-4 w-4 transition-transform duration-220 ease-out-expo group-hover:translate-x-0.5" />
        </span>
      </button>
        </>
      )}

      {/* Footer — preceded by a delicate tapered hairline so
          the "secure access" + copyright lines feel like a
          dedicated meta block rather than free-floating text.
          Pure decoration; no layout shift to the form fields
          above. */}
      <div
        aria-hidden
        className="mt-4 h-px w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.20) 50%, transparent 100%)",
        }}
      />
      <div className="mt-3 flex items-center gap-2 text-[11px] text-violet-300/45">
        <ShieldCheck
          aria-hidden
          className="h-3.5 w-3.5 text-indigo-400/80"
        />
        <span>Secure access · Encrypted in transit</span>
      </div>

      <div className="mt-1 text-[11px] text-violet-300/30">
        © 2026 GAS · Client Internal Anomaly
      </div>
    </form>
  );
}
