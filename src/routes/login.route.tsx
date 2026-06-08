import { Hero } from "@/features/login/Hero";
import { MobileHero } from "@/features/login/MobileHero";
import { LoginCard } from "@/features/login/LoginCard";
import { GasLoginBackground } from "@/components/GasLoginBackground";

// Production /login route — now backed by the same shell developed
// and signed off in /sandbox/login. The sandbox route remains live
// as a reference (Phase 5 will decide retention vs deletion).
//
// AUTH FLOW
//   Auth wiring lives entirely inside <LoginCard>:
//     - useAuthStore.signIn  → AuthPort → adapter (mock | bff)
//     - clearSession() runs before signIn to wipe stale state
//     - navigate("/dashboard") on success
//     - rose error panel on failure
//   The AuthPort + zustand store + adapter selector
//   (CURRENT_ADAPTER) are unchanged from the previous /login.
//
// ROUTING
//   Function name LoginRoute and the route registration
//   (<Route path="/login" element={<LoginRoute />}/>) in
//   src/app/Router.tsx are unchanged. RequireAuth's bounce
//   target /login continues to land here.
//
// PREVIOUS BODY
//   The previous LoginRoute owned its own state, handleSubmit,
//   Caps Lock indicator, advisory banner, light-theme Card +
//   violet-bloom background, and Button CTA. All of that is
//   intentionally removed — its functional responsibilities
//   moved into <LoginCard> and its visual responsibilities
//   moved into <GasLoginBackground> + <Hero>.

export function LoginRoute() {
  return (
    <GasLoginBackground className="lg:h-screen">
      {/*
        Content shell — preserves the desktop vertical centring
        of the Hero/LoginCard pair (verbatim layout from the
        signed-off sandbox route).

        At lg+:
          • min-h-screen on this grid + lg:content-center places
            the 1-row track in the vertical middle of the viewport
            (the GasLoginBackground outer is locked to lg:h-screen
            via the className prop above, so the children wrapper
            and this grid both occupy 100 vh).
          • items-center centres each column inside that row track.

        At < lg the grid collapses to a single column, min-h-screen
        keeps the page at least one viewport tall, and the columns
        stack naturally. The Hero column carries `hidden lg:flex`
        so the animated pipeline does NOT render below 1024 px —
        the LoginCard takes the full grid width on phone + tablet
        portrait, removing chip-pipeline overflow + label collision.
      */}
      {/*
        Flex-based vertical centring — replaces the previous
        `min-h-screen grid + items-center + lg:content-center`
        approach. CSS Grid's align-content: center had inconsistent
        behaviour with single-row grids in this layout (asymmetric
        positioning, content drifting top/bottom). Flexbox's
        align-items: center reliably centres children regardless of
        content height vs container height. The OUTER flex handles
        vertical centring; the INNER grid still handles the 12-column
        layout for Hero and LoginCard.
      */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] px-5 md:px-10 lg:px-14 2xl:px-20 py-6 md:py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 lg:gap-12 xl:gap-14 items-center">
          {/* view-transition-name tags this column as the OLD state of the
              gas-login-morph element. On successful sign-in the browser
              morphs this panel into the Sidebar <aside> (NEW state) via
              the View Transitions API. The name must be unique on the page. */}
          <div
            className="hidden lg:flex lg:col-span-7 items-center justify-center animate-fade-in"
            style={{ viewTransitionName: 'gas-login-morph' }}
          >
            <Hero />
          </div>
          {/*
            Mobile-only header block — small orb + gradient headline.
            `lg:hidden` removes it from desktop entirely so the locked
            Hero remains the sole source of truth at lg+. On mobile
            the grid is single-column (grid-cols-1) so this stacks
            naturally above the LoginCard. animate-fade-in keeps the
            page-load feel consistent with the card below.
          */}
          <div className="lg:hidden flex items-center justify-center animate-fade-in">
            <MobileHero />
          </div>
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-start animate-slide-up">
            <LoginCard />
          </div>
        </div>
      </div>
    </GasLoginBackground>
  );
}
