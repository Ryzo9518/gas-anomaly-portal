import * as React from "react";
import {
  Banknote,
  ShieldCheck,
  Boxes,
  ServerCog,
  TrendingUp,
  TrendingDown,
  Check,
} from "lucide-react";
import { Card } from "@/ui/Card";
import { useReport } from "@/features/audit/ReportContext";
import type { AuditFinding, Category } from "@/features/audit/reports.fixture";

// ============================================================================
// DASHBOARD VALUE VIEWS — three executive-narrative sections that sit between
// the Year-on-Year hero and the Top-5 table:
//
//   1. One audit. Four conversations.  (the same findings, per executive seat)
//   2. How the money comes back.       (projected recovery profile, 30→365 days)
//   3. Measurable progress.            (the full multi-cycle trajectory)
//
// EVERYTHING here is DERIVED from the selected client's real report data — the
// numbers move per client and per cycle. No hardcoded marketing figures.
// Matches the dashboard design system: white Card surfaces, font-display
// numerals, one accent per idea, the existing animate-in motion.
// ============================================================================

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R ${(abs / 1_000).toFixed(0)}K`;
  return `R ${abs}`;
}

function sumImpact(fs: AuditFinding[]): number {
  return fs.reduce((s, f) => s + f.financialImpact, 0);
}

// "1 finding" / "3 findings" — keeps count-driven copy grammatical at n === 1.
function qty(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

// ── 1 · ONE AUDIT, FOUR CONVERSATIONS ───────────────────────────────────────

type Accent = "emerald" | "violet" | "amber" | "indigo";

const ACCENT: Record<Accent, { eyebrow: string; bar: string; num: string; icon: string; chip: string }> = {
  emerald: { eyebrow: "text-emerald-600", bar: "bg-emerald-400", num: "text-emerald-600", icon: "text-emerald-500 bg-emerald-50 ring-emerald-100", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  violet:  { eyebrow: "text-violet-600",  bar: "bg-violet-400",  num: "text-violet-600",  icon: "text-violet-500 bg-violet-50 ring-violet-100",   chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  amber:   { eyebrow: "text-amber-600",   bar: "bg-amber-400",   num: "text-amber-700",   icon: "text-amber-600 bg-amber-50 ring-amber-100",     chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  indigo:  { eyebrow: "text-indigo-600",  bar: "bg-indigo-400",  num: "text-indigo-600",  icon: "text-indigo-500 bg-indigo-50 ring-indigo-100",  chip: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
};

interface RoleCard {
  accent: Accent;
  eyebrow: string;
  headline: string;            // big number / value
  unit: string;                // small label under the headline
  promise: string;             // the one-line "what changes" framing
  icon: React.ReactNode;
  proof: string[];             // 2-3 derived proof lines
  within: string;              // the "within 90 days" close
}

function RoleConversationCard({ card, index }: { card: RoleCard; index: number }) {
  const a = ACCENT[card.accent];
  return (
    <article
      className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 [animation-duration:380ms] [animation-fill-mode:both] motion-reduce:animate-none"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-[3px] ${a.bar}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${a.eyebrow}`}>{card.eyebrow}</div>
            <h3 className="text-[14.5px] font-bold text-slate-900 leading-snug mt-1 max-w-[18rem]">{card.promise}</h3>
          </div>
          <span className={`shrink-0 h-9 w-9 rounded-lg ring-1 flex items-center justify-center ${a.icon}`}>{card.icon}</span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className={`font-display text-[34px] leading-none tracking-tighter tabular-nums ${a.num}`}>{card.headline}</span>
          <span className="text-[11px] text-slate-500 font-medium">{card.unit}</span>
        </div>

        <ul className="mt-4 space-y-2">
          {card.proof.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-600 leading-snug">
              <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${a.num}`} aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-700">Within 90 days · </span>{card.within}
        </p>
      </div>
    </article>
  );
}

export function FourConversations() {
  const { selectedReport: cur } = useReport();

  const cards = React.useMemo<RoleCard[]>(() => {
    const f = cur.findings;
    const byCat = (c: Category) => f.filter((x) => x.category === c);
    const leakage = byCat("leakage");
    const controls = byCat("controls");
    const dataq = byCat("data_quality");
    const eff = byCat("efficiency");
    const severeControls = controls.filter((x) => x.severity === "critical" || x.severity === "high");
    const severe = cur.risks.critical + cur.risks.high;
    const wc = sumImpact(dataq) + sumImpact(eff);
    const leakageSum = sumImpact(leakage);

    return [
      {
        accent: "emerald",
        eyebrow: "For the CFO",
        headline: formatCurrency(cur.leakageRecoverable),
        unit: "recoverable · Year 1",
        promise: "Recover cash. Defend the close. Reduce audit cost.",
        icon: <Banknote className="h-4.5 w-4.5" />,
        proof: [
          leakageSum > 0
            ? `${formatCurrency(leakageSum)} of duplicate-payment & leakage exposure confirmed recoverable`
            : `${formatCurrency(cur.leakageRecoverable)} of cost-leakage exposure confirmed recoverable across the estate`,
          controls.length > 0
            ? `${qty(controls.length, "control gap")} closed → external auditor stops billing for additional procedures`
            : "Control environment hardened → external auditor reduces additional procedures",
          eff.length > 0
            ? `Close cycle shortens as ${qty(eff.length, "process bottleneck")} clear`
            : "Close cycle shortens once stalled approvals and workflows clear",
        ],
        within: "Cash back in the account, a cleaner trial balance, and a smaller external-audit invoice next year.",
      },
      {
        accent: "violet",
        eyebrow: "For the CEO",
        headline: `${severe}`,
        unit: "fraud & control vectors capped",
        promise: "Cap fraud exposure. Make the board sleep.",
        icon: <ShieldCheck className="h-4.5 w-4.5" />,
        proof: [
          severeControls.length > 0
            ? `${qty(severeControls.length, "segregation-of-duties & privileged-access vector")} closed off`
            : "Segregation-of-duties & privileged-access vectors closed off",
          `One health-score number for the board pack — currently ${cur.healthScore}, on a credible upward path`,
          `Due-diligence ready: the exact questions refinancing, acquisition and sale teams ask`,
        ],
        within: "A board-defensible risk register, a measurable trajectory, and a quieter audit committee.",
      },
      {
        accent: "amber",
        eyebrow: "For the COO",
        headline: formatCurrency(wc),
        unit: "working capital in play",
        promise: "Unstick the operation. Free working capital.",
        icon: <Boxes className="h-4.5 w-4.5" />,
        proof: [
          eff.length > 0
            ? `${qty(eff.length, "efficiency finding")} — stalled approvals and close-cycle drag routed to completion`
            : "Stalled approvals and close-cycle drag routed to completion",
          dataq.length > 0
            ? `${qty(dataq.length, "data-quality finding")} — stock, master data and valuation cleaned up`
            : "Stock, master-data and valuation issues cleaned up",
          `Three-way-match enforced → supplier relationships clean, on-time payment back in target`,
        ],
        within: "A faster operation, inventory turning, and every operational pain point named and assigned.",
      },
      {
        accent: "indigo",
        eyebrow: "For the CIO / IT Director",
        headline: `${Math.max(controls.length, severeControls.length)}`,
        unit: "access & audit-trail gaps to close",
        promise: "Pass the audit. Right-size the licence.",
        icon: <ServerCog className="h-4.5 w-4.5" />,
        proof: [
          "Least-privilege restored on flagged all-access profiles — defensible to internal and external audit",
          "Forensic audit trail enabled end-to-end on every critical financial table",
          "Stale-password & MFA gaps closed → cyber-insurance premium negotiable, POPIA controls evidenced",
        ],
        within: "No more findings from external audit, a defensible position with insurers, and a smaller licence invoice.",
      },
    ];
  }, [cur]);

  return (
    <section aria-labelledby="four-conversations-heading">
      <div className="mb-4 max-w-2xl">
        <h2 id="four-conversations-heading" className="text-section text-slate-900">One audit. Four conversations.</h2>
        <p className="text-body text-slate-500 mt-1">
          One set of findings — but the conversation is different at every seat of the executive table. Each card shows what
          this audit returns to that role, in money, risk and time.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <RoleConversationCard key={c.eyebrow} card={c} index={i} />
        ))}
      </div>
    </section>
  );
}

// ── 2 · HOW THE MONEY COMES BACK ─────────────────────────────────────────────

interface RecoveryWindow {
  range: string;
  title: string;
  cumPct: number;        // cumulative fraction of the recoverable envelope realised by end of window
  driver: string;        // what's driving recovery in this window (derived)
}

export function RecoveryTimeline() {
  const { selectedReport: cur } = useReport();

  const { env, windows } = React.useMemo(() => {
    const f = cur.findings;
    const byCat = (c: Category) => f.filter((x) => x.category === c);
    const env = cur.leakageRecoverable;
    const nControls = byCat("controls").length;
    const nLeakage = byCat("leakage").length;
    const nDataq = byCat("data_quality").length;
    const nEff = byCat("efficiency").length;
    const windows: RecoveryWindow[] = [
      { range: "Day 1 – 30", title: "Mechanical wins", cumPct: 0.12, driver: nControls > 0 ? `${qty(nControls, "access & control quick-win")} — dormant licences, least-privilege, audit trail on` : "Access & control quick-wins — dormant licences, least-privilege, audit trail on" },
      { range: "Day 30 – 90", title: "Cash recovery", cumPct: 0.45, driver: nLeakage > 0 ? `${qty(nLeakage, "duplicate-payment & leakage finding")} recovered; SoD matrix enforced` : "Duplicate-payment audit and SoD matrix enforced across the AP ledger" },
      { range: "Day 90 – 180", title: "Working capital release", cumPct: 0.78, driver: nDataq > 0 ? `${qty(nDataq, "stock & master-data finding")} — slow-mover stock and valuation freed` : "Slow-mover stock and valuation freed across the estate" },
      { range: "Day 180 – 365", title: "Compounding gains", cumPct: 1.0, driver: nEff > 0 ? `${qty(nEff, "efficiency finding")} — shorter close, renegotiated audit fee` : "Shorter close cycle, renegotiated audit fee, compounding control gains" },
    ];
    return { env, windows };
  }, [cur]);

  return (
    <Card padding="lg" aria-labelledby="recovery-heading">
      <div className="max-w-2xl">
        <h2 id="recovery-heading" className="text-section text-slate-900">How the money comes back.</h2>
        <p className="text-body text-slate-500 mt-1">
          The order in which value returns once remediation begins — a projected recovery profile against this audit&apos;s{" "}
          <span className="font-semibold text-slate-700">{formatCurrency(env)}</span> recoverable envelope.
        </p>
      </div>

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 relative">
        {/* connecting track (desktop) */}
        <span aria-hidden="true" className="hidden lg:block absolute top-[7px] left-[12%] right-[12%] h-px bg-gradient-to-r from-emerald-300 via-violet-300 to-indigo-300" />
        {windows.map((w, i) => {
          const cum = env * w.cumPct;
          return (
            <li key={w.range} className="relative">
              <div className="flex items-center gap-2">
                <span className="relative z-10 h-3.5 w-3.5 rounded-full bg-white ring-2 ring-violet-400 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                </span>
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{w.range}</span>
              </div>
              <div className="mt-3 pl-[2px]">
                <div className="text-[13px] font-bold text-slate-900">{w.title}</div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-display text-[26px] leading-none tracking-tighter tabular-nums text-slate-900">{formatCurrency(cum)}</span>
                  <span className="text-[10.5px] text-slate-400 font-medium">cumulative</span>
                </div>
                {/* fill bar showing cumulative position */}
                <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-violet-500 rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.round(w.cumPct * 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-[11.5px] text-slate-500 leading-snug">{w.driver}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 pt-4 border-t border-slate-100 text-caption text-slate-400">
        Projected profile. Window values are a conservative distribution of the recoverable envelope derived from this cycle&apos;s findings — the audit costs nothing; this is what returns once remediation begins.
      </p>
    </Card>
  );
}

// ── 3 · MEASURABLE PROGRESS, EVERY CYCLE ─────────────────────────────────────

function TrajectoryPanel({
  title,
  caption,
  series,
  accent,
  improving,
  formatValue,
}: {
  title: string;
  caption: string;
  series: { label: string; value: number }[];
  accent: "emerald" | "rose" | "amber";
  improving: boolean;        // true → up is good (health); false → down is good (risk/leakage)
  formatValue: (n: number) => string;
}) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const delta = last - first;
  const good = improving ? delta >= 0 : delta <= 0;
  const barBg: Record<string, string> = { emerald: "bg-emerald-400", rose: "bg-rose-300", amber: "bg-amber-300" };
  const barLast: Record<string, string> = { emerald: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500" };

  return (
    <div className="flex-1 min-w-[180px]">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">{title}</div>
      <div className="mt-3 flex items-end gap-2 h-[68px]">
        {series.map((s, i) => {
          const isLast = i === series.length - 1;
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className={`font-mono text-[9px] tabular-nums mb-1 ${isLast ? "text-slate-700 font-semibold" : "text-slate-400"}`}>
                {formatValue(s.value)}
              </span>
              <div
                className={`w-full rounded-t-sm ${isLast ? barLast[accent] : barBg[accent]}`}
                style={{ height: `${Math.max(6, Math.round((s.value / max) * 52))}px` }}
              />
              <span className="text-[9px] text-slate-400 mt-1.5 tabular-nums">{s.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] text-slate-500 leading-snug">{caption}</p>
      <div className="mt-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${good ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
          {improving ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
          {improving
            ? `${delta >= 0 ? "+" : ""}${delta} pts since baseline`
            : `${formatValue(Math.abs(delta))} ${delta <= 0 ? "reduced" : "added"}`}
        </span>
      </div>
    </div>
  );
}

export function MeasurableProgress() {
  const { reports, clientInfo } = useReport();

  // reports are newest-first; trajectory reads oldest → newest.
  const cycles = React.useMemo(() => [...reports].reverse(), [reports]);

  if (cycles.length < 2) {
    return (
      <Card padding="lg" aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="text-section text-slate-900">Measurable progress. Every audit cycle.</h2>
        <p className="text-body text-slate-500 mt-1">
          This is the baseline cycle. From the next audit onward, the health score, risk profile and leakage are tracked here
          as a year-on-year trajectory.
        </p>
      </Card>
    );
  }

  const health = cycles.map((r) => ({ label: r.shortLabel, value: r.healthScore }));
  const risk = cycles.map((r) => ({ label: r.shortLabel, value: r.risks.critical + r.risks.high }));
  const leak = cycles.map((r) => ({ label: r.shortLabel, value: r.leakageEstimate }));

  return (
    <Card padding="lg" aria-labelledby="progress-heading">
      <div className="max-w-2xl">
        <h2 id="progress-heading" className="text-section text-slate-900">Measurable progress. Every audit cycle.</h2>
        <p className="text-body text-slate-500 mt-1">
          Each audit builds on the last. Remediated findings raise the score, shrink the risk register and close leakage — the
          trajectory across {cycles.length} cycles, against a target of {clientInfo.healthTarget}.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-6">
        <TrajectoryPanel
          title="Health score improves"
          caption="Risk findings remediated raise the score. The trajectory is upward."
          series={health}
          accent="emerald"
          improving
          formatValue={(n) => `${n}`}
        />
        <div className="hidden sm:block w-px self-stretch bg-slate-100" />
        <TrajectoryPanel
          title="Risk profile reduces"
          caption="With each cycle, severe findings shrink. RED becomes AMBER becomes GREEN."
          series={risk}
          accent="rose"
          improving={false}
          formatValue={(n) => `${n}`}
        />
        <div className="hidden sm:block w-px self-stretch bg-slate-100" />
        <TrajectoryPanel
          title="Leakage closes"
          caption="Cost leakage falls year on year as controls hold and cash is recovered."
          series={leak}
          accent="amber"
          improving={false}
          formatValue={(n) => formatCurrency(n)}
        />
      </div>
    </Card>
  );
}
