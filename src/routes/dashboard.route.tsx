import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Banknote,
  Clock,
  PiggyBank,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { StatTile } from "@/ui/StatTile";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useScrollCompact } from "@/lib/useScrollCompact";
import { useReport } from "@/features/audit/ReportContext";
import { totalRisks, severeRisks } from "@/features/audit/report-helpers";

// ── Formatting helpers ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R ${(abs / 1_000).toFixed(0)}K`;
  return `R ${abs}`;
}

function formatCurrencyDelta(value: number): string {
  if (value === 0) return `R 0`;
  return value < 0
    ? `−${formatCurrency(value)}` // minus sign U+2212
    : `+${formatCurrency(value)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SEVERITY_CHIP: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  high: "bg-amber-50 text-amber-800 ring-amber-200",
  medium: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

// S-2: Left border accent per severity — 3px solid stripe on the rank cell.
const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-[3px] border-l-rose-400",
  high:     "border-l-[3px] border-l-amber-400",
  medium:   "border-l-[3px] border-l-indigo-400",
  low:      "border-l-[3px] border-l-slate-300",
};

// Engagement-status pill shown in the YoY card header.
const ENG_PILL: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Engagement submitted", cls: "bg-violet-50 text-violet-700 ring-violet-100" },
  active:    { label: "Engagement active",     cls: "bg-amber-50 text-amber-700 ring-amber-100" },
  complete:  { label: "Engagement complete",   cls: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
};

// ────────────────────────────────────────────────────────────────────────

export function DashboardRoute() {
  const navigate = useNavigate();
  const { clientInfo, selectedReport: cur, priorReport: prior, isBaseline, isHistorical, engagement, cumulative, linkWithReport } =
    useReport();

  const compact = useScrollCompact();
  const findings = cur.findings;

  const scoreDelta = prior ? cur.healthScore - prior.healthScore : 0;
  const leakageDelta = prior ? cur.leakageEstimate - prior.leakageEstimate : 0;
  const severeNow = severeRisks(cur.risks);
  const severePrior = prior ? severeRisks(prior.risks) : severeNow;
  const severeResolved = severePrior - severeNow;

  const top5 = findings.slice(0, 5);
  const inProgress = findings.filter((f) => f.status === "in_progress").length;
  const done = findings.filter((f) => f.status === "resolved").length;
  const totalActions = findings.length;
  const notStarted = totalActions - done - inProgress;

  // Engagement-outcome (actual vs estimated) — only for completed cycles.
  const outcome = React.useMemo(() => {
    if (!engagement || engagement.status !== "complete" || engagement.actualSavings == null) {
      return null;
    }
    const recovered = engagement.actualSavings;
    const planned = engagement.estimatedSavings;
    const realisedPct = planned > 0 ? Math.round((recovered / planned) * 100) : 0;
    const regressed = engagement.findings.filter((f) => f.status === "regressed");
    const regressedAmount = regressed.reduce((s, f) => s + f.estimatedImpact, 0);
    return { recovered, planned, realisedPct, regressedCount: regressed.length, regressedAmount };
  }, [engagement]);

  const engPill =
    engagement && engagement.status in ENG_PILL ? ENG_PILL[engagement.status] : null;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      {/* ── Sticky header band: title + KPI strip ──────────────────────── */}
      <PageStickyHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <h1 className="text-display text-slate-900">Audit Dashboard</h1>
              <p className="text-body text-slate-500 mt-0.5">
                {cur.cycleLabel} &middot; Completed {formatDate(cur.completedAt)} &middot; {clientInfo.name}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => navigate(linkWithReport("/report"))}>
                View report
              </Button>
              {!isHistorical && (
                <Button variant="primary" size="sm" onClick={() => navigate(linkWithReport("/upload") + "&mode=new")}>
                  Run new audit <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* KPI strip — 3 per-report cards + 1 always-live cumulative card. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              compact={compact}
              label="Health Score"
              value={cur.healthScore}
              delta={prior ? (scoreDelta >= 0 ? `+${scoreDelta} vs ${prior.shortLabel}` : `${scoreDelta} vs ${prior.shortLabel}`) : "Baseline"}
              trend={prior ? (scoreDelta > 0 ? "up" : scoreDelta < 0 ? "down" : "flat") : "flat"}
              sublabel={`Target ${clientInfo.healthTarget}`}
              icon={<TrendingUp className="h-4 w-4" />}
              status="healthy"
            />
            <StatTile
              compact={compact}
              label="Cost Leakage"
              value={formatCurrency(cur.leakageEstimate)}
              delta={prior ? `${formatCurrencyDelta(leakageDelta)} vs ${prior.shortLabel}` : "Baseline"}
              trend={prior ? (leakageDelta < 0 ? "up" : leakageDelta > 0 ? "down" : "flat") : "flat"}
              sublabel={`${formatCurrency(cur.leakageRecoverable)} recoverable`}
              icon={<Banknote className="h-4 w-4" />}
            />
            <StatTile
              compact={compact}
              label="Open Risks"
              value={totalRisks(cur.risks)}
              delta={prior ? `${severeResolved} severe resolved` : `${severeNow} severe`}
              trend="up"
              sublabel={`${cur.risks.critical} critical · ${cur.risks.high} high`}
              icon={<AlertTriangle className="h-4 w-4" />}
              status={cur.risks.critical > 0 ? "attention" : "healthy"}
            />
            {/* 4th card — CUMULATIVE, never freezes on historical view. */}
            <StatTile
              compact={compact}
              label="Recovered to date"
              value={formatCurrency(cumulative.totalRecovered)}
              delta={`${cumulative.cyclesCompleted} cycles`}
              trend="up"
              sublabel="all audits · actual"
              icon={<PiggyBank className="h-4 w-4" />}
              status="healthy"
            />
          </div>
        </div>
      </PageStickyHeader>

      {/* ── YEAR-ON-YEAR CARD — dark editorial hero ───────────────────── */}
      <div
        className={[
          "relative overflow-hidden rounded-xl",
          "[background:linear-gradient(135deg,#1e1b4b_0%,#2d2360_45%,#1a1744_100%)]",
          "shadow-[0_4px_8px_-2px_rgba(0,0,0,.35),0_24px_64px_-12px_rgba(109,40,217,.45),0_0_0_1px_rgba(139,92,246,.14)]",
        ].join(" ")}
      >
        {/* Ambient glow blobs */}
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl bg-violet-500/20" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-52 w-52 rounded-full blur-3xl bg-indigo-600/20" />
        {/* Dot-grid texture */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative p-7">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[8.5px] font-semibold text-violet-400 uppercase tracking-[0.18em] mb-2">
                {isBaseline ? "Baseline cycle" : "Performance delta"}
              </div>
              <h2 className="text-[21px] font-bold text-white leading-tight tracking-tight">
                {isBaseline ? "First audit cycle" : "Year-on-Year improvement"}
              </h2>
              <p className="text-[12px] text-violet-300/70 mt-1 leading-relaxed">
                {isBaseline
                  ? "This is the baseline. Future audits are measured against these numbers."
                  : <>{prior!.cycleLabel} &rarr; {cur.cycleLabel}</>}
              </p>
              {engPill && (
                <span className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-white/10 text-white/90 ring-1 ring-white/20">
                  {engPill.label}
                </span>
              )}
            </div>

            {/* Hero editorial % */}
            {!isBaseline && (
              <div className="text-right shrink-0">
                <div
                  className="font-display text-[72px] leading-none tracking-[-0.05em] font-extrabold tabular-nums text-white"
                  style={{ textShadow: "0 0 80px rgba(167,139,250,0.65), 0 0 28px rgba(167,139,250,0.35)" }}
                >
                  {scoreDelta >= 0 ? "+" : ""}{Math.round((scoreDelta / prior!.healthScore) * 100)}%
                </div>
                <div className="text-[11px] text-violet-400/80 mt-1.5 font-medium tracking-wide">
                  health gain &middot; vs {prior!.shortLabel}
                </div>
              </div>
            )}
          </div>

          {/* Gradient divider */}
          {!isBaseline && (
            <div className="mt-6 h-px bg-gradient-to-r from-violet-500/50 via-violet-600/25 to-transparent" />
          )}

          {/* Stat row */}
          {!isBaseline ? (
            <div className="mt-5 grid grid-cols-4 divide-x divide-violet-700/40">

              {/* COL 1 — HEALTH SCORE */}
              <div className="pr-6">
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Health score</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[18px] text-violet-400/60 tracking-tighter tabular-nums leading-none">
                    {prior!.healthScore}
                  </span>
                  <span className="text-violet-400/40 text-[14px]" aria-hidden="true">&rarr;</span>
                  <span className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">
                    {cur.healthScore}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-violet-400/60">+{scoreDelta} pts &middot; Target {clientInfo.healthTarget}</div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/30">
                    <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> +{scoreDelta} pts
                  </span>
                </div>
              </div>

              {/* COL 2 — SEVERE RISKS RESOLVED */}
              <div className="px-6">
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Severe risks resolved</div>
                <div className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">
                  {severeResolved}
                </div>
                <div className="mt-2 text-[11px] text-violet-400/60">{severePrior} &rarr; {severeNow} remaining</div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/30">
                    <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> {severePrior > 0 ? Math.round((severeResolved / severePrior) * 100) : 0}% cleared
                  </span>
                </div>
              </div>

              {/* COL 3 — LEAKAGE CLOSED */}
              <div className="px-6">
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Leakage closed</div>
                <div className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">
                  {formatCurrency(Math.abs(leakageDelta))}
                </div>
                <div className="mt-2 text-[11px] text-violet-400/60">{formatCurrency(cur.leakageRecoverable)} still recoverable</div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/30">
                    <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> Recovered
                  </span>
                </div>
              </div>

              {/* COL 4 — ACTIONS IN FLIGHT */}
              <div className="pl-6 text-right">
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Actions in flight</div>
                <div className="flex items-baseline gap-1 leading-none justify-end">
                  <span className="font-display text-[32px] text-white tracking-tighter tabular-nums">{inProgress}</span>
                  <span className="font-display text-[18px] text-violet-400/60 tracking-tighter tabular-nums">/{totalActions}</span>
                </div>
                <div className="mt-2 text-[11px] text-violet-400/60">{done} done &middot; {notStarted} not started</div>
                <div className="mt-2.5 flex justify-end">
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-amber-900/60 text-amber-300 ring-1 ring-amber-500/30">
                    <Clock className="h-2.5 w-2.5" aria-hidden="true" /> Ongoing
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* Baseline — current-state snapshot only. */
            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Health score</div>
                <div className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">{cur.healthScore}</div>
                <div className="mt-2 text-[11px] text-violet-400/60">Target {clientInfo.healthTarget}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Severe risks</div>
                <div className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">{severeNow}</div>
                <div className="mt-2 text-[11px] text-violet-400/60">{cur.risks.critical} critical &middot; {cur.risks.high} high</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-[0.1em] mb-2.5">Cost leakage</div>
                <div className="font-display text-[32px] text-white tracking-tighter tabular-nums leading-none">{formatCurrency(cur.leakageEstimate)}</div>
                <div className="mt-2 text-[11px] text-violet-400/60">{formatCurrency(cur.leakageRecoverable)} recoverable</div>
              </div>
            </div>
          )}

          {/* ── ENGAGEMENT OUTCOME BAND ─────────────────────────────────── */}
          {outcome && (
            <div className="mt-6 pt-5 border-t border-violet-700/40">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-mono text-[8.5px] font-semibold text-emerald-400 uppercase tracking-[0.16em] mb-1.5">
                    Engagement outcome
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-[28px] text-emerald-300 tracking-tighter tabular-nums leading-none">
                      {formatCurrency(outcome.recovered)}
                    </span>
                    <span className="text-[11px] text-violet-400/70">
                      recovered &middot; of {formatCurrency(outcome.planned)} planned
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/30">
                    {outcome.realisedPct}% realised
                  </span>
                  {outcome.regressedCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold bg-rose-900/60 text-rose-300 ring-1 ring-rose-500/30">
                      <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
                      {outcome.regressedCount} regressed &middot; {formatCurrency(outcome.regressedAmount)}
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar on dark */}
              <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, outcome.realisedPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOP 5 RISKS CARD ───────────────────────────────────────────── */}
      <Card padding="none">
        <div className="py-4 px-[18px] flex items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h2 className="text-section text-slate-900">Top 5 risks needing action</h2>
            <p className="text-body text-slate-500 mt-1">
              Ranked by financial impact. View the full {findings.length} in Findings.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(linkWithReport("/findings"))}>
            View all
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-caption text-slate-500 border-b border-slate-100">
              <th className="py-3 px-[18px] font-medium w-12">#</th>
              <th className="py-3 font-medium">Title</th>
              <th className="py-3 font-medium w-28">Severity</th>
              <th className="py-3 font-medium w-40">Owner</th>
              <th className="py-3 px-[18px] font-medium text-right w-28">Impact</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((f) => (
              <tr
                key={f.rank}
                className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors"
                onClick={() => navigate(linkWithReport("/findings"))}
              >
                <td className={`py-3 px-[18px] font-mono text-xs text-slate-500 tabular-nums ${SEVERITY_BORDER[f.severity]}`}>
                  {f.rank.toString().padStart(2, "0")}
                </td>
                <td className="py-3 text-slate-900 font-medium max-w-md pr-4">{f.title}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset uppercase tracking-wider ${SEVERITY_CHIP[f.severity]}`}
                  >
                    {f.severity}
                  </span>
                </td>
                <td className="py-3 text-slate-600">{f.ownerRole}</td>
                <td className="py-3 px-[18px] text-right font-display text-base font-bold tabular-nums text-slate-900 tracking-tight">
                  {f.financialImpact > 0 ? formatCurrency(f.financialImpact) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── IMPROVEMENT PROGRESS CARD ──────────────────────────────────── */}
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <h2 className="text-section text-slate-900">Improvement progress</h2>
            <p className="text-body text-slate-500 mt-1">
              {done} of {totalActions} actions completed this cycle &middot; {inProgress} in progress &middot; {notStarted} not started.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(linkWithReport("/findings"))}>
            View roadmap
          </Button>
        </div>
        <div className="mt-5">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {done > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(done / totalActions) * 100}%` }}
              />
            )}
            {inProgress > 0 && (
              <div
                className="bg-amber-400"
                style={{ width: `${(inProgress / totalActions) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-3 flex items-center gap-5 text-caption text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Done {done}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> In progress {inProgress}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" /> Not started {notStarted}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
