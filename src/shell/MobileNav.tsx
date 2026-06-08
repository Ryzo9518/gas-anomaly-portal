import * as React from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useUIStore } from "@/state/uiStore";
import { useAuthStore } from "@/state/authStore";
import { primary, locked, NavBtn } from "./Sidebar";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/brand/logo.png";
import sidebarBgUrl from "@/assets/brand/sidebar-bg.png";

/**
 * MobileNav — slide-in drawer that replaces the desktop sidebar on
 * viewports below the `lg` breakpoint (where <Sidebar /> is hidden via
 * `hidden lg:flex`). Reuses the canonical `primary` / `locked` nav arrays
 * and the same `NavBtn` component the desktop rail uses, so the mobile
 * surface stays in lockstep with the desktop one — adding a nav item or
 * changing its label/icon in Sidebar.tsx automatically flows through
 * here with zero duplication.
 *
 * Industry-standard mobile-nav behaviors implemented:
 *   • Trigger lives in the TopBar as a hamburger button (lg:hidden).
 *   • Drawer slides from the LEFT (matches the position the desktop
 *     sidebar lives in, so the user's spatial model stays intact).
 *   • Tap-outside-to-dismiss + escape-to-dismiss come free from the
 *     Radix Dialog primitive.
 *   • Auto-closes on route change (the useEffect below) so tapping a
 *     nav item navigates AND dismisses the drawer in one gesture —
 *     exactly the behavior users expect from Linear / Vercel / GitHub.
 *   • Forced expanded mode (collapsed=false) — there is no "collapse
 *     to icons" affordance on mobile; full labels are always shown.
 *   • Brand chrome (logo + wordmark + violet bg image + slate-950 fade)
 *     is mirrored from the desktop sidebar so the two surfaces feel
 *     like one design language, not two divergent products.
 *
 * Why we use the Radix Dialog primitive directly instead of the shadcn
 * Sheet wrapper: Sheet's animation classes come from `tailwindcss-
 * animate` (`data-[state=open]:slide-in-from-left`) and were silently
 * producing no visible motion in this app's setup — the drawer mounted
 * with `transform: none` and either rendered off-screen or invisible
 * over a near-white blurred page. Going direct against Radix lets us
 * apply our own named keyframes (`animate-drawer-in`, `animate-overlay-
 * in`) defined in tailwind.config.ts, which we control end-to-end and
 * can verify by class name in the DOM.
 */
