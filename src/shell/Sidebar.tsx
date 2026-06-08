import * as React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Upload, FileText, AlertTriangle, Lock,
  PanelLeftClose, PanelLeftOpen, Handshake,
} from "lucide-react";
import { flags, isActive, isLocked, isStub } from "@/flags/flags";
import logoUrl from "@/assets/brand/logo.png";
import { SidebarBg } from "./SidebarBg";
import { useReport } from "@/features/audit/ReportContext";
import { useUIStore } from "@/state/uiStore";
import { useAuthStore } from "@/state/authStore";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/ui/shadcn/tooltip";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey: keyof typeof flags;
  badge?: string;
}

// V1 audit portal nav. Upload added P0; Report + Findings land in the
// next turn — featureKey "stub" until their routes ship so the icons
// render greyed-out instead of broken.
export const primary: NavItem[] = [
  { to: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard, featureKey: "dashboard"  },
  { to: "/upload",     label: "Upload",     icon: Upload,           featureKey: "upload"     },
  { to: "/report",     label: "Report",     icon: FileText,         featureKey: "report"     },
  { to: "/findings",   label: "Findings",   icon: AlertTriangle,    featureKey: "findings"   },
  { to: "/engagement", label: "Engagement", icon: Handshake,        featureKey: "engagement" },
];

// Locked placeholder entries (Rebate / SLA / Vouchers / Client View / Analytics)
// were removed per extract owner's request. The `locked` array remains exported
// as an empty array so any external consumer that imports it still type-checks.
export const locked: NavItem[] = [];

