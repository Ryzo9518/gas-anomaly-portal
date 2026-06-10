import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Search, Bell, BellOff, Info, Menu, ArrowLeft, ChevronRight,
  ChevronDown, Check, History,
} from "lucide-react";
import { useReport } from "@/features/audit/ReportContext";
import { ClientSwitcher } from "./ClientSwitcher";
import type { EngagementStatus } from "@/features/audit/reports.fixture";
import { useUIStore } from "@/state/uiStore";
import { IconButton } from "@/ui/Button";
import { Popover } from "@/ui/Popover";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

// TOPBAR — shell-level header.
//
// Visual contract (matches mock .tb):
//   h-12 (48px) · background #F8FAFC · border-b #E2E8F0 · px-[18px]
//
// LEFT cluster is now the REPORT CONTEXT selector — the single global switch
// that rehydrates every screen for the chosen audit report (Snyk scan-picker /
// Datadog time-window pattern). When a non-latest report is selected a thin
// amber "historical / read-only" banner appears directly under the bar.

// Engagement status → dropdown badge.
const ENG_BADGE: Record<EngagementStatus, { label: string; cls: string }> = {
  none:      { label: "No plan",   cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  submitted: { label: "Submitted", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  active:    { label: "Active",    cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  complete:  { label: "Complete",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

function ReportSelector() {
  const { reports, selectedReport, selectedReportId, selectReport, engagementsById, isHistorical, hasReports } =
    useReport();
  const [searchParams] = useSearchParams();

  // No audit reports for this client yet → no report to switch between; hide the
  // pill entirely (the workspace shows the no-data empty state instead).
  if (!hasReports) return null;

  // When setting up a new audit cycle, advance the year by 1 and switch label to "New"
  const isNewCycle = searchParams.get("mode") === "new";
  const displayYear = isNewCycle
    ? String(parseInt(selectedReport.shortLabel, 10) + 1)
    : selectedReport.shortLabel;
  const displayType = isNewCycle ? "New" : "Audit";

  return (
    <Popover
      align="start"
      width={300}
      className="p-0"
      trigger={
        <button
          type="button"
          aria-label="Switch audit report"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-150",
            "border-2 font-semibold",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            isHistorical
              ? "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-150 focus-visible:ring-amber-400 shadow-sm"
              : "bg-violet-50 border-violet-400 text-violet-900 hover:bg-violet-100 focus-visible:ring-violet-400 shadow-sm hover:shadow-md",
          )}
        >
          <span className="text-[13px] font-bold tabular-nums">
            {displayYear}
          </span>
          <span className="hidden md:inline text-[11px] font-semibold text-current uppercase tracking-widest opacity-80">
            {displayType}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      }
    >
      <div className="px-3 py-2 border-b border-slate-100">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Audit reports
        </p>
      </div>
      <div className="py-1 max-h-[320px] overflow-y-auto">
        {reports.map((r) => {
          const active = r.id === selectedReportId;
          const status = engagementsById[r.id]?.status ?? "none";
          const badge = ENG_BADGE[status];
          return (
            <PopoverPrimitive.Close asChild key={r.id}>
              <button
                type="button"
                onClick={() => selectReport(r.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  active ? "bg-violet-50/60" : "hover:bg-slate-50",
                )}
              >
                <span className="w-3.5 shrink-0">
                  {active && <Check className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-slate-900 truncate">
                    {r.cycleLabel}
                  </span>
                  <span className="block text-[11px] text-slate-500 tabular-nums">
                    Health {r.healthScore} · {r.findings.length} findings
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                    badge.cls,
                  )}
                >
                  {badge.label}
                </span>
              </button>
            </PopoverPrimitive.Close>
          );
        })}
      </div>
    </Popover>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate    = useNavigate();
  const setCommandOpen   = useUIStore((s) => s.setCommandOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const { isHistorical, selectedReport, engagement, linkWithReport, hasReports } = useReport();

  // Show recovered vs planned in the historical bar when the engagement is complete.
  const savingsNote = (() => {
    if (!engagement || engagement.status !== "complete" || engagement.actualSavings == null) return null;
    const fmt = (v: number) => {
      if (v >= 1_000_000) return `R ${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `R ${(v / 1_000).toFixed(0)}K`;
      return `R ${v}`;
    };
    return `${fmt(engagement.actualSavings)} recovered of ${fmt(engagement.estimatedSavings)} planned.`;
  })();

  // Detect lead-detail route and extract the id segment.
  const leadMatch = pathname.match(/^\/lead\/([^/]+)/);
  const leadId     = leadMatch?.[1] ?? null;
  const isLeadPage = !!leadId;

  // Section label for non-lead pages.
  const section = (() => {
    if (pathname.startsWith("/dashboard"))  return "Dashboard";
    if (pathname.startsWith("/pipeline"))   return "Pipeline";
    if (pathname.startsWith("/intake"))     return "Intake";
    if (pathname.startsWith("/lead"))       return "Lead";
    if (pathname.startsWith("/settings"))   return "Settings";
    if (pathname.startsWith("/rebate"))     return "Rebate";
    if (pathname.startsWith("/sla"))        return "SLA";
    if (pathname.startsWith("/vouchers"))   return "Vouchers";
    if (pathname.startsWith("/clients"))    return "Clients";
    if (pathname.startsWith("/analytics"))  return "Analytics";
    if (pathname.startsWith("/upload"))     return "Upload";
    if (pathname.startsWith("/report"))     return "Report";
    if (pathname.startsWith("/findings"))   return "Findings";
    if (pathname.startsWith("/engagement")) return "Engagement";
    return "Workspace";
  })();

  return (
    <>
      <header
        className={cn(
          "h-12 shrink-0 sticky top-0 z-30",
          "flex md:grid md:grid-cols-[1fr_minmax(0,280px)_1fr] items-center gap-2 sm:gap-3 px-[18px]",
          "bg-[#F8FAFC]",
          "border-b border-[#E2E8F0]",
          "relative overflow-hidden",
        )}
      >
        {/* LEFT CLUSTER — back-nav (lead pages) OR client + report selector */}
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial md:justify-self-start">
          {/* Mobile hamburger */}
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden relative shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
          >
            <Menu className="h-[17px] w-[17px]" />
          </IconButton>

          {isLeadPage ? (
            /* ── LEAD DETAIL: ← Pipeline › {id} ── */
            <div className="flex items-center gap-1.5 text-[12px]">
              <button
                type="button"
                onClick={() => navigate(linkWithReport("/pipeline"))}
                className="flex items-center gap-1 text-[#64748B] font-medium hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
                aria-label="Back to Pipeline"
              >
                <ArrowLeft className="h-3 w-3 shrink-0" aria-hidden="true" />
                Pipeline
              </button>
              <ChevronRight className="h-3 w-3 text-[#94A3B8] shrink-0" aria-hidden="true" />
              <strong className="text-[#1E293B] font-semibold tabular-nums">
                {leadId}
              </strong>
            </div>
          ) : (
            /* ── [Client ▾] › [Report ▾] › section ── */
            <div className="flex items-center gap-1.5 min-w-0">
              <ClientSwitcher />
              {hasReports && (
                <>
                  <ChevronRight
                    className="hidden md:block h-3 w-3 text-slate-300 shrink-0"
                    aria-hidden="true"
                  />
                  <ReportSelector />
                </>
              )}
              <ChevronRight
                className="hidden md:block h-3 w-3 text-slate-300 shrink-0"
                aria-hidden="true"
              />
              <div className="hidden md:block text-[12px] text-slate-500 font-medium truncate">
                {section}
              </div>
            </div>
          )}
        </div>

        {/* SEARCH — compact, centered, light style matching mock .tb-srch */}
        <button
          onClick={() => setCommandOpen(true)}
          className={cn(
            "group relative shrink-0 md:shrink h-[30px] rounded-lg",
            "w-9 md:w-full md:max-w-[280px] md:min-w-0 md:justify-self-center",
            "flex items-center gap-2",
            "justify-center px-0 md:px-2.5",
            "bg-white border border-[#E2E8F0]",
            "hover:border-slate-300 hover:shadow-[0_0_0_3px_rgba(124,58,237,0.07)]",
            "transition-all duration-200 ease-out-expo",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-1",
          )}
          aria-label="Search leads, clients, saved views"
        >
          <Search className="h-[13px] w-[13px] text-[#94A3B8] group-hover:text-slate-500 transition-colors shrink-0" />
          <span className="hidden md:flex flex-1 text-left text-[11.5px] text-[#94A3B8] group-hover:text-slate-500 transition-colors truncate">
            Search…
          </span>
        </button>

        {/* RIGHT — notification bell */}
        <div className="relative shrink-0 flex items-center gap-1.5 md:justify-self-end">
          <Popover
            align="end"
            width={320}
            className="p-0"
            trigger={
              <IconButton
                aria-label="Open notifications"
                className="w-[30px] h-[30px] border border-[#E2E8F0] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
              >
                <div className="relative">
                  <Bell className="h-[14px] w-[14px]" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6),0_0_3px_rgba(52,211,153,0.95)]"
                  />
                </div>
              </IconButton>
            }
          >
            <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="text-body font-semibold text-slate-900">Notifications</div>
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide">
                Phase 1.5
              </span>
            </div>
            <div className="px-3 py-5 flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-500 ring-1 ring-violet-100 flex items-center justify-center mb-2.5">
                <BellOff className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-support font-semibold text-slate-800">No notifications yet</p>
              <p className="mt-1 text-caption text-slate-500 leading-snug max-w-[260px]">
                You're all caught up. New audit results, finding updates and Jera replies will land here.
              </p>
            </div>
            <div className="px-3 py-2.5 border-t border-slate-100 flex items-start gap-2 bg-slate-50/60">
              <Info className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
              <p className="text-caption text-slate-500 leading-snug">
                Notification routing &amp; preferences arrive in <span className="font-semibold text-slate-700">Phase 1.5</span>. Until then, this surface is a preview.
              </p>
            </div>
          </Popover>
        </div>
      </header>

      {/* Historical view banner: shown on every page when a prior cycle is selected */}
      {isHistorical && (
        <div className="shrink-0 flex items-center gap-2 px-[18px] py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800">
          <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="text-[11.5px] font-medium">
            Viewing the <span className="font-semibold">{selectedReport.cycleLabel}</span>, historical, read-only.
            {savingsNote && (
              <span className="ml-2 text-amber-700">{savingsNote}</span>
            )}
          </p>
        </div>
      )}
    </>
  );
}