export function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);
  const { pathname } = useLocation();
  const userName = useAuthStore((s) => s.actor?.userName ?? "—");
  const userInitials = userName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "··";

  // Auto-dismiss when the user navigates. Gated on `open` being true so
  // we don't try to close an already-closed drawer on every route change
  // (and so the lastPath ref tracks correctly).
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (open && pathname !== lastPath.current) {
      setOpen(false);
    }
    lastPath.current = pathname;
  }, [pathname, open, setOpen]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        {/* Overlay — slate-950/60 (not bg-background/80 which resolves
            to a near-white wash that makes the dim invisible against
            the light dashboard). Backdrop-blur softens the page behind
            the drawer to anchor focus. */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm",
            "data-[state=open]:animate-overlay-in",
            "data-[state=closed]:animate-overlay-out",
          )}
        />
        {/* Drawer panel — fixed left, full height, 280px wide. Explicit
            bg-slate-950 (not bg-card / bg-background tokens) so we are
            not at the mercy of theme variable resolution at runtime.
            Uses our own `drawer-in` / `drawer-out` keyframes defined in
            tailwind.config.ts which translate from -100% to 0 and back. */}
        <DialogPrimitive.Content
          aria-describedby="mobile-nav-description"
          className={cn(
            // CRITICAL: do NOT add `relative` to this className. We
            // already use `fixed` for viewport-anchored positioning
            // (inset-y-0 + left-0) and `fixed` itself is a positioning
            // context for the absolutely-positioned brand background
            // children below. twMerge will resolve `relative` AFTER
            // `fixed` if both appear, leaving the drawer at
            // `position: relative` and shoving it below the viewport
            // (it appeared at y=874 with the dashboard above it,
            // making it visually invisible). This bug is exactly what
            // produced the "blurred dashboard with no drawer panel"
            // screenshots the user reported.
            "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw]",
            "bg-slate-950 text-slate-200 border-r border-slate-900",
            "shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)]",
            "overflow-hidden flex flex-col",
            "focus:outline-none",
            "data-[state=open]:animate-drawer-in",
            "data-[state=closed]:animate-drawer-out",
          )}
        >
          {/* Brand background image — mirrors the desktop rail's purple
              gradient so the two nav surfaces feel like the same artifact
              rendered at different sizes. Same opacity (0.85) as desktop. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${sidebarBgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center bottom",
              backgroundRepeat: "no-repeat",
              opacity: 0.85,
            }}
          />
          {/* Top fade so the drawer's brand bay lands on the same dark
              slate-950/85 wash as the TopBar — the L-shape join visible
              on desktop is preserved here even though the chrome geometry
              is different (drawer instead of always-present rail). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-36"
            style={{
              background:
                "linear-gradient(180deg," +
                " rgba(2, 6, 23, 0.85) 0%," +
                " rgba(2, 6, 23, 0.65) 55%," +
                " rgba(2, 6, 23, 0) 100%)",
            }}
          />
          {/* Subtle hairline of light along the right edge — same idiom
              the desktop rail uses to feel premium-built rather than flat. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"
          />
          {/* Accessible title + description — visually hidden but consumed
              by Radix Dialog's aria-labelledby/aria-describedby wiring so
              screen readers announce the drawer's purpose on open. */}
          <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
          <DialogPrimitive.Description id="mobile-nav-description" className="sr-only">
            Browse GAS Anomaly sections — Dashboard, Upload, Report, Findings, and account.
          </DialogPrimitive.Description>

          <div className="relative flex flex-col h-full">
            {/* Brand bay — 72px to match the TopBar / desktop rail's brand
                bay, so the chrome rhythm stays consistent. Holds logo +
                wordmark on the left; the close X sits absolute top-right. */}
            <div className="h-[72px] flex items-center gap-3 px-5 border-b border-white/5 shrink-0 pr-12">
              <img
                src={logoUrl}
                alt=""
                className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(124,58,237,0.55)]"
              />
              <div className="leading-tight min-w-0">
                <div className="text-[15px] font-semibold text-white tracking-tight truncate">GAS Anomaly</div>
                <div className="text-[11px] text-slate-400 font-medium truncate">Client Workspace</div>
              </div>
            </div>

            {/* Close button — top-right, matches the inline-icon density
                of the TopBar's hamburger so the open/close pair feels
                symmetric. We render our own (instead of relying on the
                Sheet primitive's built-in close) because we're using
                Radix Dialog directly. */}
            <DialogPrimitive.Close
              aria-label="Close navigation menu"
              className={cn(
                "absolute top-4 right-4 z-10",
                "h-8 w-8 inline-flex items-center justify-center rounded-md",
                "text-slate-400 hover:text-white hover:bg-white/5",
                "transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>

            {/* Nav body — same structure as desktop expanded mode. */}
            <nav className="relative flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
              <div className="px-2 pb-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
                Workspace
              </div>
              {primary.map((i) => <NavBtn key={i.to} item={i} collapsed={false} />)}

              {locked.length > 0 && (
                <>
                  <div className="px-2 pt-5 pb-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
                    Phase 2 · Locked
                  </div>
                  {locked.map((i) => <NavBtn key={i.to} item={i} collapsed={false} />)}
                </>
              )}
            </nav>

            {/* Footer — session indicator, mirrored from the
                desktop rail's footer so the user's session context is
                never out of sight. */}
            <div className="relative py-3 px-3 border-t border-white/5 shrink-0">
              <div className="w-full flex items-center rounded-lg gap-2.5 px-2 py-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-white flex items-center justify-center text-[12px] font-semibold ring-1 ring-violet-300/30 shadow-[0_2px_8px_rgba(124,58,237,0.35)] shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 text-left min-w-0 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-semibold text-white truncate">{userName}</div>
                    <div className="text-caption text-slate-400 truncate">Open session · Phase 1</div>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
