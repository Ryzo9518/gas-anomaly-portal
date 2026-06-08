import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";
import { CommandBar } from "./CommandBar";
import { PageTransition } from "./PageTransition";
import { SplashScreen } from "./SplashScreen";
import { RouteProgressBar } from "./RouteProgressBar";

// Surgical clean (2026-06-05): CommercialOverlayDrawer + ProspectReviewDialog
// + ScenarioSwitcher imports removed along with the deal-stage features they
// wrapped. drawerOpen UI state is no longer consumed at this layer.

export function AppLayout() {

  // Scroll-to-top on every route change.
  // The scrollable container is <main> (overflow-y-auto), NOT window —
  // window.scrollTo has no effect here. We use a ref so the effect
  // targets the exact element, and `behavior: 'instant'` snaps before
  // PageTransition fades the new content in (no visible upward drift).
  const mainRef = React.useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    // `isolate` (CSS isolation: isolate) creates a fresh stacking
    // context for the entire app shell so the fixed background layer
    // (bp-aurora or gas-base-lava) stays z-confined to the AppLayout
    // subtree and can't escape to compete with elements outside it.
    // No visual impact, no layout impact — purely a stacking-context guard.
    // `relative` is required so z-index values on child divs (z-10 right
    // column) are resolved within this context rather than the document root.
    <div className="relative h-screen flex bg-slate-50 text-slate-900 overflow-hidden isolate">
      {/* BACKGROUND LAYER — toggle between aurora and lava:
          • Aurora active:  keep the bp-aurora div, leave gas-base-lava commented.
          • Revert to lava: uncomment gas-base-lava, remove the bp-aurora div.
          Both CSS classes stay in index.css permanently — only the JSX changes. */}

      {/* Login aurora — vertical-mirror background.
          Three blurred radial blobs anchored at the bottom corners drift
          on 22 / 28 / 32s independent loops. position:fixed inset:0
          z-index:0 pointer-events:none — viewport-wide, intercepts nothing.
          Blobs are clipped to viewport bounds by .bp-aurora's overflow:hidden. */}
      <div aria-hidden="true" className="bp-aurora"><span /></div>

      {/* Original lava layer — uncomment to revert instantly:
      <div aria-hidden="true" className="gas-base-lava" />
      */}

      {/* Global route + react-query progress indicator. Floats above
          everything else (z-60), reads as a system-wide signal that
          the workspace is doing work. */}
      <RouteProgressBar />
      <Sidebar />
      {/* Right column gets `relative z-10` so it forms its own
          stacking context above the z-0 aurora layer — without this,
          the column's static descendants would paint underneath the
          background. The class adds zero geometry: no offsets, no width,
          no height change. */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <TopBar />
        {/* Top padding removed.  With pt-6, <main>'s scrollport had
            a 24px padding-top above content, and PageStickyHeader
            (sticky top-0) only reached its pin target once the user
            had scrolled 24px.  In that window, the padding-top was
            visible as a slate-50 seam between TopBar and the band
            and content scrolled through it.  pb-6 is kept for
            end-of-scroll breathing room; px-6 preserves the gutter
            that PageStickyHeader's `-mx-6 px-6` breakout negates.

            Aurora pass-through — main has no background so the fixed
            bp-aurora blobs (violet/indigo, bottom corners, no dark base)
            show through on top of the outer div's bg-slate-50 white base.
            Identical to the client portal gas-aurora approach (mirrored).
            To revert: restore the inline style:
              style={{ background: "linear-gradient(155deg, #f9f8ff 0%, #f4f6fc 52%, #ebe6ff 100%)" }} */}
        <main
          ref={mainRef}
          className="flex-1 min-w-0 overflow-y-auto px-6 pb-6"
        >
          {/* PageTransition fades + slides each route mount so navigations
              feel orchestrated rather than abrupt. */}
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <CommandBar />
      {/* Mobile nav drawer — invisible on lg+, slides in from the left
          when the TopBar hamburger is tapped on mobile/tablet. Lives at
          the AppLayout root so the Sheet portal mounts above all app
          chrome but below dialogs that need to stack on top of it. */}
      <MobileNav />
      {/* First-load only — gradient G splash. Skipped under reduced motion. */}
      <SplashScreen />
    </div>
  );
}
