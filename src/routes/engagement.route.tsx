import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Handshake, Clock, Calendar, TrendingUp,
  Send, Save, CheckCircle2, Info, Download, Lock, AlertCircle,
  History, RotateCcw,
} from "lucide-react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useReport } from "@/features/audit/ReportContext";
import type {
  Severity,
  AuditReport,
  Engagement,
  EngagementFinding,
  EngagementFindingStatus,
} from "@/features/audit/reports.fixture";
import { cn } from "@/lib/utils";

// Active pill gradient — matches KPI card icon badge (StatTile BADGE_CLS standard)
const PILL_ACTIVE_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 2px 10px rgba(109,40,217,0.22), 0 1px 0 rgba(255,255,255,0.14) inset",
  color: "#FFFFFF",
};

// ── Engagement Plan ─────────────────────────────────────────────────────────
//
//   • CURRENT cycle, no plan yet  → editable BUILDER (select findings →
//     allocate hours → Submit to Jera). On submit the plan is written to
//     ReportContext and the whole app updates (findings overlay, dashboard
//     pill). The page then locks.
//   • Plan already submitted/active/complete (incl. any historical report)
//     → LOCKED read-only view. Completed cycles also show ACTUAL vs
//     ESTIMATED recovery and flag any regressed findings.

// ── Chip helpers ────────────────────────────────────────────────────────────

const SEVERITY_CHIP: Record<Severity, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  high:     "bg-amber-50 text-amber-800 ring-amber-200",
  medium:   "bg-indigo-50 text-indigo-700 ring-indigo-200",
  low:      "bg-slate-100 text-slate-600 ring-slate-200",
};