export function NavBtn({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const active = isActive(item.featureKey);
  const stub = isStub(item.featureKey);
  const lock = isLocked(item.featureKey);
  // Carry the selected report on every nav link so moving between pages keeps
  // the whole app on ONE cycle (and keeps the URL shareable). The context also
  // self-heals if a link ever drops it — this is the clean-URL belt to that brace.
  const { reportSearch } = useReport();

  // Collapsed mode renders a fixed 36×36 icon-only button centered in
  // the rail via mx-auto. No label wrapper — guarantees the icon sits
  // dead on the rail's vertical centerline, perfectly inline with the
  // GAS logo and the toggle above.
  if (collapsed) {
    const button = (
      <NavLink
        to={{ pathname: item.to, search: reportSearch }}
        end={item.to === "/dashboard"}
        className={({ isActive }) =>
          cn(
            "group relative h-9 w-9 mx-auto flex items-center justify-center rounded-lg",
            "transition-colors duration-200 ease-out-expo motion-reduce:transition-none",
            active && !isActive && "text-slate-300 hover:text-white hover:bg-white/5",
            stub && "text-slate-400 cursor-not-allowed hover:bg-transparent",
            lock && "text-slate-400 hover:text-slate-200 hover:bg-white/5",
            isActive && active &&
              "bg-gradient-to-br from-violet-500/35 via-violet-500/15 to-violet-500/5 text-white ring-1 ring-inset ring-violet-400/30 shadow-[inset_0_0_14px_rgba(124,58,237,0.18)]",
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* Active-state left rail — mirrors the expanded-mode rail
                so the user can tell at a glance which page they're on
                even with the sidebar collapsed. Positioned just OUTSIDE
                the icon button on the rail's left side, attached to the
                sidebar's inner edge so it reads as the sidebar
                indicating an active section, not as button decoration.
                The 12px (-left-3) breakout pulls the rail past the
                button + the nav's px-2 inset to align with the
                sidebar's outer-left frame. */}
            {isActive && active && (
              <span
                aria-hidden="true"
                className="absolute -left-3 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-violet-200 via-violet-400 to-violet-500 shadow-[0_0_2px_rgba(255,255,255,0.7),0_0_10px_rgba(167,139,250,0.95),0_0_22px_rgba(124,58,237,0.55)]"
              />
            )}
            <span className="relative flex items-center justify-center">
              <Icon
                className={cn(
                  "h-[17px] w-[17px] transition-colors duration-200 motion-reduce:transition-none",
                  isActive && active
                    ? "text-violet-200 drop-shadow-[0_0_6px_rgba(167,139,250,0.6)]"
                    : "text-slate-400 group-hover:text-slate-200",
                )}
              />
              {item.badge && active && !lock && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-1 inline-flex items-center justify-center rounded-full bg-violet-500 text-[8.5px] font-bold leading-none text-white ring-1 ring-slate-950 shadow-[0_0_6px_rgba(124,58,237,0.6)]"
                >
                  {item.badge}
                </span>
              )}
              {lock && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-slate-900 ring-1 ring-slate-700 flex items-center justify-center"
                >
                  <Lock className="h-2 w-2 text-slate-400" />
                </span>
              )}
            </span>
          </>
        )}
      </NavLink>
    );

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={10}
          className="bg-slate-900 text-white border-slate-700 px-2.5 py-1 text-[12px] font-medium shadow-lg"
        >
          {item.label}
          {item.badge && active && !lock && (
            <span className="ml-1.5 text-[10px] text-violet-300 font-semibold">{item.badge}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded mode — full-width row with label, trailing chip/badge.
  return (
    <NavLink
      to={{ pathname: item.to, search: reportSearch }}
      end={item.to === "/dashboard"}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center h-9 rounded-lg text-[13.5px] font-medium gap-2.5 px-2.5",
          "transition-all duration-200 ease-out-expo motion-reduce:transition-none",
          active && !isActive && "text-slate-300 hover:text-white hover:bg-white/5",
          stub && "text-slate-400 cursor-not-allowed hover:bg-transparent",
          lock && "text-slate-400 hover:text-slate-200 hover:bg-white/5",
          isActive && active && "bg-gradient-to-r from-violet-500/35 via-violet-500/15 to-violet-500/5 text-white shadow-inner-top",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && active && (
            <>
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 bottom-1 w-[4px] rounded-full bg-gradient-to-b from-violet-200 via-violet-400 to-violet-500 shadow-[0_0_2px_rgba(255,255,255,0.7),0_0_10px_rgba(167,139,250,0.95),0_0_22px_rgba(124,58,237,0.55)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-violet-400/30 shadow-[inset_0_0_14px_rgba(124,58,237,0.18)]"
              />
            </>
          )}
          <span className="relative flex items-center justify-center shrink-0">
            <Icon
              className={cn(
                "relative h-[17px] w-[17px] transition-colors duration-200 motion-reduce:transition-none",
                isActive && active ? "text-violet-200 drop-shadow-[0_0_6px_rgba(167,139,250,0.6)]" : "text-slate-400 group-hover:text-slate-200",
              )}
            />
          </span>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {stub && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">soon</span>}
          {lock && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
          {item.badge && active && !lock && (
            <span
              className={cn(
                "min-w-[20px] h-[18px] inline-flex items-center justify-center px-1.5 rounded-md tabular-nums shrink-0",
                "text-[10.5px] font-semibold leading-none",
                "transition-all duration-200 ease-out-expo motion-reduce:transition-none",
                isActive
                  ? "bg-violet-400/90 text-violet-950 ring-1 ring-violet-300/50 shadow-[0_0_8px_rgba(167,139,250,0.45)]"
                  : "bg-white/10 text-slate-300 group-hover:bg-violet-500/20 group-hover:text-white group-hover:ring-1 group-hover:ring-violet-300/30",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const userName = useAuthStore((s) => s.actor?.userName ?? "—");
  const userInitials = userName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "··";

  return (
    <TooltipProvider delayDuration={300}>
      {/* view-transition-name tags this element as the NEW state of the
          gas-login-morph panel. The browser morphs the login Hero column
          (OLD state) into this sidebar on sign-in via startViewTransition.
          Name must match login.route.tsx exactly and be unique per page. */}
      <aside
        data-collapsed={collapsed}
        style={{ viewTransitionName: 'gas-login-morph' }}
        className={cn(
          "hidden lg:flex shrink-0 flex-col h-screen sticky top-0",
          // Width morphs between the full 248px expanded rail and a
          // compact 88px icon-only rail. 88px = 48px logo + 20px gutter
          // either side so the logo never feels pinched against the
          // edges (76px was too tight — the violet sphere's glow hit
          // the right border). The transition uses the ease-out-expo
          // curve so the rail decelerates into its resting width —
          // feels heavier and more deliberate than a linear slide.
          // 320ms is the sweet spot: long enough to read as a designed
          // gesture, short enough to feel instant.
          "transition-[width] duration-[320ms] ease-out-expo motion-reduce:transition-none",
          collapsed ? "w-[88px]" : "w-[248px]",
          // bg-black is the fallback behind BG.png. SidebarBg renders
          // the full login-screen background as absolute inset-0 layers.
          "bg-black text-slate-200 border-r border-white/[0.08]",
          "relative overflow-hidden",
        )}
      >
      {/* Full login-screen background — BG.png drift + purple blooms +
          canvas particles + vertical filaments. Identical to the login
          screen background so the sidebar reads as a visual continuation
          of where the user just came from. */}
      <SidebarBg />

      {/* Brand bay — 72px tall. Logo stays h-12 always (never shrinks).
          Expanded: horizontal — logo · wordmark · toggle (right edge).
          Collapsed: logo + toggle live side-by-side as a centered
          inline group on the same horizontal axis (logo left, toggle
          immediately to its right, both vertically centered). 88px
          rail width = 6px gutter + 48px logo + 4px gap + 24px toggle
          + 6px gutter = exactly fits with breathing room. */}
      <div
        className={cn(
          "relative h-[72px] flex items-center border-b border-white/5",
          collapsed ? "justify-center px-1 gap-1" : "px-5 gap-3",
        )}
      >
        {/* Brand mark — full-bleed PNG, h-12 in BOTH states so the
            mark never shrinks. The logo carries its own violet
            sphere + circuit traces; the dark sidebar is its intended
            substrate so we render it without any chrome around it. */}
        <img
          src={logoUrl}
          alt=""
          className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(124,58,237,0.55)]"
        />
        <div
          className={cn(
            "leading-tight overflow-hidden whitespace-nowrap",
            "transition-[opacity,max-width] duration-200 ease-out-expo motion-reduce:transition-none",
            collapsed
              ? "opacity-0 max-w-0 pointer-events-none"
              : "opacity-100 max-w-[160px] delay-[120ms]",
          )}
        >
          <div className="text-[15px] font-semibold text-white tracking-tight">GAS Anomaly</div>
          <div className="text-[11px] text-slate-400 font-medium">Client Workspace</div>
        </div>

        {/* Collapse toggle — when expanded, absolutely pinned to the
            right edge of the brand bay (vertically centered); when
            collapsed, flows inline as a flex item immediately to the
            right of the GAS logo (also vertically centered) so the
            two sit side-by-side as a centered group. */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className={cn(
                "inline-flex items-center justify-center rounded-md shrink-0",
                "text-slate-400 hover:text-white",
                "bg-slate-900/80 hover:bg-slate-800 ring-1 ring-white/10 hover:ring-violet-400/40",
                "shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
                "transition-colors duration-200 ease-out-expo motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                collapsed
                  ? "h-6 w-6"
                  : "absolute z-10 h-7 w-7 right-3 top-1/2 -translate-y-1/2",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-3 w-3" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="bg-slate-900 text-white border-slate-700 px-2.5 py-1 text-[12px] font-medium shadow-lg"
          >
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav
        className={cn(
          "relative flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden",
          "transition-[padding] duration-[320ms] ease-out-expo motion-reduce:transition-none",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {/* Section header — text fades, but the small section break
            (top padding) is preserved so the visual rhythm of the
            grouped nav still reads when collapsed. */}
        <div
          className={cn(
            "px-2 pb-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-[0.08em]",
            "overflow-hidden whitespace-nowrap transition-[opacity,height,padding] duration-200 ease-out-expo motion-reduce:transition-none",
            collapsed ? "opacity-0 h-0 pb-0" : "opacity-100 h-[18px]",
          )}
        >
          Workspace
        </div>
        {primary.map((i) => <NavBtn key={i.to} item={i} collapsed={collapsed} />)}

        {/* Settings footer link removed (2026-06-05) — /settings route is gone. */}
      </nav>

      <div
        className={cn(
          "relative py-3 border-t border-white/5",
          "transition-[padding] duration-[320ms] ease-out-expo motion-reduce:transition-none",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {collapsed ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="mx-auto h-8 w-8 relative rounded-full hover:ring-2 hover:ring-violet-300/40 transition-all cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-white flex items-center justify-center text-[12px] font-semibold ring-1 ring-violet-300/30 shadow-[0_2px_8px_rgba(124,58,237,0.35)]">
                  {userInitials}
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="bg-slate-900 text-white border-slate-700 px-2.5 py-1 text-[12px] font-medium shadow-lg"
            >
              {userName} · Open session
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="w-full flex items-center rounded-lg hover:bg-white/5 transition-colors cursor-pointer gap-2.5 px-2 py-2">
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-white flex items-center justify-center text-[12px] font-semibold ring-1 ring-violet-300/30 shadow-[0_2px_8px_rgba(124,58,237,0.35)]">
                {userInitials}
              </div>
            </div>
            <div className="flex-1 text-left min-w-0 flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="flex-1 min-w-0">
                <div className="text-body font-semibold text-white truncate">{userName}</div>
                <div className="text-caption text-slate-400 truncate">Open session · Phase 1</div>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
    </aside>
    </TooltipProvider>
  );
}