const ENG_FINDING_BADGE: Record<EngagementFindingStatus, { label: string; cls: string }> = {
  included:  { label: "In plan",   cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  skipped:   { label: "Skipped",   cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  resolved:  { label: "Resolved",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  regressed: { label: "Regressed", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submitted to Jera", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  active:    { label: "Active",            cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  complete:  { label: "Complete",          cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

// ── Carry-over (Q3 = YES) ─────────────────────────────────────────────────
// When the new cycle's plan is built, we look at what happened to each finding
// in the PRIOR cycle and pre-select the ones that were NOT fully put to bed:
//   regressed → came back, re-engage   (carry)
//   skipped   → deferred last year     (carry)
//   resolved  → fixed, don't re-add    (no carry)
//   (new)     → never seen before      (no carry — user decides)
// The user can override every default; this is a smart starting point, not a lock.
type PriorOutcome = EngagementFindingStatus | "new";

const PRIOR_BADGE: Record<PriorOutcome, { label: string; cls: string; carry: boolean }> = {
  regressed: { label: "Regressed",   cls: "bg-rose-50 text-rose-700 ring-rose-200",       carry: true  },
  skipped:   { label: "Deferred",    cls: "bg-amber-50 text-amber-800 ring-amber-200",     carry: true  },
  included:  { label: "Was in plan", cls: "bg-violet-50 text-violet-700 ring-violet-200",  carry: true  },
  resolved:  { label: "Resolved",    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", carry: false },
  new:       { label: "New",         cls: "bg-slate-100 text-slate-500 ring-slate-200",     carry: false },
};

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `R ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R ${(v / 1_000).toFixed(0)}K`;
  return `R ${v}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

// ── SVG donut chart ─────────────────────────────────────────────────────────

function DonutChart({ improvement, support }: { improvement: number; support: number }) {
  const cx = 50, cy = 50, r = 36;
  const circ = 2 * Math.PI * r;

  if (improvement === 0 && support === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-44 h-44" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="14" />
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: "11px", fill: "#CBD5E1", fontFamily: "inherit" }}>
          —
        </text>
      </svg>
    );
  }

  const total = improvement + support;
  const improvFrac = improvement / total;
  const suppFrac   = support / total;
  const hasBoth    = improvement > 0 && support > 0;

  const halfGapDeg = hasBoth ? 2 : 0;
  const halfGapLen = (halfGapDeg / 360) * circ;

  const improvLen = Math.max(0, circ * improvFrac - halfGapLen);
  const suppLen   = Math.max(0, circ * suppFrac   - halfGapLen);
  const suppRotationDeg = improvFrac * 360 + halfGapDeg;

  return (
    <svg viewBox="0 0 100 100" className="w-44 h-44" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="14" />
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {improvement > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#7C3AED" strokeWidth="14"
            strokeDasharray={`${improvLen} ${circ}`} strokeDashoffset={0} strokeLinecap="butt" />
        )}
        {support > 0 && (
          <g transform={`rotate(${suppRotationDeg} ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#94A3B8" strokeWidth="14"
              strokeDasharray={`${suppLen} ${circ}`} strokeDashoffset={0} strokeLinecap="butt" />
          </g>
        )}
      </g>
      <text x={cx} y={cy - 3} textAnchor="middle" style={{ fontSize: "15px", fontWeight: "700", fill: "#1E293B", fontFamily: "inherit" }}>
        {improvement + support}h
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" style={{ fontSize: "7.5px", fill: "#94A3B8", fontFamily: "inherit" }}>
        per month
      </text>
    </svg>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)} aria-hidden="true" />
        <span className="text-caption text-slate-500 truncate">{label}</span>
      </div>
      <span className="text-caption font-semibold text-slate-900 tabular-nums shrink-0">{value}</span>
    </div>
  );
}

const MONTH_OPTIONS = [3, 6, 9, 12] as const;

// ════════════════════════════════════════════════════════════════════════════
// LOCKED VIEW — a submitted / active / complete plan (read-only).
// ════════════════════════════════════════════════════════════════════════════

function LockedEngagementView({
  report, engagement, justSubmitted, isHistorical,
}: {
  report: AuditReport;
  engagement: Engagement;
  justSubmitted: boolean;
  isHistorical: boolean;
}) {
  const navigate = useNavigate();
  const { linkWithReport } = useReport();
  const [banner, setBanner] = React.useState(justSubmitted);

  React.useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(false), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const isComplete = engagement.status === "complete";
  const pill = STATUS_PILL[engagement.status] ?? STATUS_PILL.submitted;

  // Join engagement findings to their titles, ordered by rank.
  const byRank = new Map(report.findings.map((f) => [f.rank, f]));
  const rows = [...engagement.findings].sort((a, b) => a.findingRank - b.findingRank);

  const inPlanCount = engagement.findings.filter((f) => f.status !== "skipped").length;
  const skippedCount = engagement.findings.filter((f) => f.status === "skipped").length;
  const recovered = engagement.actualSavings ?? 0;
  const planned = engagement.estimatedSavings;
  const realisedPct = planned > 0 ? Math.round((recovered / planned) * 100) : 0;
  const regressed = engagement.findings.filter((f) => f.status === "regressed");
  const regressedAmount = regressed.reduce((s, f) => s + f.estimatedImpact, 0);

  // The lock is the whole point: a submitted/active/complete plan — and ANY
  // historical cycle — is read-only. There is deliberately NO edit affordance.
  const lockLine = isHistorical
    ? `${report.cycleLabel} is a closed cycle. It is frozen and read-only. The live cycle is where new work is planned.`
    : isComplete
      ? "This cycle is closed. The plan and its actuals are final and read-only."
      : "This plan is locked in and on its way to Jera. It is read-only until the cycle completes.";

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-display text-slate-900">Engagement Plan</h1>
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-none ring-1 ring-inset ${pill.cls}`}>
                <Lock className="h-2.5 w-2.5" aria-hidden="true" /> {pill.label}
              </span>
            </div>
            <p className="text-body text-slate-500">
              {report.cycleLabel} &middot; submitted {formatDate(engagement.submittedAt)}.
              {isComplete ? " This cycle is closed — actuals shown below." : " Jera is preparing your formal SLA."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(linkWithReport("/findings"))}
              className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded shrink-0"
            >
              ← Back to Findings
            </button>
          </div>
        </div>
      </PageStickyHeader>

      {/* Just-submitted celebration banner */}
      {banner && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 animate-in fade-in-0 zoom-in-95 duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-emerald-900">Sent to Jera</p>
            <p className="text-caption text-emerald-700">
              Your engagement brief is on its way. Jera will return a formal SLA within 2 business days.
            </p>
          </div>
        </div>
      )}

      {/* Locked notice — makes the read-only contract explicit on-screen. */}
      <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-2.5">
        <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-caption text-slate-600 leading-snug">{lockLine}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_356px] gap-6 items-start">
        {/* LEFT — finding ledger (read-only) */}
        <Card padding="none">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-[13px] font-semibold text-slate-900">
              Findings in this engagement
            </p>
            <p className="text-caption text-slate-500 mt-0.5">
              {inPlanCount} in plan &middot; {skippedCount} skipped
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-caption text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-5 font-medium">Finding</th>
                <th className="py-2.5 px-3 font-medium w-32">Outcome</th>
                <th className="py-2.5 px-3 font-medium w-28 text-right">Est.</th>
                {isComplete && <th className="py-2.5 px-3 font-medium w-28 text-right">Actual</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((ef) => {
                const f = byRank.get(ef.findingRank);
                const badge = ENG_FINDING_BADGE[ef.status];
                return (
                  <tr key={ef.findingRank} className="border-b border-slate-50">
                    <td className="py-3 px-5">
                      <div className="text-slate-900 font-medium text-[13px] leading-snug">
                        {f?.title ?? `Finding #${ef.findingRank}`}
                      </div>
                      {f && (
                        <span className={cn("mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset uppercase tracking-wider", SEVERITY_CHIP[f.severity])}>
                          {f.severity}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[12px] tabular-nums text-slate-600">
                      {ef.estimatedImpact > 0 ? formatCurrency(ef.estimatedImpact) : "—"}
                    </td>
                    {isComplete && (
                      <td className={cn(
                        "py-3 px-3 text-right font-mono text-[12px] tabular-nums",
                        ef.status === "regressed" ? "text-rose-600" : "text-emerald-700",
                      )}>
                        {ef.status === "skipped" ? "—" : formatCurrency(ef.actualImpact ?? 0)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* RIGHT — summary */}
        <div className="lg:sticky lg:top-6 space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
              </div>
              <p className="text-[13px] font-semibold text-slate-900">Plan summary</p>
            </div>

            <div className="flex flex-col items-center mb-5">
              <DonutChart improvement={engagement.improvementHoursPerMonth} support={engagement.supportHoursPerMonth} />
              <div className="w-full mt-4 space-y-2">
                <LegendDot color="bg-violet-600" label="Improvement / mo" value={`${engagement.improvementHoursPerMonth}h`} />
                <LegendDot color="bg-slate-400" label="Support / mo" value={`${engagement.supportHoursPerMonth}h`} />
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 rounded-lg px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Findings in plan</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">{inPlanCount}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Spread over</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">{engagement.months} months</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Estimated savings</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">{formatCurrency(planned)}</span>
              </div>
            </div>
          </Card>

          {/* Outcome card — completed cycles only */}
          {isComplete && (
            <Card>
              <div className="text-overline uppercase text-emerald-600 mb-1.5">Outcome</div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-[32px] leading-none tracking-[-0.04em] font-extrabold tabular-nums text-emerald-700">
                  {formatCurrency(recovered)}
                </span>
                <span className="text-caption text-slate-500">recovered</span>
              </div>
              <div className="mt-1 text-caption text-slate-500">
                {realisedPct}% of {formatCurrency(planned)} planned
              </div>
              <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, realisedPct)}%` }} />
              </div>
              {regressed.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-caption text-rose-700 leading-snug">
                    {regressed.length} finding{regressed.length > 1 ? "s" : ""} regressed —
                    {" "}{formatCurrency(regressedAmount)} was not realised and is carried into the next cycle.
                  </p>
                </div>
              )}
            </Card>
          )}

          <Button variant="secondary" size="md" onClick={() => {}} className="w-full justify-center">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download brief
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BUILDER — current cycle, no plan yet.
// ════════════════════════════════════════════════════════════════════════════

function EngagementBuilder({ report }: { report: AuditReport }) {
  const navigate = useNavigate();
  const { submitEngagement, saveDraft, priorReport, priorEngagement, engagement, linkWithReport } =
    useReport();
  const findings = report.findings;

  // Prior-cycle outcome per finding rank → drives carry-over + the context column.
  const priorByRank = React.useMemo(() => {
    const m = new Map<number, EngagementFindingStatus>();
    priorEngagement?.findings.forEach((f) => m.set(f.findingRank, f.status));
    return m;
  }, [priorEngagement]);

  const priorOutcomeOf = React.useCallback(
    (rank: number): PriorOutcome => priorByRank.get(rank) ?? "new",
    [priorByRank],
  );

  // Ranks the carry-over rule would pre-select (regressed / skipped / was-in-plan).
  const carriedRanks = React.useMemo(
    () => findings.filter((f) => PRIOR_BADGE[priorOutcomeOf(f.rank)].carry).map((f) => f.rank),
    [findings, priorOutcomeOf],
  );

  // Seed the selection: an in-progress DRAFT wins (don't lose the user's work);
  // otherwise fall back to the carry-over defaults.
  const [selected, setSelected] = React.useState<Set<number>>(() => {
    if (engagement && engagement.status === "draft") {
      return new Set(
        engagement.findings.filter((f) => f.status !== "skipped").map((f) => f.findingRank),
      );
    }
    return new Set(carriedRanks);
  });
  const restoredDraft = !!engagement && engagement.status === "draft";
  const monthOpts = MONTH_OPTIONS as readonly number[];
  const [supportHours, setSupportHours] = React.useState<number>(
    engagement?.supportHoursPerMonth ?? priorEngagement?.supportHoursPerMonth ?? 16,
  );
  const [months, setMonths] = React.useState<number>(() => {
    const seed = engagement?.months ?? priorEngagement?.months;
    return seed && monthOpts.includes(seed) ? seed : 6;
  });
  const [saved, setSaved] = React.useState(false);
  const showPrior = !!priorEngagement;

  const selectedFindings      = findings.filter((f) => selected.has(f.rank));
  const totalRemediationHours = selectedFindings.reduce((sum, f) => sum + f.estimatedHours, 0);
  const improvementPerMonth   = months > 0 ? Math.ceil(totalRemediationHours / months) : 0;
  const monthlyEngagement     = improvementPerMonth + supportHours;
  const canSubmit             = selected.size > 0 && supportHours >= 0;

  const toggle = (rank: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });

  const selectAll          = () => setSelected(new Set(findings.map((f) => f.rank)));
  const clearAll           = () => setSelected(new Set());
  const selectCriticalHigh = () =>
    setSelected(new Set(findings.filter((f) => f.severity === "critical" || f.severity === "high").map((f) => f.rank)));
  const allSelected = selected.size === findings.length;

  // Build the EngagementFinding[] payload from the current selection.
  const buildPayload = () => {
    const engFindings: EngagementFinding[] = findings.map((f) => ({
      findingRank: f.rank,
      status: selected.has(f.rank) ? "included" : "skipped",
      estimatedImpact: f.financialImpact,
    }));
    const estimatedSavings = selectedFindings.reduce((s, f) => s + f.financialImpact, 0);
    return {
      improvementHoursPerMonth: improvementPerMonth,
      supportHoursPerMonth: supportHours,
      months,
      estimatedSavings,
      findings: engFindings,
    };
  };

  const handleSubmit = () => submitEngagement(buildPayload()); // context flips → locked view
  const handleSave = () => {
    saveDraft(buildPayload());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <h1 className="text-display text-slate-900">Engagement Plan</h1>
            <p className="text-body text-slate-500 mt-0.5">
              {report.cycleLabel} &middot; select findings, set your monthly budget, and send a brief to Jera.
              Jera turns the brief into a formal SLA.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(linkWithReport("/findings"))}
            className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded shrink-0"
          >
            ← Back to Findings
          </button>
        </div>
      </PageStickyHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_356px] gap-6 items-start">
        {/* LEFT */}
        <div className="space-y-5">
          {showPrior && (
            <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 ring-1 ring-violet-100 px-4 py-3 animate-in fade-in-0 duration-300">
              <RotateCcw className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold text-violet-900">
                  {restoredDraft
                    ? "Draft restored"
                    : `Carried over from ${priorReport?.shortLabel ?? "last cycle"}`}
                </p>
                <p className="text-caption text-violet-700 leading-snug mt-0.5">
                  {restoredDraft
                    ? "We picked up where you left off — adjust anything before you submit."
                    : `We pre-selected ${carriedRanks.length} finding${carriedRanks.length === 1 ? "" : "s"} that regressed or were deferred in ${priorReport?.shortLabel ?? "the prior cycle"}. Items resolved last cycle are left out — change any of it before you submit.`}
                </p>
              </div>
            </div>
          )}
          <Card>
            <p className="text-[13px] font-semibold text-slate-900 mb-4">Monthly budget</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="support-hours" className="block text-caption text-slate-500 font-medium mb-2">
                  <Clock className="inline h-3 w-3 mr-1 text-slate-400" aria-hidden="true" />
                  Standard support hours / mo
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSupportHours((h) => Math.max(0, h - 4))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:ring-slate-300 text-lg font-medium transition-colors select-none"
                    aria-label="Decrease support hours">–</button>
                  <input id="support-hours" type="number" min={0} max={200} value={supportHours}
                    onChange={(e) => setSupportHours(Math.max(0, Math.min(200, parseInt(e.target.value) || 0)))}
                    className="h-9 w-20 text-center rounded-lg ring-1 ring-slate-200 bg-white text-[15px] font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow" />
                  <button type="button" onClick={() => setSupportHours((h) => Math.min(200, h + 4))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:ring-slate-300 text-lg font-medium transition-colors select-none"
                    aria-label="Increase support hours">+</button>
                </div>
                <p className="text-caption text-slate-400 mt-1.5">Reactive support, queries, ad-hoc fixes.</p>
              </div>

              <div>
                <p className="text-caption text-slate-500 font-medium mb-2">
                  <Calendar className="inline h-3 w-3 mr-1 text-slate-400" aria-hidden="true" />
                  Spread improvements over
                </p>
                <div className="flex gap-2 flex-wrap">
                  {MONTH_OPTIONS.map((m) => (
                    <button key={m} type="button" onClick={() => setMonths(m)}
                      style={months === m ? PILL_ACTIVE_STYLE : undefined}
                      className={cn(
                        "h-9 px-4 rounded-lg text-[13px] font-semibold ring-1 ring-inset transition-colors",
                        months === m ? "ring-transparent" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300",
                      )}>
                      {m} mo
                    </button>
                  ))}
                </div>
                <p className="text-caption text-slate-400 mt-1.5">Improvement effort spread equally per month.</p>
              </div>
            </div>

            {supportHours === 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-caption text-amber-800">
                  No support hours — consider adding at least 8&nbsp;h/mo for ad-hoc requests.
                </p>
              </div>
            )}
          </Card>

          <Card padding="none">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">Findings in scope</p>
                <p className="text-caption text-slate-500 mt-0.5">
                  {selected.size} of {findings.length} selected
                  {selected.size > 0 && (
                    <span className="ml-1.5 text-violet-600 font-semibold">
                      · {totalRemediationHours}h total effort
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={selectCriticalHigh}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors bg-white text-slate-600 ring-slate-200 hover:bg-slate-50">
                  Critical + High
                </button>
                <button type="button" onClick={allSelected ? clearAll : selectAll}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors bg-white text-slate-600 ring-slate-200 hover:bg-slate-50">
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-caption text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-4 font-medium w-10"><span className="sr-only">Select</span></th>
                  <th className="py-2.5 font-medium">Finding</th>
                  <th className="py-2.5 font-medium w-24">Severity</th>
                  {showPrior && <th className="py-2.5 font-medium w-28">{priorReport?.shortLabel ?? "Last"} outcome</th>}
                  <th className="py-2.5 font-medium w-24 text-right pr-5">Est. hours</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const checked = selected.has(f.rank);
                  return (
                    <tr key={f.rank} onClick={() => toggle(f.rank)}
                      className={cn(
                        "border-b border-slate-50 cursor-pointer transition-colors",
                        checked ? "bg-violet-50/50 hover:bg-violet-50" : "hover:bg-slate-50/60",
                      )}>
                      <td className="py-3 px-4">
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center ring-1 transition-colors shrink-0",
                          checked ? "bg-violet-600 ring-violet-600" : "bg-white ring-slate-300 hover:ring-violet-400",
                        )} aria-checked={checked} role="checkbox" aria-label={`Select "${f.title}"`}>
                          {checked && (
                            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor"
                              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="1 4 3.5 6.5 9 1" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-slate-900 font-medium text-[13px] leading-snug">{f.title}</div>
                        <div className="text-caption text-slate-500 mt-0.5">{f.ownerRole}</div>
                      </td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset uppercase tracking-wider", SEVERITY_CHIP[f.severity])}>
                          {f.severity}
                        </span>
                      </td>
                      {showPrior && (
                        <td className="py-3">
                          {(() => {
                            const b = PRIOR_BADGE[priorOutcomeOf(f.rank)];
                            return (
                              <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset", b.cls)}>
                                {b.label}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td className="py-3 pr-5 text-right">
                        <span className="font-mono text-[12px] tabular-nums text-slate-700">{f.estimatedHours}h</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {/* RIGHT — sticky summary */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
              </div>
              <p className="text-[13px] font-semibold text-slate-900">Engagement totals</p>
            </div>

            <div className="flex flex-col items-center mb-5">
              <DonutChart improvement={improvementPerMonth} support={supportHours} />
              <div className="mt-3 text-center">
                <div className={cn(
                  "font-display text-[36px] leading-none tracking-[-0.04em] font-extrabold tabular-nums",
                  monthlyEngagement > 0 ? "text-slate-900" : "text-slate-400",
                )}>
                  {selected.size > 0 || supportHours > 0 ? `${monthlyEngagement}h` : "—"}
                </div>
                <div className="text-caption text-slate-500 mt-1">per month</div>
              </div>
              <div className="w-full mt-4 space-y-2">
                <LegendDot color="bg-violet-600" label="Improvement / mo" value={selected.size > 0 ? `${improvementPerMonth}h` : "—"} />
                <LegendDot color="bg-slate-400" label="Support / mo" value={`${supportHours}h`} />
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 rounded-lg px-3 py-3 mb-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Findings in scope</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">
                  {selected.size > 0 ? `${selected.size} of ${findings.length}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Total remediation effort</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">
                  {selected.size > 0 ? `${totalRemediationHours}h` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-500">Spread over</span>
                <span className="text-caption font-semibold text-slate-900 tabular-nums">{months} months</span>
              </div>
              {selected.size > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption text-slate-500">Financial impact covered</span>
                  <span className="text-caption font-semibold text-emerald-700 tabular-nums">
                    {formatCurrency(selectedFindings.reduce((s, f) => s + f.financialImpact, 0))}
                  </span>
                </div>
              )}
            </div>

            {selected.size === 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-violet-50 ring-1 ring-violet-100 px-3 py-2.5">
                <Handshake className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-caption text-violet-700 leading-snug">
                  Pick at least one finding from the list to start building your plan.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} className="w-full justify-center">
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit to Jera
              </Button>
              <Button variant={saved ? "ghost" : "secondary"} size="md" onClick={handleSave} disabled={!canSubmit}
                className={cn("w-full justify-center", saved && "bg-emerald-50 text-emerald-700 hover:bg-emerald-50")}>
                {saved ? (
                  <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved</>
                ) : (
                  <><Save className="h-4 w-4" aria-hidden="true" /> Save draft</>
                )}
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2">
              <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-caption text-slate-400 leading-snug">
                Submitting sends a brief to Jera — not a signed contract. Jera will formalise
                the SLA and return it for sign-off.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Read-only fallback — a historical cycle that has no recorded plan. ───────
// (Defensive: prior cycles in the data all carry a completed plan, but the
// builder must NEVER render off the latest cycle, so this is the safe landing.)
function NoEngagementView({ report }: { report: AuditReport }) {
  const navigate = useNavigate();
  const { linkWithReport } = useReport();
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-display text-slate-900">Engagement Plan</h1>
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-none ring-1 ring-inset bg-slate-100 text-slate-500 ring-slate-200">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" /> Closed cycle
              </span>
            </div>
            <p className="text-body text-slate-500">{report.cycleLabel} &middot; no engagement was recorded for this cycle.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(linkWithReport("/findings"))}
            className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded shrink-0"
          >
            ← Back to Findings
          </button>
        </div>
      </PageStickyHeader>
      <Card>
        <div className="flex items-start gap-3">
          <History className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-slate-800">This cycle is closed and read-only</p>
            <p className="text-caption text-slate-500 mt-1 leading-snug max-w-md">
              No remediation plan was captured for {report.cycleLabel}. Closed cycles are frozen —
              switch to the current audit to build or review the live engagement.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Route entry — choose builder vs locked view from the plan state ──────────

export function EngagementRoute() {
  const { selectedReport, engagement, canEditEngagement, isHistorical } = useReport();

  // Track a submit that happened this session so we can flash the banner once.
  const [justSubmittedFor, setJustSubmittedFor] = React.useState<string | null>(null);
  const prevStatus = React.useRef<string | null>(engagement?.status ?? null);

  React.useEffect(() => {
    const status = engagement?.status ?? null;
    if (prevStatus.current !== "submitted" && status === "submitted") {
      setJustSubmittedFor(selectedReport.id);
    }
    prevStatus.current = status;
  }, [engagement, selectedReport.id]);

  // Editable builder ONLY on the live cycle while still none/draft.
  if (canEditEngagement) {
    return <EngagementBuilder report={selectedReport} />;
  }

  // A submitted/active/complete plan (or any historical cycle's plan) → locked.
  if (engagement) {
    return (
      <LockedEngagementView
        report={selectedReport}
        engagement={engagement}
        justSubmitted={justSubmittedFor === selectedReport.id}
        isHistorical={isHistorical}
      />
    );
  }

  // Historical cycle with no recorded plan → read-only fallback.
  return <NoEngagementView report={selectedReport} />;
}
